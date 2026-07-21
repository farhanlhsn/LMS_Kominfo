import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { CoursesController } from "./courses.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const coreLms = {
    listCategories: vi.fn().mockResolvedValue([{ id: "c-1", name: "Tech" }]),
    listCatalog: vi.fn().mockResolvedValue({ data: [{ id: "course-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    getCourseDetail: vi.fn().mockResolvedValue({ id: "course-1", title: "Course" }),
    getCurriculum: vi.fn().mockResolvedValue({ modules: [] }),
    enroll: vi.fn().mockResolvedValue({ id: "enr-1" }),
    ...overrides,
  };
  return { controller: new CoursesController(coreLms as any), coreLms };
}

describe("CoursesController", () => {
  it("returns the course categories for the active organization", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.listCategories(org);
    expect(coreLms.listCategories).toHaveBeenCalledWith("org-a");
    expect(response).toEqual([{ id: "c-1", name: "Tech" }]);
  });

  it("forwards pagination and search params to the catalog service", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.listCourses(org, "2", "10", "node");
    expect(coreLms.listCatalog).toHaveBeenCalledWith("org-a", { page: 2, limit: 10, search: "node" });
    expect(response).toEqual({ data: [{ id: "course-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it("uses undefined when no pagination is provided", async () => {
    const { controller, coreLms } = setup();
    await controller.listCourses(org);
    expect(coreLms.listCatalog).toHaveBeenCalledWith("org-a", { page: undefined, limit: undefined, search: undefined });
  });

  it("resolves course detail by id or slug", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.getCourse(org, "by-slug");
    expect(coreLms.getCourseDetail).toHaveBeenCalledWith("org-a", "by-slug");
    expect(response).toEqual({ id: "course-1", title: "Course" });
  });

  it("returns the course curriculum", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.getCurriculum(org, "course-1");
    expect(coreLms.getCurriculum).toHaveBeenCalledWith("org-a", "course-1");
    expect(response).toEqual({ modules: [] });
  });

  it("enrolls the current user into a course", async () => {
    const { controller, coreLms } = setup();
    const response = await controller.enroll(org, user, "course-1");
    expect(coreLms.enroll).toHaveBeenCalledWith("org-a", "u-1", "course-1");
    expect(response).toEqual({ id: "enr-1" });
  });

  it("propagates not found when the course is missing", async () => {
    const { controller, coreLms } = setup({
      getCourseDetail: vi.fn().mockRejectedValue(new NotFoundException("Course not found")),
    });
    await expect(controller.getCourse(org, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
