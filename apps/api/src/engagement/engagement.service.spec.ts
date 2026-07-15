import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
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

  it("rejects invalid parent reply and sends mention notifications", async () => {
    const { service, prisma, notifications } = setup();
    prisma.discussionReply.findFirst = vi.fn().mockResolvedValue(null);
    await expect(
      service.createReply(org, "learner-a", "thread-a", {
        body: "x",
        parentReplyId: "missing",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.discussionReply.findFirst = vi.fn().mockResolvedValue({
      id: "parent",
      organizationId: "org-a",
      threadId: "thread-a",
      deletedAt: null,
    });
    prisma.discussionReply.create = vi.fn().mockResolvedValue({
      id: "reply-a",
      author: { name: "Ada" },
    });
    prisma.discussionReply.findMany = vi
      .fn()
      .mockResolvedValue([{ authorId: "author" }, { authorId: "other" }]);
    await service.createReply(org, "learner-a", "thread-a", {
      body: "hello @other",
      parentReplyId: "parent",
      mentionedUserIds: ["other", "learner-a"],
    } as any);
    expect(notifications.createForUser).toHaveBeenCalled();
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

  it("lists creates updates deletes discussion threads", async () => {
    const { service, prisma, notifications } = setup();
    prisma.discussionThread.findMany = vi.fn().mockResolvedValue([{ id: "t1" }]);
    prisma.discussionThread.create = vi.fn().mockResolvedValue({
      id: "t1",
      title: "Help",
      author: { name: "A" },
    });
    prisma.discussionThread.update = vi.fn().mockResolvedValue({ id: "t1" });
    expect(await service.listThreads(org, "learner-a", { courseId: "course-a" } as any)).toEqual([
      { id: "t1" },
    ]);
    await service.createThread(org, "learner-a", {
      courseId: "course-a",
      title: "Help",
      body: "Body",
      mentionedUserIds: ["other"],
    } as any);
    expect(notifications.createForUser).toHaveBeenCalled();
    await service.updateThread(org, "author", "thread-a", {
      title: "Updated",
    } as any);
    await service.deleteThread(org, "author", "thread-a");
    expect(prisma.discussionThread.update).toHaveBeenCalled();

    prisma.discussionThread.findFirst = vi.fn().mockResolvedValue({
      id: "thread-a",
      organizationId: "org-a",
      courseId: "course-a",
      authorId: "author",
      title: "Help",
      locked: false,
      status: "VISIBLE",
      deletedAt: null,
    });
    prisma.discussionReply.findFirst = vi.fn().mockResolvedValue({
      id: "reply-a",
      organizationId: "org-a",
      threadId: "thread-a",
      authorId: "other-user",
      deletedAt: null,
    });
    prisma.discussionReply.update = vi.fn().mockResolvedValue({ id: "reply-a" });
    prisma.discussionReport = {
      upsert: vi.fn().mockResolvedValue({ id: "rep-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "rep-1" }),
    };
    await service.getThread(org, "learner-a", "thread-a");
    prisma.discussionReply.findFirst = vi.fn().mockResolvedValue({
      id: "reply-a",
      organizationId: "org-a",
      threadId: "thread-a",
      authorId: "learner-a",
      deletedAt: null,
    });
    await service.updateReply(org, "learner-a", "reply-a", {
      body: "edited",
    } as any);
    await service.deleteReply(org, "learner-a", "reply-a");
    await service.reportThread(org, "learner-a", "thread-a", {
      reason: "spam",
    } as any);
    prisma.discussionReply.findFirst = vi.fn().mockResolvedValue({
      id: "reply-a",
      organizationId: "org-a",
      threadId: "thread-a",
      authorId: "other-user",
      deletedAt: null,
    });
    await service.reportReply(org, "learner-a", "reply-a", {
      reason: "spam",
    } as any);
    const manager = {
      ...org,
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    };
    prisma.courseInstructor.findFirst = vi.fn().mockResolvedValue({ id: "ci" });
    await service.moderateThread(manager, "admin", "thread-a", {
      locked: true,
      pinned: true,
    } as any);
    expect(notifications.createForCourseParticipants).toHaveBeenCalled();
    await service.moderateReply(manager, "admin", "reply-a", {
      status: "HIDDEN",
    } as any);
    await service.listDiscussionReports(manager, "admin", "course-a");
  });


  it("returns calendar data only after validating course access", async () => {
    const { service, prisma } = setup();
    await expect(service.calendar(org, "learner-a", { courseId: "course-a", from: "2026-07-01T00:00:00.000Z", to: "2026-08-01T00:00:00.000Z" })).resolves.toEqual([]);
    expect(prisma.course.findFirst).toHaveBeenCalledWith({ where: { id: "course-a", organizationId: "org-a", deletedAt: null } });
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a" }) }));
  });

  it("manages live classes and calendar events", async () => {
    const managerOrg = {
      ...org,
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: true,
    };
    const { service, prisma, notifications } = setup();
    prisma.courseInstructor.findFirst = vi.fn().mockResolvedValue({ id: "ci" });
    prisma.liveClass = {
      findFirst: vi.fn().mockResolvedValue({
        id: "live-a",
        organizationId: "org-a",
        courseId: "course-a",
        meetingUrl: "https://meet.example/x",
        status: "SCHEDULED",
        provider: "manual",
        title: "Live",
        startAt: new Date("2026-08-01T10:00:00Z"),
        endAt: new Date("2026-08-01T11:00:00Z"),
        course: { id: "course-a", title: "Course" },
      }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "live-new" }),
      update: vi.fn().mockResolvedValue({ id: "live-a", status: "CANCELLED" }),
      updateMany: vi.fn(),
    };
    prisma.calendarEvent = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({
        id: "ev-1",
        organizationId: "org-a",
        createdById: "learner-a",
        visibility: "personal",
        startsAt: new Date("2026-08-01T10:00:00Z"),
        endsAt: null,
        courseId: null,
      }),
      create: vi.fn().mockResolvedValue({ id: "ev-1" }),
      update: vi.fn().mockResolvedValue({ id: "ev-1" }),
      delete: vi.fn().mockResolvedValue({ id: "ev-1" }),
    };
    prisma.auditLog = { create: vi.fn() };

    await service.createLiveClass(managerOrg, "instructor", {
      courseId: "course-a",
      title: "Live",
      startAt: "2026-08-01T10:00:00.000Z",
      endAt: "2026-08-01T11:00:00.000Z",
      provider: "manual",
      meetingUrl: "https://meet.example/x",
    } as any);
    expect(notifications.createForCourseParticipants).toHaveBeenCalled();

    await service.getLiveClass(managerOrg, "instructor", "live-a");
    await service.updateLiveClass(managerOrg, "instructor", "live-a", {
      title: "Live 2",
    } as any);
    await service.joinLiveClass(managerOrg, "instructor", "live-a");
    await service.cancelLiveClass(managerOrg, "instructor", "live-a");

    await service.createCalendarEvent(managerOrg, "learner-a", {
      title: "Personal",
      startsAt: "2026-08-02T10:00:00.000Z",
      visibility: "personal",
    } as any);
    await service.updateCalendarEvent(managerOrg, "learner-a", "ev-1", {
      title: "Personal 2",
    } as any);
    await service.deleteCalendarEvent(managerOrg, "learner-a", "ev-1");
    expect(prisma.calendarEvent.delete).toHaveBeenCalled();
  });

  it("lists live classes and resolves discussion reports", async () => {
    const managerOrg = {
      ...org,
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    };
    const { service, prisma } = setup();
    prisma.liveClass.findMany = vi.fn().mockResolvedValue([
      {
        id: "live-a",
        title: "Soon",
        courseId: "course-a",
        status: "SCHEDULED",
        startAt: new Date(Date.now() + 10 * 60_000),
      },
    ]);
    prisma.course.findFirst = vi.fn().mockResolvedValue({ id: "course-a" });
    prisma.courseInstructor.findFirst = vi.fn().mockResolvedValue({ id: "ci" });
    prisma.enrollment.findMany = vi.fn().mockResolvedValue([]);
    await service.listLiveClasses(managerOrg, "admin", {
      courseId: "course-a",
    } as any);
    prisma.discussionReport = {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: "rep-1" }]),
      findFirst: vi.fn().mockResolvedValue({
        id: "rep-1",
        organizationId: "org-a",
        status: "OPEN",
        threadId: "thread-a",
        replyId: null,
        thread: { courseId: "course-a" },
        reply: null,
      }),
      update: vi.fn().mockResolvedValue({ id: "rep-1", status: "RESOLVED" }),
    };
    prisma.discussionThread.update = vi.fn().mockResolvedValue({ id: "thread-a" });
    await service.resolveDiscussionReport(managerOrg, "admin", "rep-1", {
      status: "RESOLVED",
      hideContent: true,
    } as any);
    expect(prisma.discussionReport.update).toHaveBeenCalled();
  });
});

