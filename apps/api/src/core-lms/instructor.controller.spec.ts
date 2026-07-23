import { ForbiddenException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { InstructorController } from "./instructor.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: ["courses:update"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const coreLms = {
    listInstructorCourses: vi.fn().mockResolvedValue([{ id: "c-1" }]),
    getInstructorCourse: vi.fn().mockResolvedValue({ id: "c-1", modules: [] }),
    createCourse: vi.fn().mockResolvedValue({ id: "c-new" }),
    updateCourse: vi.fn().mockResolvedValue({ id: "c-1" }),
    deleteCourse: vi.fn().mockResolvedValue({ id: "c-1" }),
    publishCourse: vi.fn().mockResolvedValue({ id: "c-1", status: "PUBLISHED" }),
    archiveCourse: vi.fn().mockResolvedValue({ id: "c-1", status: "ARCHIVED" }),
    duplicateCourse: vi.fn().mockResolvedValue({ id: "c-copy" }),
    createModule: vi.fn().mockResolvedValue({ id: "m-1" }),
    updateModule: vi.fn().mockResolvedValue({ id: "m-1" }),
    deleteModule: vi.fn().mockResolvedValue({ id: "m-1" }),
    reorderModules: vi.fn().mockResolvedValue({ modules: [] }),
    createLesson: vi.fn().mockResolvedValue({ id: "l-1" }),
    updateLesson: vi.fn().mockResolvedValue({ id: "l-1" }),
    deleteLesson: vi.fn().mockResolvedValue({ id: "l-1" }),
    reorderLessons: vi.fn().mockResolvedValue({ modules: [] }),
    createActivity: vi.fn().mockResolvedValue({ id: "a-1" }),
    updateActivity: vi.fn().mockResolvedValue({ id: "a-1" }),
    deleteActivity: vi.fn().mockResolvedValue({ id: "a-1" }),
    reorderActivities: vi.fn().mockResolvedValue({ modules: [] }),
    ...overrides,
  };
  return { controller: new InstructorController(coreLms as any), coreLms };
}

describe("InstructorController", () => {
  it("lists instructor courses with the user id and platform flag", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.listCourses(org, user);
    expect(coreLms.listInstructorCourses).toHaveBeenCalledWith("org-a", "u-1", false);
    expect(response).toEqual([{ id: "c-1" }]);
  });

  it("forwards the full organization context when fetching a course", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.getCourse(org, user, "c-1");
    expect(coreLms.getInstructorCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ id: "c-1", modules: [] });
  });

  it("creates a new course for the instructor", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.createCourse(org, user, { title: "New" } as any);
    expect(coreLms.createCourse).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "New" }));
    expect(response).toEqual({ id: "c-new" });
  });

  it("updates and deletes a course with the dto payload", async () => {
    const { controller, coreLms } = setup();
    await controller.updateCourse(org, user, "c-1", { title: "Updated" } as any);
    expect(coreLms.updateCourse).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ title: "Updated" }));
    await controller.deleteCourse(org, user, "c-1");
    expect(coreLms.deleteCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
  });

  it("publishes, archives, and duplicates courses", async () => {
    const { controller, coreLms } = setup();
    await controller.publishCourse(org, user, "c-1");
    expect(coreLms.publishCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
    await controller.archiveCourse(org, user, "c-1");
    expect(coreLms.archiveCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
    await controller.duplicateCourse(org, user, "c-1");
    expect(coreLms.duplicateCourse).toHaveBeenCalledWith(org, "u-1", "c-1");
  });

  it("manages modules: create, update, delete, reorder", async () => {
    const { controller, coreLms } = setup();
    await controller.createModule(org, user, "c-1", { title: "M" } as any);
    expect(coreLms.createModule).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ title: "M" }));
    await controller.updateModule(org, user, "m-1", { title: "M2" } as any);
    expect(coreLms.updateModule).toHaveBeenCalledWith(org, "u-1", "m-1", expect.objectContaining({ title: "M2" }));
    await controller.deleteModule(org, user, "m-1");
    expect(coreLms.deleteModule).toHaveBeenCalledWith(org, "u-1", "m-1");
    await controller.reorderModules(org, user, "c-1", { ids: ["m-1"] } as any);
    expect(coreLms.reorderModules).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ ids: ["m-1"] }));
  });

  it("manages lessons under a module", async () => {
    const { controller, coreLms } = setup();
    await controller.createLesson(org, user, "m-1", { title: "L" } as any);
    expect(coreLms.createLesson).toHaveBeenCalledWith(org, "u-1", "m-1", expect.objectContaining({ title: "L" }));
    await controller.updateLesson(org, user, "l-1", { title: "L2" } as any);
    expect(coreLms.updateLesson).toHaveBeenCalledWith(org, "u-1", "l-1", expect.objectContaining({ title: "L2" }));
    await controller.deleteLesson(org, user, "l-1");
    expect(coreLms.deleteLesson).toHaveBeenCalledWith(org, "u-1", "l-1");
    await controller.reorderLessons(org, user, "m-1", { ids: ["l-1"] } as any);
    expect(coreLms.reorderLessons).toHaveBeenCalledWith(org, "u-1", "m-1", expect.objectContaining({ ids: ["l-1"] }));
  });

  it("manages activities under a lesson", async () => {
    const { controller, coreLms } = setup();
    await controller.createActivity(org, user, "l-1", { title: "A" } as any);
    expect(coreLms.createActivity).toHaveBeenCalledWith(org, "u-1", "l-1", expect.objectContaining({ title: "A" }));
    await controller.updateActivity(org, user, "a-1", { title: "A2" } as any);
    expect(coreLms.updateActivity).toHaveBeenCalledWith(org, "u-1", "a-1", expect.objectContaining({ title: "A2" }));
    await controller.deleteActivity(org, user, "a-1");
    expect(coreLms.deleteActivity).toHaveBeenCalledWith(org, "u-1", "a-1");
    await controller.reorderActivities(org, user, "l-1", { ids: ["a-1"] } as any);
    expect(coreLms.reorderActivities).toHaveBeenCalledWith(org, "u-1", "l-1", expect.objectContaining({ ids: ["a-1"] }));
  });

  it("propagates forbidden exceptions raised by the service", async () => {
    const { controller } = setup({
      createCourse: vi.fn().mockRejectedValue(new ForbiddenException("Insufficient course permissions")),
    });
    await expect(controller.createCourse(org, user, { title: "X" } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
