import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "./analytics.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const adminOrg = { ...org, roleKeys: ["org_admin"], isPlatformAdmin: true };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a" }), findMany: vi.fn().mockResolvedValue([{ id: "course-a" }]), count: vi.fn().mockResolvedValue(1) },
    enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }), findMany: vi.fn().mockResolvedValue([{ id: "enr-a", courseId: "course-a", userId: "user-a", status: "ACTIVE", progressPercent: 50 }]), count: vi.fn().mockResolvedValue(1) },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    learningEvent: { create: vi.fn().mockResolvedValue({ id: "evt-a" }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(5), groupBy: vi.fn().mockResolvedValue([]) },
    activityProgress: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    dailyCourseAggregate: { upsert: vi.fn() },
    learnerDailyActivity: { upsert: vi.fn() },
    organizationMember: { count: vi.fn().mockResolvedValue(10) },
    $transaction: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return { service: new AnalyticsService(prisma as never), prisma };
}

describe("AnalyticsService", () => {
  describe("recordEvent", () => {
    it("creates a learning event", async () => {
      const { service, prisma } = setup();
      await service.recordEvent("org-a", "user-a", "activity.started", {}, "course-a");
      expect(prisma.learningEvent.create).toHaveBeenCalledWith({ data: { organizationId: "org-a", userId: "user-a", courseId: "course-a", lessonId: undefined, activityId: undefined, eventType: "activity.started", metadata: {} } });
    });
  });

  describe("getLearnerDashboard", () => {
    it("returns learner stats", async () => {
      const { service, prisma } = setup();
      prisma.learningEvent.count = vi.fn().mockResolvedValue(15);
      const result = await service.getLearnerDashboard(org, "user-a");
      expect(result).toMatchObject({ totalCourses: 1, activeEnrollments: 1, monthlyActivityEvents: 15 });
    });
  });

  describe("getInstructorDashboard", () => {
    it("returns empty stats when no courses", async () => {
      const { service, prisma } = setup({ course: { findMany: vi.fn().mockResolvedValue([]) } });
      const result = await service.getInstructorDashboard(org, "instructor-a");
      expect(result).toMatchObject({ totalLearners: 0, totalEnrollments: 0 });
    });

    it("aggregates weekly activity without per-course counts", async () => {
      const { service, prisma } = setup({
        course: {
          findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a" }),
          findMany: vi.fn().mockResolvedValue([
            { id: "course-a", title: "Course A", slug: "course-a" },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
        courseInstructor: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([{ courseId: "course-a" }]),
        },
        learningEvent: {
          create: vi.fn().mockResolvedValue({ id: "evt-a" }),
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          groupBy: vi.fn().mockResolvedValue([{ courseId: "course-a", _count: { id: 7 } }]),
        },
      });
      const result = await service.getInstructorDashboard(org, "instructor-a");
      expect(result.courses[0]).toMatchObject({ weeklyActivity: 7 });
      expect(prisma.learningEvent.count).not.toHaveBeenCalled();
    });
  });

  describe("getAdminOverview", () => {
    it("returns org-wide metrics", async () => {
      const { service, prisma } = setup();
      prisma.course.count = vi.fn().mockResolvedValue(5);
      prisma.enrollment.count = vi.fn().mockResolvedValue(25);
      const result = await service.getAdminOverview(adminOrg);
      expect(result.totalCourses).toBe(5);
      expect(result.activeMembers).toBe(10);
    });
  });

  describe("getAuditLogs", () => {
    it("paginates audit logs", async () => {
      const { service, prisma } = setup();
      prisma.auditLog.findMany = vi.fn().mockResolvedValue([{ id: "log-a", action: "user.login" }]);
      prisma.auditLog.count = vi.fn().mockResolvedValue(1);
      const result = await service.getAuditLogs(adminOrg, { page: 1, limit: 50 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("getAdminTrends", () => {
    it("returns daily trends", async () => {
      const { service, prisma } = setup();
      prisma.learningEvent.groupBy = vi.fn().mockResolvedValue([]);
      prisma.enrollment.findMany = vi.fn().mockResolvedValue([]);
      const result = await service.getAdminTrends(adminOrg, {});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tenant isolation", () => {
    it("rejects access to non-existent course", async () => {
      const { service, prisma } = setup({ course: { findFirst: vi.fn().mockResolvedValue(null) } });
      await expect(service.getLearnerCourseProgress(org, "user-a", "course-other-org")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("runDailyAggregation", () => {
    it("uses grouped learner activity without per-learner findFirst queries", async () => {
      const { service, prisma } = setup({
        course: {
          findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a" }),
          findMany: vi.fn().mockResolvedValue([{ id: "course-a" }]),
          count: vi.fn().mockResolvedValue(1),
        },
        enrollment: {
          findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
          findMany: vi.fn().mockResolvedValue([
            {
              courseId: "course-a",
              status: "COMPLETED",
              enrolledAt: new Date(),
              progressPercent: 100,
            },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
        learningEvent: {
          create: vi.fn().mockResolvedValue({ id: "evt-a" }),
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(5),
          groupBy: vi
            .fn()
            .mockResolvedValueOnce([{ courseId: "course-a", _count: { id: 5 } }])
            .mockResolvedValueOnce([
              { courseId: "course-a", userId: "user-a", _count: { id: 5 } },
            ])
            .mockResolvedValueOnce([
              {
                userId: "user-a",
                _count: { id: 5 },
                _max: { createdAt: new Date() },
              },
            ]),
        },
      });
      const result = await service.runDailyAggregation("org-a");
      expect(result).toMatchObject({ coursesProcessed: 1, learnersProcessed: 1 });
      expect(prisma.dailyCourseAggregate.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.learnerDailyActivity.upsert).toHaveBeenCalledTimes(1);
    });
  });

  it("covers listEvents, progress, roster, engagement, and admin metrics", async () => {
    const { service, prisma } = setup();
    prisma.learningEvent.findMany = vi.fn().mockResolvedValue([{ id: "e1" }]);
    prisma.learningEvent.count = vi.fn().mockResolvedValue(1);
    await service.listEvents(adminOrg as any, "user-a", {
      page: 1,
      limit: 10,
    } as any);
    prisma.course.findFirst.mockResolvedValue({
      id: "course-a",
      organizationId: "org-a",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      status: "ACTIVE",
      progressPercent: 40,
    });
    prisma.activityProgress.findMany = vi
      .fn()
      .mockResolvedValue([{ activityId: "a1", progressPercent: 40 }]);
    await service.getLearnerCourseProgress(org as any, "user-a", "course-a");
    prisma.courseInstructor.findMany = vi
      .fn()
      .mockResolvedValue([{ courseId: "course-a" }]);
    prisma.enrollment.findMany = vi.fn().mockResolvedValue([
      { id: "enr-1", userId: "user-a", progressPercent: 40 },
    ]);
    await service.getInstructorCourseRoster(
      org as any,
      "instructor-a",
      "course-a",
      { page: 1, limit: 10 } as any,
    );
    prisma.learningEvent.groupBy = vi.fn().mockResolvedValue([]);
    await service.getInstructorCourseEngagement(
      org as any,
      "instructor-a",
      "course-a",
      {} as any,
    );
    prisma.course.findMany = vi.fn().mockResolvedValue([
      { id: "course-a", title: "C", _count: { enrollments: 1 } },
    ]);
    prisma.enrollment.groupBy = vi.fn().mockResolvedValue([
      { courseId: "course-a", _count: { id: 1 } },
    ]);
    await service.getAdminCourseMetrics(adminOrg as any, {} as any);
    expect(prisma.learningEvent.findMany).toHaveBeenCalled();
  });

  it("covers learner access, daily engagement, trends, audit filters, empty agg", async () => {
    const day = new Date("2026-01-15T12:00:00Z");
    const { service, prisma } = setup({
      courseInstructor: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{ courseId: "course-b" }]),
      },
      enrollment: {
        findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
        findMany: vi.fn().mockResolvedValue([
          { courseId: "course-a", enrolledAt: day },
        ]),
        count: vi.fn().mockResolvedValue(1),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      learningEvent: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi
          .fn()
          .mockResolvedValueOnce([
            { createdAt: day, _count: { id: 2 } },
            { createdAt: day, _count: { id: 1 } },
          ])
          .mockResolvedValueOnce([{ userId: "u1", _count: { id: 1 } }])
          .mockResolvedValueOnce([{ createdAt: day, _count: { id: 3 } }])
          .mockResolvedValue([]),
      },
    });

    prisma.course.findFirst.mockResolvedValue({ id: "course-a" });
    await service.getLearnerCourseProgress(org as any, "user-a", "course-a");

    prisma.courseInstructor.findMany = vi
      .fn()
      .mockResolvedValue([{ courseId: "course-a" }]);
    const eng = await service.getInstructorCourseEngagement(
      org as any,
      "instructor-a",
      "course-a",
      { from: "2026-01-01", to: "2026-01-31" } as any,
    );
    expect(eng.daily[0]).toMatchObject({ date: "2026-01-15", events: 3 });
    expect(eng.totalActiveLearners).toBe(1);

    prisma.enrollment.findMany = vi
      .fn()
      .mockResolvedValue([{ enrolledAt: day }]);
    const trends = await service.getAdminTrends(adminOrg as any, {
      from: "2026-01-01",
      to: "2026-01-31",
    } as any);
    expect(trends.some((t: any) => t.date === "2026-01-15")).toBe(true);

    await service.getAuditLogs(adminOrg as any, {
      action: "login",
      entityType: "user",
      entityId: "u1",
      userId: "u1",
      severity: "INFO",
      from: "2026-01-01",
      to: "2026-01-31",
      page: 1,
      limit: 10,
    } as any);

    prisma.course.findMany = vi.fn().mockResolvedValue([]);
    prisma.learningEvent.groupBy = vi.fn().mockResolvedValue([]);
    const empty = await service.runDailyAggregation("org-a");
    expect(empty).toMatchObject({ coursesProcessed: 0 });

    prisma.courseInstructor.findMany = vi.fn().mockResolvedValue([]);
    await expect(
      service.getInstructorCourseEngagement(
        org as any,
        "outsider",
        "course-a",
        {} as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
