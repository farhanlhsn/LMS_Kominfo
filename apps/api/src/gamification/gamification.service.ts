import { normalizePageLimit,pageMeta } from "@lms/shared";
import { Inject,Injectable,NotFoundException } from "@nestjs/common";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import type { CourseSkillDto,CreateAchievementDto,CreateSkillDto,LeaderboardQueryDto,UpdateSkillDto,XpQueryDto } from "./dto/gamification.dto";

@Injectable()
export class GamificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  private slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ── Skills ────────────────────────────────────────────

  async createSkill(org: OrganizationContext, dto: CreateSkillDto) {
    const slug = this.slugify(dto.name);
    return this.prisma.skill.create({
      data: { organizationId: org.id, name: dto.name, slug, description: dto.description, category: dto.category },
    });
  }

  async listSkills(org: OrganizationContext, category?: string) {
    const where: Record<string, unknown> = { organizationId: org.id };
    if (category) where.category = category;
    return this.prisma.skill.findMany({
      where: where as any,
      orderBy: { name: "asc" },
      include: { _count: { select: { courseSkills: true } } },
      take: 200,
    });
  }

  async updateSkill(org: OrganizationContext, id: string, dto: UpdateSkillDto) {
    const skill = await this.prisma.skill.findFirst({ where: { id, organizationId: org.id } });
    if (!skill) throw new NotFoundException("Skill not found");
    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name, slug: this.slugify(dto.name) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
      },
    });
  }

  async deleteSkill(org: OrganizationContext, id: string) {
    const skill = await this.prisma.skill.findFirst({ where: { id, organizationId: org.id } });
    if (!skill) throw new NotFoundException("Skill not found");
    await this.prisma.skill.delete({ where: { id } });
    return { deleted: true };
  }

  async setCourseSkills(org: OrganizationContext, courseId: string, skills: CourseSkillDto[]) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new NotFoundException("Course not found");
    await this.prisma.courseSkill.deleteMany({ where: { courseId } });
    if (skills.length) {
      return this.prisma.courseSkill.createManyAndReturn({
        data: skills.map((s) => ({ courseId, skillId: s.skillId, weight: s.weight ?? 10 })),
      });
    }
    return [];
  }

  async getCourseSkills(courseId: string) {
    return this.prisma.courseSkill.findMany({
      where: { courseId },
      include: { skill: true },
    });
  }

  async getUserSkills(org: OrganizationContext, userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { proficiency: "desc" },
      take: 200,
    });
  }

  // ── XP Transactions ──────────────────────────────────

  async awardXp(org: OrganizationContext, userId: string, amount: number, reason: string, sourceType?: string, sourceId?: string) {
    const xp = await this.prisma.xpTransaction.create({
      data: { organizationId: org.id, userId, amount, reason, sourceType, sourceId },
    });
    // Check achievements
    await this.checkAchievements(org, userId);
    return xp;
  }

  async getXpHistory(org: OrganizationContext, userId: string, query: XpQueryDto) {
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const [data, total] = await Promise.all([
      this.prisma.xpTransaction.findMany({
        where: { organizationId: org.id, userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.xpTransaction.count({ where: { organizationId: org.id, userId } }),
    ]);
    const totalXp = await this.prisma.xpTransaction.aggregate({ where: { organizationId: org.id, userId }, _sum: { amount: true } });
    return { data, meta: pageMeta(page, limit, total), totalXp: totalXp._sum.amount ?? 0 };
  }

  // ── Leaderboard ──────────────────────────────────────

  async getLeaderboard(org: OrganizationContext, query: LeaderboardQueryDto) {
    const period = query.period ?? "ALL_TIME";
    const limit = query.limit ?? 20;
    const createdAt =
      period === "ALL_TIME" ? undefined : { gte: this.periodStart(period) };
    return this.buildLeaderboard(org.id, query.courseId, limit, createdAt);
  }

  async takeSnapshot(org: OrganizationContext, period: string, courseId?: string) {
    const data = await this.buildLeaderboard(
      org.id,
      courseId,
      100,
      period === "ALL_TIME" ? undefined : { gte: this.periodStart(period) },
    );
    return this.prisma.leaderboardSnapshot.create({
      data: {
        organizationId: org.id,
        courseId: courseId ?? null,
        period: period as any,
        snapshotDate: new Date(),
        rankings: data,
      },
    });
  }

  private async buildLeaderboard(
    organizationId: string,
    courseId: string | undefined,
    limit: number,
    createdAt?: { gte: Date },
  ) {
    const rankings = await this.prisma.xpTransaction.groupBy({
      by: ["userId"],
      where: {
        organizationId,
        createdAt,
        ...(courseId ? { sourceType: "course", sourceId: courseId } : {}),
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });
    const userIds = rankings.map((ranking) => ranking.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));
    return rankings.map((ranking, index) => ({
      rank: index + 1,
      userId: ranking.userId,
      name:
        userMap.get(ranking.userId)?.name ??
        userMap.get(ranking.userId)?.email ??
        "Unknown",
      totalXp: ranking._sum.amount ?? 0,
    }));
  }

  private periodStart(period: string) {
    const now = new Date();
    if (period === "DAILY") {
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
    }
    if (period === "WEEKLY") {
      const daysSinceMonday = (now.getUTCDay() + 6) % 7;
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysSinceMonday,
        ),
      );
    }
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  // ── Achievements ─────────────────────────────────────

  async createAchievement(org: OrganizationContext, dto: CreateAchievementDto) {
    return this.prisma.achievement.create({
      data: {
        organizationId: org.id,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        iconUrl: dto.iconUrl,
        xpReward: dto.xpReward ?? 0,
        criteria: {},
      },
    });
  }

  async listAchievements(org: OrganizationContext) {
    return this.prisma.achievement.findMany({
      where: { organizationId: org.id },
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    });
  }

  async checkAchievements(org: OrganizationContext, userId: string) {
    const totalXp = await this.prisma.xpTransaction.aggregate({ where: { organizationId: org.id, userId }, _sum: { amount: true } });
    const xp = totalXp._sum.amount ?? 0;
    const achievements = await this.prisma.achievement.findMany({ where: { organizationId: org.id } });
    const earned = await this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } });
    const earnedIds = new Set(earned.map((e) => e.achievementId));

    const newAchievements = [];
    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;
      const criteria = achievement.criteria as Record<string, unknown> | null;
      if (!criteria) continue;
      if (criteria.minXp && typeof criteria.minXp === "number" && xp >= criteria.minXp) {
        const ua = await this.prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
        if (achievement.xpReward > 0) {
          await this.prisma.xpTransaction.create({
            data: { organizationId: org.id, userId, amount: achievement.xpReward, reason: `Achievement: ${achievement.name}`, sourceType: "achievement", sourceId: achievement.id },
          });
        }
        newAchievements.push(ua);
      }
    }
    return newAchievements;
  }
}
