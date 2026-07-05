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
});
