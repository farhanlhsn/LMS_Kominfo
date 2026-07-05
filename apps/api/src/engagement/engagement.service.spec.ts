import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { EngagementService } from "./engagement.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a" }), findMany: vi.fn() },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }), findMany: vi.fn().mockResolvedValue([]) },
    discussionThread: { findFirst: vi.fn().mockResolvedValue({ id: "thread-a", organizationId: "org-a", courseId: "course-a", authorId: "author", title: "Help", locked: false, status: "VISIBLE" }), findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
    discussionReply: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "reply-a" }), update: vi.fn() },
    lesson: { findFirst: vi.fn() }, activity: { findFirst: vi.fn() }, liveClass: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    assignment: { findMany: vi.fn().mockResolvedValue([]) }, quiz: { findMany: vi.fn().mockResolvedValue([]) }, calendarEvent: { findMany: vi.fn().mockResolvedValue([]) }, discussionReport: { upsert: vi.fn(), findMany: vi.fn() }, auditLog: { create: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  const notifications = { createForUser: vi.fn(), createForCourseParticipants: vi.fn() };
  const providers = { prepare: vi.fn((_provider, meetingUrl) => ({ meetingUrl, integrationMode: "manual_link" })) };
  return { service: new EngagementService(prisma as never, notifications as never, providers as never), prisma, notifications };
}

describe("EngagementService access control", () => {
  it("allows an enrolled learner to create a reply", async () => {
    const { service, prisma } = setup();
    await expect(service.createReply(org, "learner-a", "thread-a", { body: "A useful answer" })).resolves.toEqual({ id: "reply-a" });
    expect(prisma.discussionReply.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-a", authorId: "learner-a" }) }));
  });

  it("blocks learners from replying to a locked thread", async () => {
    const { service } = setup({ discussionThread: { findFirst: vi.fn().mockResolvedValue({ id: "thread-a", organizationId: "org-a", courseId: "course-a", authorId: "author", title: "Locked", locked: true, status: "VISIBLE" }) } });
    await expect(service.createReply(org, "learner-a", "thread-a", { body: "Nope" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not resolve cross-tenant discussion ids", async () => {
    const { service } = setup({ discussionThread: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.getThread(org, "learner-a", "thread-from-org-b")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not expose a live meeting URL without course access", async () => {
    const { service } = setup({
      liveClass: { findFirst: vi.fn().mockResolvedValue({ id: "live-a", organizationId: "org-a", courseId: "course-a", meetingUrl: "https://meeting.invalid", status: "SCHEDULED" }) },
      enrollment: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn() },
    });
    await expect(service.joinLiveClass(org, "outsider", "live-a")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns calendar data only after validating course access", async () => {
    const { service, prisma } = setup();
    await expect(service.calendar(org, "learner-a", { courseId: "course-a", from: "2026-07-01T00:00:00.000Z", to: "2026-08-01T00:00:00.000Z" })).resolves.toEqual([]);
    expect(prisma.course.findFirst).toHaveBeenCalledWith({ where: { id: "course-a", organizationId: "org-a", deletedAt: null } });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a" }) }));
  });
});
