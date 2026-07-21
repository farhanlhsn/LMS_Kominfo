import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  DiscussionsController,
  LiveClassesController,
  NotificationsController,
  CalendarController,
} from "./engagement.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function buildService(overrides: Record<string, any> = {}) {
  return {
    listThreads: vi.fn().mockResolvedValue([{ id: "t-1" }]),
    createThread: vi.fn().mockResolvedValue({ id: "t-1" }),
    getThread: vi.fn().mockResolvedValue({ id: "t-1", replies: [] }),
    updateThread: vi.fn().mockResolvedValue({ id: "t-1" }),
    deleteThread: vi.fn().mockResolvedValue({ deleted: true }),
    createReply: vi.fn().mockResolvedValue({ id: "r-1" }),
    updateReply: vi.fn().mockResolvedValue({ id: "r-1" }),
    deleteReply: vi.fn().mockResolvedValue({ deleted: true }),
    moderateThread: vi.fn().mockResolvedValue({ id: "t-1" }),
    moderateReply: vi.fn().mockResolvedValue({ id: "r-1" }),
    reportThread: vi.fn().mockResolvedValue({ id: "rep-1" }),
    reportReply: vi.fn().mockResolvedValue({ id: "rep-1" }),
    listDiscussionReports: vi.fn().mockResolvedValue([{ id: "rep-1" }]),
    resolveDiscussionReport: vi.fn().mockResolvedValue({ id: "rep-1" }),
    listLiveClasses: vi.fn().mockResolvedValue([{ id: "lc-1" }]),
    createLiveClass: vi.fn().mockResolvedValue({ id: "lc-1" }),
    getLiveClass: vi.fn().mockResolvedValue({ id: "lc-1" }),
    updateLiveClass: vi.fn().mockResolvedValue({ id: "lc-1" }),
    cancelLiveClass: vi.fn().mockResolvedValue({ id: "lc-1", status: "CANCELLED" }),
    joinLiveClass: vi.fn().mockResolvedValue({ meetingUrl: "https://x", provider: "zoom" }),
    calendar: vi.fn().mockResolvedValue([{ id: "ev-1" }]),
    createCalendarEvent: vi.fn().mockResolvedValue({ id: "ev-1" }),
    updateCalendarEvent: vi.fn().mockResolvedValue({ id: "ev-1" }),
    deleteCalendarEvent: vi.fn().mockResolvedValue({ deleted: true }),
    ...overrides,
  };
}

function buildNotificationService(overrides: Record<string, any> = {}) {
  return {
    list: vi.fn().mockResolvedValue([{ id: "n-1" }]),
    unreadCount: vi.fn().mockResolvedValue({ count: 3 }),
    markRead: vi.fn().mockResolvedValue({ id: "n-1", readAt: new Date() }),
    markAllRead: vi.fn().mockResolvedValue({ updated: 2 }),
    preferences: vi.fn().mockResolvedValue({ id: "p-1", inAppEnabled: true }),
    updatePreferences: vi.fn().mockResolvedValue({ id: "p-1", inAppEnabled: false }),
    ...overrides,
  };
}

describe("DiscussionsController", () => {
  it("lists, creates, gets, updates, and deletes discussion threads", async () => {
    const service = buildService();
    const controller = new DiscussionsController(service as any);

    await controller.list(org, user, { courseId: "c-1" } as any);
    expect(service.listThreads).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ courseId: "c-1" }));

    await controller.create(org, user, { courseId: "c-1", title: "T", body: "B" } as any);
    expect(service.createThread).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "T" }));

    await controller.get(org, user, "t-1");
    expect(service.getThread).toHaveBeenCalledWith(org, "u-1", "t-1");

    await controller.update(org, user, "t-1", { title: "T2" } as any);
    expect(service.updateThread).toHaveBeenCalledWith(org, "u-1", "t-1", expect.objectContaining({ title: "T2" }));

    const deleteResult = await controller.delete(org, user, "t-1");
    expect(service.deleteThread).toHaveBeenCalledWith(org, "u-1", "t-1");
    expect(deleteResult).toEqual({ deleted: true });
  });

  it("manages replies for a thread", async () => {
    const service = buildService();
    const controller = new DiscussionsController(service as any);

    await controller.reply(org, user, "t-1", { body: "Hello" } as any);
    expect(service.createReply).toHaveBeenCalledWith(org, "u-1", "t-1", expect.objectContaining({ body: "Hello" }));

    await controller.updateReply(org, user, "r-1", { body: "Edited" } as any);
    expect(service.updateReply).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ body: "Edited" }));

    await controller.deleteReply(org, user, "r-1");
    expect(service.deleteReply).toHaveBeenCalledWith(org, "u-1", "r-1");
  });

  it("moderates threads and replies", async () => {
    const service = buildService();
    const controller = new DiscussionsController(service as any);

    await controller.moderate(org, user, "t-1", { pinned: true } as any);
    expect(service.moderateThread).toHaveBeenCalledWith(org, "u-1", "t-1", expect.objectContaining({ pinned: true }));

    await controller.moderateReply(org, user, "r-1", { status: "HIDDEN" } as any);
    expect(service.moderateReply).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ status: "HIDDEN" }));
  });

  it("reports threads and replies and resolves reports", async () => {
    const service = buildService();
    const controller = new DiscussionsController(service as any);

    await controller.reportThread(org, user, "t-1", { reason: "spam" } as any);
    expect(service.reportThread).toHaveBeenCalledWith(org, "u-1", "t-1", expect.objectContaining({ reason: "spam" }));

    await controller.reportReply(org, user, "r-1", { reason: "spam" } as any);
    expect(service.reportReply).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ reason: "spam" }));

    await controller.reports(org, user, "c-1");
    expect(service.listDiscussionReports).toHaveBeenCalledWith(org, "u-1", "c-1");

    await controller.resolveReport(org, user, "rep-1", { status: "RESOLVED" } as any);
    expect(service.resolveDiscussionReport).toHaveBeenCalledWith(org, "u-1", "rep-1", expect.objectContaining({ status: "RESOLVED" }));
  });

  it("propagates forbidden exceptions when editing a thread", async () => {
    const service = buildService({
      updateThread: vi.fn().mockRejectedValue(new ForbiddenException("You cannot edit this thread")),
    });
    const controller = new DiscussionsController(service as any);
    await expect(controller.update(org, user, "t-1", { title: "X" } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("LiveClassesController", () => {
  it("returns the provider capabilities", () => {
    const service = buildService();
    const providers = { capabilities: vi.fn().mockReturnValue({ zoom: { join: true } }) };
    const controller = new LiveClassesController(service as any, providers as any);
    expect(controller.providerCapabilities()).toEqual({ zoom: { join: true } });
    expect(providers.capabilities).toHaveBeenCalled();
  });

  it("forwards list, create, get, update, cancel, and join", async () => {
    const service = buildService();
    const providers = { capabilities: vi.fn().mockReturnValue({}) };
    const controller = new LiveClassesController(service as any, providers as any);

    await controller.list(org, user, { courseId: "c-1" } as any);
    expect(service.listLiveClasses).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ courseId: "c-1" }));

    await controller.create(org, user, { courseId: "c-1", title: "Session", startAt: "2026-01-01T00:00:00Z", endAt: "2026-01-01T01:00:00Z" } as any);
    expect(service.createLiveClass).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "Session" }));

    await controller.get(org, user, "lc-1");
    expect(service.getLiveClass).toHaveBeenCalledWith(org, "u-1", "lc-1");

    await controller.update(org, user, "lc-1", { title: "Session 2" } as any);
    expect(service.updateLiveClass).toHaveBeenCalledWith(org, "u-1", "lc-1", expect.objectContaining({ title: "Session 2" }));

    await controller.cancel(org, user, "lc-1");
    expect(service.cancelLiveClass).toHaveBeenCalledWith(org, "u-1", "lc-1");

    const joinResult = await controller.join(org, user, "lc-1");
    expect(service.joinLiveClass).toHaveBeenCalledWith(org, "u-1", "lc-1");
    expect(joinResult).toEqual({ meetingUrl: "https://x", provider: "zoom" });
  });

  it("propagates not found when the live class is missing", async () => {
    const service = buildService({
      getLiveClass: vi.fn().mockRejectedValue(new NotFoundException("Live class not found")),
    });
    const providers = { capabilities: vi.fn().mockReturnValue({}) };
    const controller = new LiveClassesController(service as any, providers as any);
    await expect(controller.get(org, user, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("NotificationsController", () => {
  it("lists notifications with the query and supports the unread count", async () => {
    const notifications = buildNotificationService();
    const controller = new NotificationsController(notifications as any);

    await controller.list(org, user, { unreadOnly: true } as any);
    expect(notifications.list).toHaveBeenCalledWith("org-a", "u-1", true);

    const unread = await controller.unread(org, user);
    expect(notifications.unreadCount).toHaveBeenCalledWith("org-a", "u-1");
    expect(unread).toEqual({ count: 3 });
  });

  it("marks individual and all notifications as read", async () => {
    const notifications = buildNotificationService();
    const controller = new NotificationsController(notifications as any);

    await controller.read(org, user, "n-1");
    expect(notifications.markRead).toHaveBeenCalledWith("org-a", "u-1", "n-1");

    const all = await controller.readAll(org, user);
    expect(notifications.markAllRead).toHaveBeenCalledWith("org-a", "u-1");
    expect(all).toEqual({ updated: 2 });
  });

  it("returns and updates notification preferences", async () => {
    const notifications = buildNotificationService();
    const controller = new NotificationsController(notifications as any);

    await controller.preferences(org, user);
    expect(notifications.preferences).toHaveBeenCalledWith("org-a", "u-1");

    await controller.updatePreferences(org, user, { inAppEnabled: false } as any);
    expect(notifications.updatePreferences).toHaveBeenCalledWith("org-a", "u-1", expect.objectContaining({ inAppEnabled: false }));
  });
});

describe("CalendarController", () => {
  it("returns calendar events and manages custom events", async () => {
    const service = buildService();
    const controller = new CalendarController(service as any);

    await controller.events(org, user, { from: "2026-01-01", to: "2026-01-31" } as any);
    expect(service.calendar).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ from: "2026-01-01" }));

    await controller.create(org, user, { title: "Live Q&A", startsAt: "2026-02-01T10:00:00Z" } as any);
    expect(service.createCalendarEvent).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "Live Q&A" }));

    await controller.update(org, user, "ev-1", { title: "Live Q&A 2" } as any);
    expect(service.updateCalendarEvent).toHaveBeenCalledWith(org, "u-1", "ev-1", expect.objectContaining({ title: "Live Q&A 2" }));

    const deleteResult = await controller.delete(org, user, "ev-1");
    expect(service.deleteCalendarEvent).toHaveBeenCalledWith(org, "u-1", "ev-1");
    expect(deleteResult).toEqual({ deleted: true });
  });
});
