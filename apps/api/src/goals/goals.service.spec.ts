import { describe, expect, it, vi } from "vitest";
import { GoalsService } from "./goals.service";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    learningGoal: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "goal-1", ...data, status: data.status ?? "ACTIVE" })),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "goal-1", ...data })),
    },
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({ progressPercent: 0, status: "ACTIVE" }),
      findFirst: vi.fn().mockResolvedValue({ progressPercent: 0, status: "ACTIVE" }),
    },
    ...overrides,
  } as any;
  return { service: new GoalsService(prisma), prisma };
}

describe("GoalsService", () => {
  it("creates a learning goal tied to the user and org", async () => {
    const { service, prisma } = setup();
    const result = await service.create("org-1", "user-1", { title: "Master React" } as any);
    expect(prisma.learningGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", userId: "user-1", title: "Master React" }) })
    );
    expect(result.id).toBe("goal-1");
  });

  it("rejects creation when course is not enrolled", async () => {
    const { service, prisma } = setup({
      enrollment: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(
      service.create("org-1", "user-1", { title: "X", courseId: "c1" } as any)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.learningGoal.create).not.toHaveBeenCalled();
  });

  it("rejects updates for goals owned by another user", async () => {
    const { service, prisma } = setup();
    prisma.learningGoal.findFirst.mockResolvedValue(null);
    await expect(
      service.update("org-1", "user-1", "goal-1", { title: "New" } as any)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("completes a goal with 100% progress", async () => {
    const { service, prisma } = setup();
    prisma.learningGoal.findFirst.mockResolvedValue({ id: "goal-1", organizationId: "org-1", userId: "user-1" });
    const result = await service.complete("org-1", "user-1", "goal-1");
    expect(prisma.learningGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED", progressValue: { percent: 100 } }) })
    );
    expect(result.id).toBe("goal-1");
  });

  it("marks goal as completed when course progress reaches 100%", async () => {
    const { service, prisma } = setup({
      learningGoal: {
        findMany: vi.fn().mockResolvedValue([{ id: "goal-1", organizationId: "org-1", userId: "user-1", courseId: "c1" }]),
        update: vi.fn().mockResolvedValue({ id: "goal-1", status: "COMPLETED" }),
      },
      enrollment: { findUnique: vi.fn().mockResolvedValue({ progressPercent: 100, status: "ACTIVE" }) },
    });
    await service.updateGoalProgressForCourse("org-1", "user-1", "c1");
    expect(prisma.learningGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", progressValue: { percent: 100 } }),
      })
    );
  });

  it("lists, updates, and cancels owned goals", async () => {
    const { service, prisma } = setup();
    prisma.learningGoal.findMany.mockResolvedValue([
      {
        id: "goal-1",
        organizationId: "org-1",
        userId: "user-1",
        courseId: "c1",
        targetType: "COURSE_COMPLETION",
        status: "ACTIVE",
        progressValue: { percent: 0 },
      },
    ]);
    prisma.learningGoal.findFirst.mockResolvedValue({
      id: "goal-1",
      organizationId: "org-1",
      userId: "user-1",
      courseId: "c1",
      targetType: "COURSE_COMPLETION",
      status: "ACTIVE",
    });
    prisma.learningGoal.findUnique.mockResolvedValue({
      id: "goal-1",
      organizationId: "org-1",
      userId: "user-1",
      courseId: "c1",
      progressValue: { percent: 0 },
    });
    prisma.enrollment.findFirst.mockResolvedValue({
      progressPercent: 40,
      status: "ACTIVE",
    });
    await service.list("org-1", "user-1");
    await service.update("org-1", "user-1", "goal-1", {
      title: "Updated",
    } as any);
    await service.delete("org-1", "user-1", "goal-1");
    expect(prisma.learningGoal.update).toHaveBeenCalled();
  });
});
