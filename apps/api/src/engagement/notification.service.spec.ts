import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "./notification.service";

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    notificationPreference: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    notification: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "n-1", ...data }),
      ),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    enrollment: {
      findMany: vi.fn().mockResolvedValue([{ userId: "u-1" }, { userId: "u-2" }]),
    },
    liveClass: { findMany: vi.fn().mockResolvedValue([]) },
    assignment: { findMany: vi.fn().mockResolvedValue([]) },
    quiz: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
  const push = {
    sendToUser: vi.fn().mockResolvedValue({ attempted: 0, delivered: 0, failed: 0, removed: 0 }),
  };
  const email = {
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
  return { service: new NotificationService(prisma, push as any, email as any), prisma, push, email };
}

describe("NotificationService.list", () => {
  it("scopes to the active user and organization", async () => {
    const { service, prisma } = setup();
    await service.list("org-a", "user-a", false);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-a", userId: "user-a", readAt: undefined },
      }),
    );
  });

  it("creates notifications for user and course participants", async () => {
    const { service, prisma } = setup();
    await service.createForUser({
      organizationId: "org-a",
      userId: "u-1",
      type: "test",
      title: "Hi",
      body: "Body",
    });
    expect(prisma.notification.create).toHaveBeenCalled();
    await service.createForCourseParticipants(
      {
        organizationId: "org-a",
        type: "course",
        title: "T",
        body: "B",
        entityType: "course",
        entityId: "c1",
        metadata: { courseId: "course-a" },
      } as any,
      "exclude",
    );
    expect(prisma.enrollment.findMany).toHaveBeenCalled();
    prisma.notification.count = vi.fn().mockResolvedValue(2);
    await service.unreadCount("org-a", "u-1");
    await service.markAllRead("org-a", "u-1");
  });
});



describe("NotificationService.refreshLearningReminders", () => {
  it("creates live/assignment/quiz reminders for enrolled learners", async () => {
    const soon = new Date(Date.now() + 10 * 60_000);
    const later = new Date(Date.now() + 2 * 60 * 60_000);
    const { service, prisma } = setup({
      enrollment: {
        findMany: vi.fn().mockResolvedValue([{ courseId: "course-a" }]),
      },
      liveClass: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "lc-1",
            courseId: "course-a",
            title: "Live",
            startAt: soon,
          },
        ]),
      },
      assignment: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "asg-1",
            courseId: "course-a",
            title: "Essay",
            dueAt: later,
          },
        ]),
      },
      quiz: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "quiz-1",
            courseId: "course-a",
            activityId: "act-1",
            title: "Quiz",
            dueAt: later,
          },
        ]),
      },
    });
    const created = await service.refreshLearningReminders(
      "org-a",
      "user-a",
      new Date(),
    );
    expect(created.length).toBe(3);
    expect(prisma.notification.create).toHaveBeenCalledTimes(3);
  });
});

describe("NotificationService.markRead", () => {
  it("updates only the current user's tenant-scoped notification", async () => {
    const { service, prisma } = setup({
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: "n1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    });
    await service.markRead("org-a", "user-a", "n1");
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n1", organizationId: "org-a", userId: "user-a" },
      }),
    );
  });
});

describe("NotificationService.createForUser", () => {
  it("skips notification when type is muted", async () => {
    const { service, prisma } = setup({
      notificationPreference: {
        findUnique: vi.fn().mockResolvedValue({
          mutedTypes: ["announcement"],
          inAppEnabled: true,
        }),
      },
    });
    const result = await service.createForUser({
      organizationId: "org-1",
      userId: "u-1",
      type: "announcement",
      title: "Heads up",
      body: "Hello",
    });
    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("returns existing notification when duplicate within window", async () => {
    const { service, prisma } = setup({
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing" }),
        create: vi.fn(),
      },
    });
    const result = await service.createForUser({
      organizationId: "org-1",
      userId: "u-1",
      type: "course_announcement",
      title: "Heads up",
      body: "Hello",
      entityType: "course",
      entityId: "c-1",
    });
    expect(result).toEqual({ id: "existing" });
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("creates a new notification when allowed", async () => {
    const { service, prisma } = setup();
    const result = await service.createForUser({
      organizationId: "org-1",
      userId: "u-1",
      type: "course_announcement",
      title: "Heads up",
      body: "Hello",
    });
    expect(result?.id).toBe("n-1");
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});

describe("NotificationService.refreshLearningReminders", () => {
  it("fetches reminders only from enrolled courses", async () => {
    const { service, prisma } = setup({
      enrollment: {
        findMany: vi.fn().mockResolvedValue([{ courseId: "course-a" }]),
      },
    });
    await service.refreshLearningReminders("org-a", "user-a");
    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          courseId: { in: ["course-a"] },
        }),
      }),
    );
  });

  it("throttles refresh, preferences, and map prune path", async () => {
    const { service, prisma } = setup({
      enrollment: { findMany: vi.fn().mockResolvedValue([]) },
      notificationPreference: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ inAppEnabled: true }),
      },
    });
    const now = new Date();
    expect(await service.refreshLearningReminders("org-a", "u1", now)).toEqual(
      [],
    );
    expect(
      await service.refreshLearningReminders("org-a", "u1", now),
    ).toEqual([]);

    const map = (service as any).reminderRefreshAt as Map<string, number>;
    for (let i = 0; i < 5001; i++) {
      map.set(`k${i}`, now.getTime() - 5 * 60_000 - 1);
    }
    await service.refreshLearningReminders("org-b", "u2", now);
    expect(map.size).toBeLessThan(5001);

    await service.preferences("org-a", "u1");
    await service.updatePreferences("org-a", "u1", {
      inAppEnabled: false,
      emailEnabled: true,
      mutedTypes: ["x"],
    });
    expect(prisma.notificationPreference.upsert).toHaveBeenCalled();
  });
});
