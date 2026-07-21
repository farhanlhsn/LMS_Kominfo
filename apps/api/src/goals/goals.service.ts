import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import { ensureEnrollment } from "../common/enrollment/ensure-enrollment";
import type { CreateLearningGoalDto, UpdateLearningGoalDto } from "./dto/goal.dto";

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, userId: string) {
    const goals = await this.prisma.learningGoal.findMany({
      where: { organizationId, userId },
      include: { course: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return Promise.all(goals.map((goal) => this.withProgress(goal)));
  }

  async create(organizationId: string, userId: string, dto: CreateLearningGoalDto) {
    if (dto.courseId) await this.ensureEnrollment(organizationId, userId, dto.courseId);
    const goal = await this.prisma.learningGoal.create({
      data: {
        organizationId,
        userId,
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        targetType: dto.targetType,
        targetValue: (dto.targetValue ?? {}) as Prisma.InputJsonObject,
        progressValue: (dto.progressValue ?? {}) as Prisma.InputJsonObject,
        dueAt: this.date(dto.dueAt),
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      include: { course: true },
    });
    return this.withProgress(goal);
  }

  async update(
    organizationId: string,
    userId: string,
    goalId: string,
    dto: UpdateLearningGoalDto,
  ) {
    const existing = await this.getOwnGoal(organizationId, userId, goalId);
    if (dto.courseId) await this.ensureEnrollment(organizationId, userId, dto.courseId);
    const status = dto.status ?? existing.status;
    const goal = await this.prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        targetType: dto.targetType,
        targetValue: dto.targetValue as Prisma.InputJsonObject | undefined,
        progressValue: dto.progressValue as Prisma.InputJsonObject | undefined,
        dueAt: this.date(dto.dueAt),
        status,
        completedAt:
          status === "COMPLETED" ? (existing.completedAt ?? new Date()) : null,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
      include: { course: true },
    });
    return this.withProgress(goal);
  }

  async delete(organizationId: string, userId: string, goalId: string) {
    await this.getOwnGoal(organizationId, userId, goalId);
    return this.prisma.learningGoal.update({
      where: { id: goalId },
      data: { status: "CANCELLED" },
    });
  }

  async complete(organizationId: string, userId: string, goalId: string) {
    await this.getOwnGoal(organizationId, userId, goalId);
    return this.prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        progressValue: { percent: 100 },
      },
    });
  }

  async updateGoalProgressForCourse(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    const goals = await this.prisma.learningGoal.findMany({
      where: {
        organizationId,
        userId,
        courseId,
        status: "ACTIVE",
        targetType: "COURSE_COMPLETION",
      },
    });
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
    });
    const percent = enrollment?.progressPercent ?? 0;
    await Promise.all(
      goals.map((goal) =>
        this.prisma.learningGoal.update({
          where: { id: goal.id },
          data: {
            progressValue: { percent },
            status: percent >= 100 ? "COMPLETED" : "ACTIVE",
            completedAt: percent >= 100 ? new Date() : null,
          },
        }),
      ),
    );
  }

  private async withProgress<T extends { id: string; courseId?: string | null; targetType: string; status: string }>(goal: T) {
    if (goal.targetType !== "COURSE_COMPLETION" || !goal.courseId || goal.status !== "ACTIVE") {
      return goal;
    }
    const stored = await this.prisma.learningGoal.findUnique({ where: { id: goal.id } });
    if (!stored) return goal;
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        organizationId: stored.organizationId,
        userId: stored.userId,
        courseId: stored.courseId ?? undefined,
      },
    });
    const percent = enrollment?.progressPercent ?? 0;
    if (JSON.stringify(stored.progressValue) === JSON.stringify({ percent })) return goal;
    return this.prisma.learningGoal.update({
      where: { id: goal.id },
      data: {
        progressValue: { percent },
        status: percent >= 100 ? "COMPLETED" : "ACTIVE",
        completedAt: percent >= 100 ? new Date() : null,
      },
      include: { course: true },
    });
  }

  private async getOwnGoal(organizationId: string, userId: string, goalId: string) {
    const goal = await this.prisma.learningGoal.findFirst({
      where: { id: goalId, organizationId, userId },
    });
    if (!goal) throw new NotFoundException("Learning goal not found");
    return goal;
  }

  private ensureEnrollment(organizationId: string, userId: string, courseId: string) {
    return ensureEnrollment(this.prisma, organizationId, userId, courseId);
  }

  // ── Study Sessions ─────────────────────────────────

  async startStudySession(
    organizationId: string,
    userId: string,
    data: { courseId?: string; goalId?: string; targetSeconds?: number },
  ) {
    return this.prisma.studySession.create({
      data: { organizationId, userId, courseId: data.courseId, goalId: data.goalId, targetSeconds: data.targetSeconds },
    });
  }

  async updateStudySession(
    organizationId: string,
    userId: string,
    sessionId: string,
    data: { status?: string; elapsedSeconds?: number },
  ) {
    const session = await this.prisma.studySession.findFirst({ where: { id: sessionId, organizationId, userId } });
    if (!session) throw new NotFoundException("Study session not found");
    const updated = await this.prisma.studySession.update({
      where: { id: sessionId },
      data: { status: data.status as any, elapsedSeconds: data.elapsedSeconds, endedAt: data.status === "COMPLETED" || data.status === "CANCELLED" ? new Date() : undefined },
    });
    // ponytail: auto-update STUDY_TIME goal progress on completion
    if (updated.status === "COMPLETED" && updated.goalId) {
      const goal = await this.prisma.learningGoal.findFirst({ where: { id: updated.goalId, organizationId, userId } });
      if (goal && goal.targetType === "STUDY_TIME") {
        const existing = (goal.progressValue as Record<string, unknown>)?.elapsedSeconds ?? 0;
        await this.prisma.learningGoal.update({
          where: { id: goal.id },
          data: { progressValue: { elapsedSeconds: Number(existing) + (updated.elapsedSeconds ?? 0) } },
        });
      }
    }
    return updated;
  }

  async listStudySessions(
    organizationId: string,
    userId: string,
    filters: { status?: string; from?: string; to?: string; limit?: number },
  ) {
    const where: Record<string, unknown> = { organizationId, userId };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.startedAt = {};
      if (filters.from) (where.startedAt as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to) (where.startedAt as Record<string, unknown>).lte = new Date(filters.to);
    }
    return this.prisma.studySession.findMany({
      where: where as any,
      orderBy: { startedAt: "desc" },
      take: filters.limit ?? 50,
    });
  }

  async getStudySession(organizationId: string, userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({ where: { id: sessionId, organizationId, userId } });
    if (!session) throw new NotFoundException("Study session not found");
    return session;
  }

  async cancelStudySession(organizationId: string, userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({ where: { id: sessionId, organizationId, userId } });
    if (!session) throw new NotFoundException("Study session not found");
    return this.prisma.studySession.update({ where: { id: sessionId }, data: { status: "CANCELLED", endedAt: new Date() } });
  }

  private date(value?: string) {
    return value ? new Date(value) : undefined;
  }
}
