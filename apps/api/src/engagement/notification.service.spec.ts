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
  return { service: new NotificationService(prisma), prisma };
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
});
