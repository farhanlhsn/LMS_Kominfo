import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { AnalyticsQueryDto, EventQueryDto, AuditLogQueryDto } from "./dto/analytics.dto";
import { PERMISSIONS } from "@lms/shared";

const ADMIN_ROLES = new Set(["org_admin", "course_manager"]);

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  // ── Helpers ──────────────────────────────────────────

  private async course(organizationId: string, courseId: string) {
    const c = await this.prisma.course.findFirst({ where: { id: courseId, organizationId, deletedAt: null } });
    if (!c) throw new NotFoundException("Course not found");
    return c;
  }

  private async canViewCourse(org: OrganizationContext, userId: string, courseId: string) {
    if (org.isPlatformAdmin || org.roleKeys.some((r) => ADMIN_ROLES.has(r))) return true;
    if (await this.prisma.courseInstructor.findFirst({ where: { organizationId: org.id, courseId, userId } })) return true;
    const enrollment = await this.prisma.enrollment.findUnique({ where: { organizationId_courseId_userId: { organizationId: org.id, courseId, userId } } });
    if (enrollment && ["ACTIVE", "COMPLETED"].includes(enrollment.status)) return true;
    return false;
  }

  private async accessibleCourseIds(org: OrganizationContext, userId: string) {
    if (org.isPlatformAdmin || org.roleKeys.some((r) => ADMIN_ROLES.has(r)))
      return (await this.prisma.course.findMany({ where: { organizationId: org.id, deletedAt: null }, select: { id: true } })).map(({ id }) => id);
    const [enrollments, instructed] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { organizationId: org.id, userId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } }),
      this.prisma.courseInstructor.findMany({ where: { organizationId: org.id, userId }, select: { courseId: true } }),
    ]);
    return [...new Set([...enrollments, ...instructed].map(({ courseId: id }) => id))];
  }

  private async managedCourseIds(org: OrganizationContext, userId: string) {
    if (org.isPlatformAdmin || org.roleKeys.some((r) => ADMIN_ROLES.has(r)))
      return (await this.prisma.course.findMany({ where: { organizationId: org.id, deletedAt: null }, select: { id: true } })).map(({ id }) => id);
    return (await this.prisma.courseInstructor.findMany({ where: { organizationId: org.id, userId }, select: { courseId: true } })).map(({ courseId: id }) => id);
  }

  private paginationMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private dateRange(from?: string, to?: string) {
    const gte = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lte = to ? new Date(to) : new Date();
    return { gte, lte };
  }

  // ── Event recording ──────────────────────────────────

  async recordEvent(
    organizationId: string,
    userId: string | null,
    eventType: string,
    metadata: Record<string, unknown> = {},
    courseId?: string,
    lessonId?: string,
    activityId?: string,
  ) {
    return this.prisma.learningEvent.create({
      data: { organizationId, userId, courseId, lessonId, activityId, eventType, metadata: metadata as any },
    });
  }

  async listEvents(org: OrganizationContext, userId: string, query: EventQueryDto) {
    const courseIds = query.courseId ? [await this.course(org.id, query.courseId).then((c) => c.id)] : await this.accessibleCourseIds(org, userId);
    const { gte, lte } = this.dateRange(query.from, query.to);
    const where: Record<string, unknown> = { organizationId: org.id, courseId: { in: courseIds }, createdAt: { gte, lte } };
    if (query.eventType) where.eventType = query.eventType;
    if (query.userId) where.userId = query.userId;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.learningEvent.findMany({ where: where as any, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.learningEvent.count({ where: where as any }),
    ]);
    return { data, meta: this.paginationMeta(page, limit, total) };
  }

  // ── Learner dashboard ─────────────────────────────────

  async getLearnerDashboard(org: OrganizationContext, userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({ where: { organizationId: org.id, userId } });
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const completed = enrollments.filter((e) => e.status === "COMPLETED").length;
    const totalCourses = enrollments.length;

    const activityCount = await this.prisma.learningEvent.count({ where: { organizationId: org.id, userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
    const avgProgress = enrollments.length > 0 ? Math.round(enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length) : 0;

    return {
      totalCourses,
      activeEnrollments: active,
      completedCourses: completed,
      avgProgressPercent: avgProgress,
      monthlyActivityEvents: activityCount,
    };
  }

  async getLearnerCourseProgress(org: OrganizationContext, userId: string, courseId: string) {
    await this.course(org.id, courseId);
    if (!(await this.canViewCourse(org, userId, courseId))) throw new ForbiddenException("Access denied");
    const enrollment = await this.prisma.enrollment.findUnique({ where: { organizationId_courseId_userId: { organizationId: org.id, courseId, userId } } });
    const progress = await this.prisma.activityProgress.findMany({ where: { organizationId: org.id, courseId, userId }, orderBy: { updatedAt: "desc" } });
    const events = await this.prisma.learningEvent.findMany({ where: { organizationId: org.id, userId, courseId }, orderBy: { createdAt: "desc" }, take: 50 });
    return {
      enrollment,
      activityProgress: progress,
      recentEvents: events,
      totalActivities: progress.length,
      completedActivities: progress.filter((p) => p.status === "COMPLETED").length,
    };
  }

  // ── Instructor dashboard ──────────────────────────────

  async getInstructorDashboard(org: OrganizationContext, userId: string) {
    const courseIds = await this.managedCourseIds(org, userId);
    if (!courseIds.length) return { courses: [], totalLearners: 0, totalEnrollments: 0, avgCompletionRate: 0 };

    const courses = await this.prisma.course.findMany({ where: { id: { in: courseIds }, organizationId: org.id }, select: { id: true, title: true, slug: true } });
    const enrollments = await this.prisma.enrollment.findMany({ where: { organizationId: org.id, courseId: { in: courseIds } } });
    const totalLearners = new Set(enrollments.map((e) => e.userId)).size;
    const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
    const avgCompletion = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

    const courseMetrics = await Promise.all(courses.map(async (course) => {
      const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
      const completed = courseEnrollments.filter((e) => e.status === "COMPLETED").length;
      const recentEvents = await this.prisma.learningEvent.count({ where: { organizationId: org.id, courseId: course.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });
      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        enrollments: courseEnrollments.length,
        completedCount: completed,
        completionRate: courseEnrollments.length > 0 ? Math.round((completed / courseEnrollments.length) * 100) : 0,
        weeklyActivity: recentEvents,
      };
    }));

    return { courses: courseMetrics, totalLearners, totalEnrollments: enrollments.length, avgCompletionRate: avgCompletion };
  }

  async getInstructorCourseRoster(org: OrganizationContext, userId: string, courseId: string, query: AnalyticsQueryDto) {
    await this.course(org.id, courseId);
    const managedIds = await this.managedCourseIds(org, userId);
    if (!managedIds.includes(courseId)) throw new ForbiddenException("Access denied");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const enrollments = await this.prisma.enrollment.findMany({
      where: { organizationId: org.id, courseId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { enrolledAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await this.prisma.enrollment.count({ where: { organizationId: org.id, courseId } });
    return { data: enrollments, meta: this.paginationMeta(page, limit, total) };
  }

  async getInstructorCourseEngagement(org: OrganizationContext, userId: string, courseId: string, query: AnalyticsQueryDto) {
    await this.course(org.id, courseId);
    const managedIds = await this.managedCourseIds(org, userId);
    if (!managedIds.includes(courseId)) throw new ForbiddenException("Access denied");

    const { gte, lte } = this.dateRange(query.from, query.to);
    const events = await this.prisma.learningEvent.groupBy({
      by: ["createdAt"],
      where: { organizationId: org.id, courseId, createdAt: { gte, lte } },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });
    // Group by date
    const dailyMap = new Map<string, number>();
    for (const e of events) {
      const dateKey = e.createdAt.toISOString().slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + e._count.id);
    }
    const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, events: count }));

    const totalActive = await this.prisma.learningEvent.groupBy({
      by: ["userId"],
      where: { organizationId: org.id, courseId, createdAt: { gte, lte } },
      _count: { id: true },
    });

    return { daily, totalActiveLearners: totalActive.length };
  }

  // ── Admin / Org analytics ─────────────────────────────

  async getAdminOverview(org: OrganizationContext) {
    const [totalCourses, totalUsers, totalEnrollments, totalEvents] = await Promise.all([
      this.prisma.course.count({ where: { organizationId: org.id, deletedAt: null } }),
      this.prisma.organizationMember.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
      this.prisma.enrollment.count({ where: { organizationId: org.id } }),
      this.prisma.learningEvent.count({ where: { organizationId: org.id, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    const completedEnrollments = await this.prisma.enrollment.count({ where: { organizationId: org.id, status: "COMPLETED" } });
    const recentLogs = await this.prisma.auditLog.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, take: 10 });

    return {
      totalCourses,
      activeMembers: totalUsers,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      monthlyEvents: totalEvents,
      recentAuditLogs: recentLogs,
    };
  }

  async getAdminCourseMetrics(org: OrganizationContext, query: AnalyticsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { organizationId: org.id, deletedAt: null };
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: where as any,
        select: { id: true, title: true, slug: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where: where as any }),
    ]);
    const courseIds = courses.map((c) => c.id);
    const enrollments = await this.prisma.enrollment.groupBy({ by: ["courseId"], where: { organizationId: org.id, courseId: { in: courseIds } }, _count: { id: true } });
    const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e._count.id]));
    const data = courses.map((c) => ({ ...c, enrollments: enrollmentMap.get(c.id) ?? 0 }));
    return { data, meta: this.paginationMeta(page, limit, total) };
  }

  async getAdminTrends(org: OrganizationContext, query: AnalyticsQueryDto) {
    const { gte, lte } = this.dateRange(query.from, query.to);
    const events = await this.prisma.learningEvent.groupBy({
      by: ["createdAt"],
      where: { organizationId: org.id, createdAt: { gte, lte } },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const dailyMap = new Map<string, { events: number; enrollments: number }>();
    for (const e of events) {
      const key = e.createdAt.toISOString().slice(0, 10);
      const prev = dailyMap.get(key) ?? { events: 0, enrollments: 0 };
      prev.events += e._count.id;
      dailyMap.set(key, prev);
    }
    const enrollments = await this.prisma.enrollment.findMany({ where: { organizationId: org.id, enrolledAt: { gte, lte } }, select: { enrolledAt: true } });
    for (const e of enrollments) {
      const key = e.enrolledAt.toISOString().slice(0, 10);
      const prev = dailyMap.get(key) ?? { events: 0, enrollments: 0 };
      prev.enrollments += 1;
      dailyMap.set(key, prev);
    }
    return Array.from(dailyMap.entries()).map(([date, counts]) => ({ date, ...counts }));
  }

  // ── Audit logs ────────────────────────────────────────

  async getAuditLogs(org: OrganizationContext, query: AuditLogQueryDto) {
    const where: Record<string, unknown> = { organizationId: org.id };
    if (query.action) where.action = { contains: query.action, mode: "insensitive" };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.userId) where.userId = query.userId;
    if (query.severity) where.severity = query.severity;
    if (query.from || query.to) {
      const { gte, lte } = this.dateRange(query.from, query.to);
      where.createdAt = { gte, lte };
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: where as any }),
    ]);
    return { data, meta: this.paginationMeta(page, limit, total) };
  }

  // ── Daily aggregation ─────────────────────────────────

  async runDailyAggregation(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const courses = await this.prisma.course.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } });

    for (const course of courses) {
      const enrollments = await this.prisma.enrollment.findMany({ where: { organizationId, courseId: course.id } });
      const totalEnrollments = enrollments.length;
      const completions = enrollments.filter((e) => e.status === "COMPLETED").length;
      const newEnrollments = enrollments.filter((e) => e.enrolledAt >= yesterday && e.enrolledAt < today).length;

      const activityEvents = await this.prisma.learningEvent.count({ where: { organizationId, courseId: course.id, createdAt: { gte: yesterday, lt: today } } });
      const activeLearnersSet = await this.prisma.learningEvent.groupBy({ by: ["userId"], where: { organizationId, courseId: course.id, createdAt: { gte: yesterday, lt: today } }, _count: { id: true } });

      const avgProgress = enrollments.length > 0 ? enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length : null;

      await this.prisma.dailyCourseAggregate.upsert({
        where: { organizationId_courseId_date: { organizationId, courseId: course.id, date: yesterday } },
        update: { totalEnrollments, activeLearners: activeLearnersSet.length, newEnrollments, completions, avgProgressPercent: avgProgress, activityEvents },
        create: { organizationId, courseId: course.id, date: yesterday, totalEnrollments, activeLearners: activeLearnersSet.length, newEnrollments, completions, avgProgressPercent: avgProgress, activityEvents },
      });
    }

    // Aggregate per-learner daily activity
    const learners = await this.prisma.learningEvent.groupBy({
      by: ["userId"],
      where: { organizationId, createdAt: { gte: yesterday, lt: today } },
      _count: { id: true },
    });

    for (const learner of learners) {
      if (!learner.userId) continue;
      const lastEvent = await this.prisma.learningEvent.findFirst({
        where: { organizationId, userId: learner.userId, createdAt: { gte: yesterday, lt: today } },
        orderBy: { createdAt: "desc" },
      });
      await this.prisma.learnerDailyActivity.upsert({
        where: { organizationId_userId_date: { organizationId, userId: learner.userId, date: yesterday } },
        update: { eventCount: learner._count.id, lastActivityAt: lastEvent?.createdAt ?? yesterday },
        create: { organizationId, userId: learner.userId, date: yesterday, eventCount: learner._count.id, lastActivityAt: lastEvent?.createdAt ?? yesterday },
      });
    }

    return { coursesProcessed: courses.length, learnersProcessed: learners.length };
  }
}
