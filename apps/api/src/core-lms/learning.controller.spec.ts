import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { LearningController } from "./learning.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const coreLms = {
    myEnrollments: vi.fn().mockResolvedValue([{ id: "enr-1" }]),
    courseProgress: vi.fn().mockResolvedValue({ progressPercent: 50 }),
    learnCourse: vi.fn().mockResolvedValue({ enrollment: { id: "enr-1" }, curriculum: {}, progress: {} }),
    learnLesson: vi.fn().mockResolvedValue({ id: "l-1", activities: [] }),
    startActivity: vi.fn().mockResolvedValue({ id: "ap-1", status: "IN_PROGRESS" }),
    completeActivity: vi.fn().mockResolvedValue({ activityProgress: { id: "ap-1" }, courseProgress: { progressPercent: 100 } }),
    updateActivityProgress: vi.fn().mockResolvedValue({ id: "ap-1", progressPercent: 50 }),
    ...overrides,
  };
  return { controller: new LearningController(coreLms as any), coreLms };
}

describe("LearningController", () => {
  it("returns the learner's enrollments", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.myEnrollments(org, user);
    expect(coreLms.myEnrollments).toHaveBeenCalledWith("org-a", "u-1");
    expect(response).toEqual([{ id: "enr-1" }]);
  });

  it("returns the learner's progress for a specific course", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.courseProgress(org, user, "course-1");
    expect(coreLms.courseProgress).toHaveBeenCalledWith("org-a", "u-1", "course-1");
    expect(response).toEqual({ progressPercent: 50 });
  });

  it("builds the course workspace payload", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.learnCourse(org, user, "course-1");
    expect(coreLms.learnCourse).toHaveBeenCalledWith("org-a", "u-1", "course-1");
    expect(response).toEqual({ enrollment: { id: "enr-1" }, curriculum: {}, progress: {} });
  });

  it("returns the learnable lesson payload", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.learnLesson(org, user, "lesson-1");
    expect(coreLms.learnLesson).toHaveBeenCalledWith("org-a", "u-1", "lesson-1");
    expect(response).toEqual({ id: "l-1", activities: [] });
  });

  it("starts an activity and returns the progress record", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.startActivity(org, user, "activity-1");
    expect(coreLms.startActivity).toHaveBeenCalledWith("org-a", "u-1", "activity-1");
    expect(response).toEqual({ id: "ap-1", status: "IN_PROGRESS" });
  });

  it("completes an activity and returns progress + course progress", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.completeActivity(org, user, "activity-1");
    expect(coreLms.completeActivity).toHaveBeenCalledWith("org-a", "u-1", "activity-1");
    expect(response).toMatchObject({ activityProgress: { id: "ap-1" }, courseProgress: { progressPercent: 100 } });
  });

  it("forwards the progress DTO when updating activity progress", async () => {
    const { controller, coreLms } = setup();
    const dto = { progressPercent: 50, metadata: { foo: "bar" } } as any;
    const response = await controller.updateProgress(org, user, "activity-1", dto);
    expect(coreLms.updateActivityProgress).toHaveBeenCalledWith("org-a", "u-1", "activity-1", dto);
    expect(response).toEqual({ id: "ap-1", progressPercent: 50 });
  });

  it("propagates not found when the lesson is missing", async () => {
    const { controller, coreLms } = setup({
      learnLesson: vi.fn().mockRejectedValue(new NotFoundException("Lesson not found")),
    });
    await expect(controller.learnLesson(org, user, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
