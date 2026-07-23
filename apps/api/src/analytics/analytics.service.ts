import { normalizePageLimit,pageMeta } from "@lms/shared";
import { ForbiddenException,Inject,Injectable,NotFoundException } from "@nestjs/common";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import type { AnalyticsQueryDto,AuditLogQueryDto,EventQueryDto } from "./dto/analytics.dto";

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



  private dateRange(from?: string, to?: string) {
    const relativeDays = from?.match(/^(\d+)d$/)?.[1];
    const gte = relativeDays ? new Date(Date.now() - Number(relativeDays) * 24 * 60 * 60 * 1000) : from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const [data, total] = await Promise.all([
      this.prisma.learningEvent.findMany({ where: where as any, orderBy: { createdAt: "desc" }, skip, take: limit }),
      this.prisma.learningEvent.count({ where: where as any }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  // ── Learner streak ────────────────────────────────────

  async getLearnerStreak(org: OrganizationContext, userId: string) {
    const days = await this.prisma.learnerDailyActivity.findMany({
      where: { organizationId: org.id, userId },
      orderBy: { date: "desc" },
      take: 62,
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(today);

    for (const day of days) {
      if (!day) break;
      const d = new Date(day.date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === checkDate.getTime() && day.eventCount > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d.getTime() < checkDate.getTime()) {
        break;
      }
    }

    let longestStreak = 0;
    let run = 0;
    const sorted = [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const day of sorted) {
      if (!day) continue;
      if (day.eventCount > 0) {
        run++;
        longestStreak = Math.max(longestStreak, run);
      } else {
        run = 0;
      }
    }

    const todayActivity = days.find(
      (d) => new Date(d.date).toISOString().slice(0, 10) === today.toISOString().slice(0, 10),
    );

    return {
      currentStreak,
      longestStreak,
      todayActive: todayActivity ? todayActivity.eventCount > 0 : false,
      dailyActivity: days.slice(0, 31).map((d) => ({
        date: d.date.toISOString().slice(0, 10),
        eventCount: d.eventCount,
        activityMinutes: d.activityMinutes,
      })),
    };
  }

  // ── Learner grades ────────────────────────────────────

  async getLearnerGrades(
    org: OrganizationContext,
    userId: string,
    courseId?: string,
  ) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { organizationId: org.id, userId, ...(courseId ? { courseId } : {}) },
      include: { course: { select: { id: true, title: true, slug: true } } },
    });

    const courses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const [quizAttempts, assignmentSubmissions] = await Promise.all([
          this.prisma.quizAttempt.findMany({
            where: {
              organizationId: org.id,
              userId,
              courseId: enrollment.courseId,
              status: { in: ["GRADED", "SUBMITTED"] },
            },
            include: {
              quiz: { select: { title: true } },
            },
            orderBy: { submittedAt: "desc" },
          }),
          this.prisma.assignmentSubmission.findMany({
            where: {
              organizationId: org.id,
              userId,
              courseId: enrollment.courseId,
              status: "GRADED",
            },
            include: {
              assignment: { select: { title: true } },
            },
            orderBy: { gradedAt: "desc" },
          }),
        ]);

        const quizzes = quizAttempts.map((a) => ({
          activityId: a.activityId ?? "",
          quizTitle: a.quiz.title,
          score: a.score,
          maxScore: a.maxScore,
          percentage: a.percentage,
          passed: a.passed,
          attemptedAt: a.submittedAt?.toISOString() ?? a.startedAt.toISOString(),
        }));

        const assignments = assignmentSubmissions.map((s) => ({
          activityId: s.activityId ?? "",
          assignmentTitle: s.assignment.title,
          score: s.score,
          maxScore: s.maxScore,
          percentage: s.score != null && s.maxScore ? Math.round((s.score / s.maxScore) * 100) : null,
          status: s.status,
          submittedAt: s.submittedAt?.toISOString() ?? null,
          gradedAt: s.gradedAt?.toISOString() ?? null,
        }));

        const quizAvg =
          quizzes.length > 0
            ? Math.round(quizzes.reduce((s, q) => s + q.percentage, 0) / quizzes.length)
            : null;
        const assignmentAvg =
          assignments.length > 0
            ? Math.round(
                assignments.reduce((s, a) => s + (a.percentage ?? 0), 0) / assignments.length,
              )
            : null;

        const totalWeighted = quizzes.reduce((s, q) => s + q.score, 0) + assignments.reduce((s, a) => s + (a.score ?? 0), 0);
        const totalMaxWeight = quizzes.reduce((s, q) => s + q.maxScore, 0) + assignments.reduce((s, a) => s + (a.maxScore ?? 0), 0);
        const overallGrade =
          totalMaxWeight > 0 ? Math.round((totalWeighted / totalMaxWeight) * 100) : null;

        return {
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          courseSlug: enrollment.course.slug,
          overallGrade,
          quizAverage: quizAvg,
          assignmentAverage: assignmentAvg,
          totalWeighted,
          totalMaxWeight,
          quizzes,
          assignments,
        };
      }),
    );

    const totalWeightedSum = courses.reduce((s, c) => s + (c.totalWeighted ?? 0), 0);
    const totalMaxSum = courses.reduce((s, c) => s + (c.totalMaxWeight ?? 0), 0);
    const overallGpa = totalMaxSum > 0 ? Math.round((totalWeightedSum / totalMaxSum) * 100) : null;

    return { courses, overallGpa };
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

    const weeklyActivityWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [courses, enrollments, weeklyEvents] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: courseIds }, organizationId: org.id }, select: { id: true, title: true, slug: true } }),
      this.prisma.enrollment.findMany({ where: { organizationId: org.id, courseId: { in: courseIds } } }),
      this.prisma.learningEvent.groupBy({
        by: ["courseId"],
        where: {
          organizationId: org.id,
          courseId: { in: courseIds },
          createdAt: { gte: weeklyActivityWindow },
        },
        _count: { id: true },
      }),
    ]);
    const totalLearners = new Set(enrollments.map((e) => e.userId)).size;
    const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
    const avgCompletion = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;
    const weeklyActivityMap = new Map(
      weeklyEvents.map((event) => [event.courseId, event._count.id]),
    );

    const courseMetrics = courses.map((course) => {
      const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
      const completed = courseEnrollments.filter((e) => e.status === "COMPLETED").length;
      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        enrollments: courseEnrollments.length,
        completedCount: completed,
        completionRate: courseEnrollments.length > 0 ? Math.round((completed / courseEnrollments.length) * 100) : 0,
        weeklyActivity: weeklyActivityMap.get(course.id) ?? 0,
      };
    });

    return { courses: courseMetrics, totalLearners, totalEnrollments: enrollments.length, avgCompletionRate: avgCompletion };
  }

  async getInstructorCourseRoster(org: OrganizationContext, userId: string, courseId: string, query: AnalyticsQueryDto) {
    await this.course(org.id, courseId);
    const managedIds = await this.managedCourseIds(org, userId);
    if (!managedIds.includes(courseId)) throw new ForbiddenException("Access denied");

    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { organizationId: org.id, courseId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { enrolledAt: "desc" },
      skip,
      take: limit,
    });
    const total = await this.prisma.enrollment.count({ where: { organizationId: org.id, courseId } });
    return { data: enrollments, meta: pageMeta(page, limit, total) };
  }

  async getInstructorCourseGradebook(org: OrganizationContext, userId: string, courseId: string, query: AnalyticsQueryDto) {
    await this.course(org.id, courseId);
    const managedIds = await this.managedCourseIds(org, userId);
    if (!managedIds.includes(courseId)) throw new ForbiddenException("Access denied");

    const { page, limit, skip } = normalizePageLimit(query.page, query.limit, 100);
    const [enrollments, total, assignments] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { organizationId: org.id, courseId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { enrolledAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({ where: { organizationId: org.id, courseId } }),
      this.prisma.assignment.findMany({
        where: { organizationId: org.id, courseId, deletedAt: null },
        select: {
          id: true,
          title: true,
          rubric: { select: { totalPoints: true } },
          submissions: { select: { userId: true, score: true, maxScore: true, status: true, gradedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const data = enrollments.map((enrollment) => {
      const assignmentScores = assignments.map((assignment) => {
        const submissions = assignment.submissions
          .filter((submission) => submission.userId === enrollment.userId)
          .sort((a, b) => Number(Boolean(b.gradedAt)) - Number(Boolean(a.gradedAt)));
        const submission = submissions[0];
        return {
          assignmentId: assignment.id,
          title: assignment.title,
          score: submission?.score ?? null,
          maxScore: submission?.maxScore ?? assignment.rubric?.totalPoints ?? null,
          status: submission?.status ?? "NOT_STARTED",
        };
      });
      const graded = assignmentScores.filter((item) => item.score != null && item.maxScore);
      const average = graded.length
        ? Math.round((graded.reduce((sum, item) => sum + (Number(item.score) / Number(item.maxScore)) * 100, 0) / graded.length) * 10) / 10
        : null;
      return {
        studentId: enrollment.userId,
        student: enrollment.user,
        enrollmentStatus: enrollment.status,
        progressPercent: enrollment.progressPercent,
        lastAccessedAt: enrollment.lastAccessedAt,
        assignmentScores,
        average,
      };
    });

    return { data, meta: pageMeta(page, limit, total) };
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
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const where: Record<string, unknown> = { organizationId: org.id, deletedAt: null };
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: where as any,
        select: { id: true, title: true, slug: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where: where as any }),
    ]);
    const courseIds = courses.map((c) => c.id);
    const enrollments = await this.prisma.enrollment.groupBy({ by: ["courseId"], where: { organizationId: org.id, courseId: { in: courseIds } }, _count: { id: true } });
    const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e._count.id]));
    const data = courses.map((c) => ({ ...c, enrollments: enrollmentMap.get(c.id) ?? 0 }));
    return { data, meta: pageMeta(page, limit, total) };
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
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit, 50);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: where as any }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  // ── Daily aggregation ─────────────────────────────────

  async runDailyAggregation(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const courses = await this.prisma.course.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } });
    const courseIds = courses.map((course) => course.id);
    const [
      enrollments,
      courseEventCounts,
      activeLearnerPairs,
      learners,
    ] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.enrollment.findMany({
            where: { organizationId, courseId: { in: courseIds } },
            select: {
              courseId: true,
              status: true,
              enrolledAt: true,
              progressPercent: true,
            },
          })
        : Promise.resolve([]),
      courseIds.length > 0
        ? this.prisma.learningEvent.groupBy({
            by: ["courseId"],
            where: {
              organizationId,
              courseId: { in: courseIds },
              createdAt: { gte: yesterday, lt: today },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      courseIds.length > 0
        ? this.prisma.learningEvent.groupBy({
            by: ["courseId", "userId"],
            where: {
              organizationId,
              courseId: { in: courseIds },
              createdAt: { gte: yesterday, lt: today },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      this.prisma.learningEvent.groupBy({
        by: ["userId"],
        where: { organizationId, createdAt: { gte: yesterday, lt: today } },
        _count: { id: true },
        _max: { createdAt: true },
      }),
    ]);

    const enrollmentMap = new Map<
      string,
      Array<{
        status: string;
        enrolledAt: Date;
        progressPercent: number;
      }>
    >();
    for (const enrollment of enrollments) {
      const items = enrollmentMap.get(enrollment.courseId) ?? [];
      items.push(enrollment);
      enrollmentMap.set(enrollment.courseId, items);
    }

    const activityEventMap = new Map(
      courseEventCounts.map((event) => [event.courseId, event._count.id]),
    );
    const activeLearnersMap = new Map<string, number>();
    for (const pair of activeLearnerPairs) {
      if (!pair.courseId || !pair.userId) continue;
      activeLearnersMap.set(
        pair.courseId,
        (activeLearnersMap.get(pair.courseId) ?? 0) + 1,
      );
    }

    await Promise.all(
      courses.map((course) => {
        const courseEnrollments = enrollmentMap.get(course.id) ?? [];
        const totalEnrollments = courseEnrollments.length;
        const completions = courseEnrollments.filter((e) => e.status === "COMPLETED").length;
        const newEnrollments = courseEnrollments.filter((e) => e.enrolledAt >= yesterday && e.enrolledAt < today).length;
        const avgProgress = courseEnrollments.length > 0 ? courseEnrollments.reduce((s, e) => s + e.progressPercent, 0) / courseEnrollments.length : null;
        return this.prisma.dailyCourseAggregate.upsert({
          where: { organizationId_courseId_date: { organizationId, courseId: course.id, date: yesterday } },
          update: {
            totalEnrollments,
            activeLearners: activeLearnersMap.get(course.id) ?? 0,
            newEnrollments,
            completions,
            avgProgressPercent: avgProgress,
            activityEvents: activityEventMap.get(course.id) ?? 0,
          },
          create: {
            organizationId,
            courseId: course.id,
            date: yesterday,
            totalEnrollments,
            activeLearners: activeLearnersMap.get(course.id) ?? 0,
            newEnrollments,
            completions,
            avgProgressPercent: avgProgress,
            activityEvents: activityEventMap.get(course.id) ?? 0,
          },
        });
      }),
    );

    await Promise.all(
      learners
        .filter((learner) => learner.userId)
        .map((learner) =>
          this.prisma.learnerDailyActivity.upsert({
            where: {
              organizationId_userId_date: {
                organizationId,
                userId: learner.userId!,
                date: yesterday,
              },
            },
            update: {
              eventCount: learner._count.id,
              lastActivityAt: learner._max.createdAt ?? yesterday,
            },
            create: {
              organizationId,
              userId: learner.userId!,
              date: yesterday,
              eventCount: learner._count.id,
              lastActivityAt: learner._max.createdAt ?? yesterday,
            },
          }),
        ),
    );

    return { coursesProcessed: courses.length, learnersProcessed: learners.length };
  }

  // ── Progress Export CSV ────────────────────────────

  async exportLearnerProgressCsv(org: OrganizationContext, userId: string): Promise<string> {
    const data = await this.getLearnerGrades(org, userId);
    const lines: string[] = [];

    lines.push("Course,Type,Title,Score,Max Score,Percentage (%),Passed/Graded,Date");

    for (const course of data.courses) {
      for (const q of course.quizzes) {
        lines.push([
          escCsv(course.courseTitle), "Quiz", escCsv(q.quizTitle),
          q.score, q.maxScore, q.percentage, q.passed ? "Passed" : "Failed", q.attemptedAt,
        ].join(","));
      }
      for (const a of course.assignments) {
        lines.push([
          escCsv(course.courseTitle), "Assignment", escCsv(a.assignmentTitle),
          a.score ?? "", a.maxScore ?? "", a.percentage ?? "", a.status,
          a.gradedAt ?? a.submittedAt ?? "",
        ].join(","));
      }
    }

    lines.push("", "Course Average Summary");
    lines.push("Course,Quiz Average (%),Assignment Average (%),Overall Grade (%)");
    for (const course of data.courses) {
      lines.push([
        escCsv(course.courseTitle), course.quizAverage ?? "", course.assignmentAverage ?? "", course.overallGrade ?? "",
      ].join(","));
    }
    lines.push("Overall GPA," + (data.overallGpa ?? ""));

    return lines.join("\r\n");
  }
}

function escCsv(val: string): string {
  return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
}
