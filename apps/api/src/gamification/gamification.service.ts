import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { CreateSkillDto, UpdateSkillDto, CourseSkillDto, XpQueryDto, LeaderboardQueryDto, CreateAchievementDto, UpdateAchievementDto } from "./dto/gamification.dto";

@Injectable()
export class GamificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  private paginationMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

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
    return this.prisma.skill.findMany({ where: where as any, orderBy: { name: "asc" }, include: { _count: { select: { courseSkills: true } } } });
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.xpTransaction.findMany({
        where: { organizationId: org.id, userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.xpTransaction.count({ where: { organizationId: org.id, userId } }),
    ]);
    const totalXp = await this.prisma.xpTransaction.aggregate({ where: { organizationId: org.id, userId }, _sum: { amount: true } });
    return { data, meta: this.paginationMeta(page, limit, total), totalXp: totalXp._sum.amount ?? 0 };
  }

  // ── Leaderboard ──────────────────────────────────────

  async getLeaderboard(org: OrganizationContext, query: LeaderboardQueryDto) {
    const period = query.period ?? "ALL_TIME";
    const limit = query.limit ?? 20;

    if (period === "ALL_TIME") {
      const rankings = await this.prisma.xpTransaction.groupBy({
        by: ["userId"],
        where: { organizationId: org.id, ...(query.courseId ? { sourceType: "course", sourceId: query.courseId } : {}) },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: limit,
      });
      const userIds = rankings.map((r) => r.userId);
      const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
      const userMap = new Map(users.map((u) => [u.id, u]));
      return rankings.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: userMap.get(r.userId)?.name ?? userMap.get(r.userId)?.email ?? "Unknown",
        totalXp: r._sum.amount ?? 0,
      }));
    }

    // For daily/weekly/monthly, compute from recent snapshots
    const snapshot = await this.prisma.leaderboardSnapshot.findFirst({
      where: { organizationId: org.id, courseId: query.courseId ?? null, period: period as any },
      orderBy: { snapshotDate: "desc" },
    });
    return (snapshot?.rankings as Array<{ rank: number; userId: string; name: string; totalXp: number }>) ?? [];
  }

  async takeSnapshot(org: OrganizationContext, period: string, courseId?: string) {
    const where: Record<string, unknown> = { organizationId: org.id };
    if (courseId) where.courseId = courseId;
    const rankings = await this.prisma.xpTransaction.groupBy({
      by: ["userId"],
      where: where as any,
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 100,
    });
    const userIds = rankings.map((r) => r.userId);
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const data = rankings.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: userMap.get(r.userId)?.name ?? userMap.get(r.userId)?.email ?? "Unknown",
      totalXp: r._sum.amount ?? 0,
    }));
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
