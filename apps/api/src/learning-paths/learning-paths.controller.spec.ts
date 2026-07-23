import { BadRequestException,NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { LearningPathsController } from "./learning-paths.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "user-1", email: "u@e.c", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    create: vi.fn().mockResolvedValue({ id: "lp-1" }),
    findAll: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    findOne: vi.fn().mockImplementation(async (_org, id) => ({ id, title: "Path", courses: [] })),
    update: vi.fn().mockResolvedValue({ id: "lp-1" }),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    addCourse: vi.fn().mockImplementation(async () => ({ id: "lpc-1" })),
    removeCourse: vi.fn().mockResolvedValue({ deleted: true }),
    reorderCourses: vi.fn().mockImplementation(async () => []),
    enroll: vi.fn().mockResolvedValue({ id: "lpe-1" }),
    getEnrollments: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return { controller: new LearningPathsController(service as any), service };
}

function createRequest() {
  return { organization: org, user } as any;
}

describe("LearningPathsController", () => {
  it("wraps create response in { data }", async () => {
    const { controller, service } = setup();
    const response = await controller.create(createRequest(), { title: "Path" } as any);
    expect(response).toEqual({ data: { id: "lp-1" } });
    expect(service.create).toHaveBeenCalledWith(org, expect.objectContaining({ title: "Path" }));
  });

  it("forwards findAll directly with org and query", async () => {
    const { controller, service } = setup();
    const response = await controller.findAll(createRequest(), { page: 2 } as any);
    expect(service.findAll).toHaveBeenCalledWith(org, expect.objectContaining({ page: 2 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("resolves paths by id or slug", async () => {
    const { controller, service } = setup();
    const response = await controller.findOne(createRequest(), "by-slug");
    expect(service.findOne).toHaveBeenCalledWith(org, "by-slug");
    expect(response).toEqual({ data: { id: "by-slug", title: "Path", courses: [] } });
  });

  it("propagates not found when path is missing", async () => {
    const { controller } = setup({
      findOne: vi.fn().mockRejectedValue(new NotFoundException("Path not found")),
    });
    await expect(controller.findOne(createRequest(), "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects adding duplicate course to path", async () => {
    const { controller } = setup({
      addCourse: vi.fn().mockRejectedValue(new BadRequestException("Course already in this learning path")),
    });
    await expect(controller.addCourse(createRequest(), "lp-1", { courseId: "c-1" } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enrolls using the current user id", async () => {
    const { controller, service } = setup();
    const response = await controller.enroll(createRequest(), "lp-1");
    expect(service.enroll).toHaveBeenCalledWith(org, "user-1", "lp-1");
    expect(response).toEqual({ data: { id: "lpe-1" } });
  });

  it("returns my enrollments wrapped in { data }", async () => {
    const { controller, service } = setup();
    const response = await controller.myEnrollments(createRequest());
    expect(service.getEnrollments).toHaveBeenCalledWith(org, "user-1");
    expect(response).toEqual({ data: [] });
  });

  it("updates deletes reorders and removes courses", async () => {
    const { controller, service } = setup();
    const req = createRequest();
    await controller.update(req, "lp-1", { title: "X" } as any);
    await controller.delete(req, "lp-1");
    await controller.addCourse(req, "lp-1", { courseId: "c1" } as any);
    await controller.removeCourse(req, "lp-1", "c1");
    await controller.reorderCourses(req, "lp-1", { courseIds: ["c1"] });
    expect(service.update).toHaveBeenCalled();
    expect(service.reorderCourses).toHaveBeenCalledWith(org, "lp-1", ["c1"]);
  });
});
