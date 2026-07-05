import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  it("always scopes notification lists to the active user and organization", async () => {
    const prisma = { enrollment: { findMany: vi.fn().mockResolvedValue([]) }, notification: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new NotificationService(prisma as never);
    await service.list("org-a", "user-a", false);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", userId: "user-a", readAt: undefined } }));
  });

  it("marks only the current user's tenant-scoped notification as read", async () => {
    const prisma = { notification: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findFirst: vi.fn().mockResolvedValue({ id: "n1" }) } };
    const service = new NotificationService(prisma as never);
    await service.markRead("org-a", "user-a", "n1");
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "n1", organizationId: "org-a", userId: "user-a" } }));
  });

  it("creates due reminders only from the learner's enrolled courses", async () => {
    const prisma = {
      enrollment: { findMany: vi.fn().mockResolvedValue([{ courseId: "course-a" }]) },
      liveClass: { findMany: vi.fn().mockResolvedValue([]) }, assignment: { findMany: vi.fn().mockResolvedValue([]) }, quiz: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new NotificationService(prisma as never);
    await service.refreshLearningReminders("org-a", "user-a");
    expect(prisma.assignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a", courseId: { in: ["course-a"] } }) }));
  });
});
