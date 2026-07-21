import { describe, expect, it, vi } from "vitest";
import { AnalyticsController } from "./analytics.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const analytics = {
    recordEvent: vi.fn().mockResolvedValue({ id: "evt-1", eventType: "activity.started" }),
    listEvents: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getLearnerDashboard: vi.fn().mockResolvedValue({ totalCourses: 2, activeEnrollments: 1, completedCourses: 1, avgProgressPercent: 50, monthlyActivityEvents: 10 }),
    getLearnerCourseProgress: vi.fn().mockResolvedValue({ enrollment: null, activityProgress: [], recentEvents: [], totalActivities: 0, completedActivities: 0 }),
    getInstructorDashboard: vi.fn().mockResolvedValue({ courses: [], totalLearners: 0, totalEnrollments: 0, avgCompletionRate: 0 }),
    getInstructorCourseRoster: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getInstructorCourseEngagement: vi.fn().mockResolvedValue({ daily: [], totalActiveLearners: 0 }),
    getAdminOverview: vi.fn().mockResolvedValue({ totalCourses: 5, activeMembers: 10, totalEnrollments: 25, completedEnrollments: 4, completionRate: 16, monthlyEvents: 100, recentAuditLogs: [] }),
    getAdminCourseMetrics: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getAdminTrends: vi.fn().mockResolvedValue([{ date: "2026-07-04", events: 1, enrollments: 0 }]),
    getAuditLogs: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } }),
    runDailyAggregation: vi.fn().mockResolvedValue({ coursesProcessed: 1, learnersProcessed: 2 }),
    ...overrides,
  };
  return { controller: new AnalyticsController(analytics as any), analytics };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("AnalyticsController", () => {
  it("records an event and wraps it in { data }", async () => {
    const { controller, analytics } = setup();
    const body = { eventType: "activity.started", courseId: "c-1", activityId: "a-1" };
    const response = await controller.recordEvent(createRequest(), body as any);
    expect(analytics.recordEvent).toHaveBeenCalledWith("org-a", "u-1", "activity.started", undefined, "c-1", undefined, "a-1");
    expect(response).toEqual({ data: { id: "evt-1", eventType: "activity.started" } });
  });

  it("lists events with the service result shape", async () => {
    const { controller, analytics } = setup();
    const response = await controller.listEvents(createRequest(), { page: 1, limit: 20 } as any);
    expect(analytics.listEvents).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ page: 1, limit: 20 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("returns the learner dashboard wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getLearnerDashboard(createRequest());
    expect(analytics.getLearnerDashboard).toHaveBeenCalledWith(org, "u-1");
    expect(response).toEqual({
      data: { totalCourses: 2, activeEnrollments: 1, completedCourses: 1, avgProgressPercent: 50, monthlyActivityEvents: 10 },
    });
  });

  it("returns learner course progress wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getLearnerCourseProgress(createRequest(), "c-1");
    expect(analytics.getLearnerCourseProgress).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ data: { enrollment: null, activityProgress: [], recentEvents: [], totalActivities: 0, completedActivities: 0 } });
  });

  it("returns the instructor dashboard wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getInstructorDashboard(createRequest());
    expect(analytics.getInstructorDashboard).toHaveBeenCalledWith(org, "u-1");
    expect(response).toEqual({ data: { courses: [], totalLearners: 0, totalEnrollments: 0, avgCompletionRate: 0 } });
  });

  it("returns the instructor course roster as-is from the service", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getInstructorCourseRoster(createRequest(), "c-1", { page: 1, limit: 20 } as any);
    expect(analytics.getInstructorCourseRoster).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ page: 1 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("returns the instructor course engagement wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getInstructorCourseEngagement(createRequest(), "c-1", {} as any);
    expect(analytics.getInstructorCourseEngagement).toHaveBeenCalledWith(org, "u-1", "c-1", expect.any(Object));
    expect(response).toEqual({ data: { daily: [], totalActiveLearners: 0 } });
  });

  it("returns the admin overview wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getAdminOverview(createRequest());
    expect(analytics.getAdminOverview).toHaveBeenCalledWith(org);
    expect(response).toMatchObject({ data: { totalCourses: 5, activeMembers: 10, totalEnrollments: 25 } });
  });

  it("returns the admin course metrics as-is from the service", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getAdminCourseMetrics(createRequest(), { page: 1, limit: 20 } as any);
    expect(analytics.getAdminCourseMetrics).toHaveBeenCalledWith(org, expect.objectContaining({ page: 1, limit: 20 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("returns the admin trends wrapped in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getAdminTrends(createRequest(), {} as any);
    expect(analytics.getAdminTrends).toHaveBeenCalledWith(org, expect.any(Object));
    expect(response).toEqual({ data: [{ date: "2026-07-04", events: 1, enrollments: 0 }] });
  });

  it("returns audit logs as-is from the service", async () => {
    const { controller, analytics } = setup();
    const response = await controller.getAuditLogs(createRequest(), { page: 1, limit: 50 } as any);
    expect(analytics.getAuditLogs).toHaveBeenCalledWith(org, expect.objectContaining({ page: 1, limit: 50 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } });
  });

  it("triggers aggregation and wraps the result in { data }", async () => {
    const { controller, analytics } = setup();
    const response = await controller.triggerAggregation(createRequest());
    expect(analytics.runDailyAggregation).toHaveBeenCalledWith("org-a");
    expect(response).toEqual({ data: { coursesProcessed: 1, learnersProcessed: 2 } });
  });

  it("returns a placeholder export acknowledgement", async () => {
    const { controller } = setup();
    const response = await controller.requestExport(createRequest(), { reportType: "course_metrics", format: "csv" } as any);
    expect(response).toEqual({
      data: {
        message: "Export request received. Report generation is queued.",
        reportType: "course_metrics",
        format: "csv",
      },
    });
  });
});
