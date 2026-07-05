import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateLearningGoalDto, UpdateLearningGoalDto } from "./dto/goal.dto";

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, userId: string) {
    const goals = await this.prisma.learningGoal.findMany({
      where: { organizationId, userId },
      include: { course: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
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

  private async ensureEnrollment(organizationId: string, userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
    });
    if (!enrollment) throw new ForbiddenException("Course enrollment is required");
    return enrollment;
  }

  private date(value?: string) {
    return value ? new Date(value) : undefined;
  }
}
