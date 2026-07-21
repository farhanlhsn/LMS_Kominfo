import { describe, expect, it, vi } from "vitest";
import {
  calculateCourseProgress,
  recalculateEnrollment,
} from "./course-progress";

describe("course-progress", () => {
  it("returns zero when no required activities", async () => {
    const prisma = {
      activity: { findMany: vi.fn().mockResolvedValue([]) },
      activityProgress: { count: vi.fn() },
    };
    await expect(
      calculateCourseProgress(prisma as never, "o", "u", "c"),
    ).resolves.toEqual({
      progressPercent: 0,
      completedRequired: 0,
      requiredTotal: 0,
    });
    expect(prisma.activityProgress.count).not.toHaveBeenCalled();
  });

  it("computes percent from completed required activities", async () => {
    const prisma = {
      activity: {
        findMany: vi.fn().mockResolvedValue([{ id: "a1" }, { id: "a2" }]),
      },
      activityProgress: { count: vi.fn().mockResolvedValue(1) },
    };
    await expect(
      calculateCourseProgress(prisma as never, "o", "u", "c"),
    ).resolves.toEqual({
      progressPercent: 50,
      completedRequired: 1,
      requiredTotal: 2,
    });
  });

  it("writes COMPLETED enrollment at 100%", async () => {
    const update = vi.fn();
    const prisma = {
      activity: {
        findMany: vi.fn().mockResolvedValue([{ id: "a1" }]),
      },
      activityProgress: { count: vi.fn().mockResolvedValue(1) },
      enrollment: { update },
    };
    await recalculateEnrollment(prisma as never, "o", "u", "c");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          progressPercent: 100,
        }),
      }),
    );
  });
});
