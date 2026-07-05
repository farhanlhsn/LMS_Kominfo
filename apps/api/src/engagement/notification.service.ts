import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@lms/db";

export interface NotificationInput {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createForUser(input: NotificationInput) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
    });
    const muted = Array.isArray(preference?.mutedTypes) ? preference.mutedTypes : [];
    if (preference?.inAppEnabled === false || muted.includes(input.type)) return null;

    if (input.entityType && input.entityId) {
      const duplicate = await this.prisma.notification.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId,
          createdAt: input.type.endsWith("_reminder") ? undefined : { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (duplicate) return duplicate;
    }
    return this.prisma.notification.create({ data: { ...input, metadata: (input.metadata ?? {}) as Prisma.InputJsonObject } });
  }

  async createForCourseParticipants(input: Omit<NotificationInput, "userId">, excludeUserId?: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        organizationId: input.organizationId,
        courseId: input.metadata?.courseId as string,
        status: { in: ["ACTIVE", "COMPLETED"] },
        userId: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: { userId: true },
    });
    return Promise.all(enrollments.map(({ userId }) => this.createForUser({ ...input, userId })));
  }

  async list(organizationId: string, userId: string, unreadOnly = false) {
    await this.refreshLearningReminders(organizationId, userId);
    return this.prisma.notification.findMany({
      where: { organizationId, userId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async refreshLearningReminders(organizationId: string, userId: string, now = new Date()) {
    const enrollments = await this.prisma.enrollment.findMany({ where: { organizationId, userId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } });
    const courseIds = enrollments.map(({ courseId }) => courseId);
    if (!courseIds.length) return [];
    const inThirtyMinutes = new Date(now.getTime() + 30 * 60_000); const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000);
    const [sessions, assignments, quizzes] = await Promise.all([
      this.prisma.liveClass.findMany({ where: { organizationId, courseId: { in: courseIds }, status: "SCHEDULED", startAt: { gt: now, lte: inThirtyMinutes } }, select: { id: true, courseId: true, title: true, startAt: true } }),
      this.prisma.assignment.findMany({ where: { organizationId, courseId: { in: courseIds }, status: "PUBLISHED", deletedAt: null, dueAt: { gt: now, lte: tomorrow } }, select: { id: true, courseId: true, title: true, dueAt: true } }),
      this.prisma.quiz.findMany({ where: { organizationId, courseId: { in: courseIds }, status: "PUBLISHED", deletedAt: null, dueAt: { gt: now, lte: tomorrow } }, select: { id: true, courseId: true, activityId: true, title: true, dueAt: true } }),
    ]);
    return Promise.all([
      ...sessions.map((item) => this.createForUser({ organizationId, userId, type: "live_class_reminder", title: `${item.title} starts soon`, body: "Your live class starts within 30 minutes.", actionUrl: `/learn/courses/${item.courseId}/live-classes`, entityType: "live_class", entityId: item.id, metadata: { courseId: item.courseId, startAt: item.startAt.toISOString() } })),
      ...assignments.map((item) => this.createForUser({ organizationId, userId, type: "assignment_due_reminder", title: `${item.title} is due soon`, body: "This assignment is due within 24 hours.", actionUrl: `/learn/assignments/${item.id}`, entityType: "assignment", entityId: item.id, metadata: { courseId: item.courseId, dueAt: item.dueAt!.toISOString() } })),
      ...quizzes.map((item) => this.createForUser({ organizationId, userId, type: "quiz_due_reminder", title: `${item.title} is due soon`, body: "This quiz is due within 24 hours.", actionUrl: item.activityId ? `/learn/courses/${item.courseId}` : undefined, entityType: "quiz", entityId: item.id, metadata: { courseId: item.courseId, dueAt: item.dueAt!.toISOString() } })),
    ]);
  }

  async unreadCount(organizationId: string, userId: string) {
    return { count: await this.prisma.notification.count({ where: { organizationId, userId, readAt: null } }) };
  }

  async markRead(organizationId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, organizationId, userId }, data: { readAt: new Date() } });
    return this.prisma.notification.findFirst({ where: { id, organizationId, userId } });
  }

  async markAllRead(organizationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { organizationId, userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  preferences(organizationId: string, userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId },
      update: {},
    });
  }

  updatePreferences(organizationId: string, userId: string, data: { inAppEnabled?: boolean; emailEnabled?: boolean; mutedTypes?: string[] }) {
    return this.prisma.notificationPreference.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, ...data },
      update: data,
    });
  }
}
