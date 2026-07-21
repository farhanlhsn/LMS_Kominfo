import { NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LearningPathsService } from "./learning-paths.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    learningPath: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue({ id: "path-a", organizationId: "org-a", title: "Full Stack", slug: "full-stack", courses: [], _count: { enrollments: 0, courses: 0 } }), create: vi.fn().mockResolvedValue({ id: "path-a" }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(1), update: vi.fn(), delete: vi.fn() },
    learningPathCourse: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "lpc-a" }), updateMany: vi.fn(), delete: vi.fn() },
    learningPathEnrollment: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "enr-path" }), update: vi.fn() },
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a", deletedAt: null }), findMany: vi.fn().mockResolvedValue([{ id: "course-a" }]) },
    enrollment: { findMany: vi.fn().mockResolvedValue([{ id: "e1", status: "COMPLETED" }]) },
    ...overrides,
  };
  return { service: new LearningPathsService(prisma as never), prisma };
}

describe("LearningPathsService", () => {
  describe("create", () => {
    it("creates a learning path with slugified title", async () => {
      const { service, prisma } = setup();
      prisma.learningPath.create = vi.fn().mockResolvedValue({ id: "path-a", title: "New Path", slug: "new-path" });
      const result = await service.create(org, { title: "New Path" });
      expect(prisma.learningPath.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "New Path", slug: "new-path" }) }));
    });

    it("rejects duplicate title", async () => {
      const { service, prisma } = setup({ learningPath: { findUnique: vi.fn().mockResolvedValue({ id: "existing" }) } });
      await expect(service.create(org, { title: "Existing" })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("finds by id or slug", async () => {
      const { service, prisma } = setup();
      await service.findOne(org, "path-a");
      expect(prisma.learningPath.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a" }) }));
    });

    it("rejects cross-tenant", async () => {
      const { service, prisma } = setup({ learningPath: { findFirst: vi.fn().mockResolvedValue(null) } });
      await expect(service.findOne(org, "path-org-b")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("enroll", () => {
    it("creates enrollment and increments count", async () => {
      const { service, prisma } = setup();
      prisma.learningPath.update = vi.fn();
      await service.enroll(org, "user-a", "path-a");
      expect(prisma.learningPathEnrollment.create).toHaveBeenCalledWith({ data: { organizationId: "org-a", learningPathId: "path-a", userId: "user-a" } });
    });
  });

  describe("updateProgress", () => {
    it("calculates progress from completed courses", async () => {
      const { service, prisma } = setup();
      prisma.learningPath.findFirst = vi.fn().mockResolvedValue({ id: "path-a", organizationId: "org-a", courses: [{ courseId: "c1" }, { courseId: "c2" }], _count: { enrollments: 0 } });
      prisma.learningPathEnrollment.update = vi.fn();
      await service.updateProgress(org, "user-a", "path-a");
      expect(prisma.learningPathEnrollment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ progressPercent: 50 }) }));
    });
  });

  describe("update delete courses enrollments", () => {
    it("lists updates deletes and manages courses", async () => {
      const { service, prisma } = setup();
      prisma.learningPath.findMany = vi.fn().mockResolvedValue([{ id: "path-a" }]);
      prisma.learningPath.count = vi.fn().mockResolvedValue(1);
      const listed = await service.findAll(org, {} as any);
      expect(listed.data ?? listed).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "path-a" })]),
      );

      prisma.learningPath.update = vi.fn().mockResolvedValue({ id: "path-a", title: "X" });
      await service.update(org, "path-a", { title: "X" } as any);

      prisma.learningPath.delete = vi.fn().mockResolvedValue({ id: "path-a" });
      await service.delete(org, "path-a");

      prisma.course.findFirst = vi.fn().mockResolvedValue({
        id: "course-a",
        organizationId: "org-a",
        deletedAt: null,
      });
      prisma.learningPathCourse.create = vi
        .fn()
        .mockResolvedValue({ id: "lpc-a" });
      await service.addCourse(org, "path-a", { courseId: "course-a" } as any);

      prisma.learningPathCourse.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "lpc-a", courseId: "course-a" }]);
      prisma.learningPathCourse.updateMany = vi.fn();
      await service.reorderCourses(org, "path-a", ["course-a"]);

      prisma.learningPathCourse.findUnique = vi
        .fn()
        .mockResolvedValue({ id: "lpc-a", courseId: "course-a" });
      prisma.learningPathCourse.delete = vi.fn();
      await service.removeCourse(org, "path-a", "course-a");

      prisma.learningPathEnrollment.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "enr" }]);
      expect(await service.getEnrollments(org, "user-a")).toEqual([
        { id: "enr" },
      ]);
    });
  });
});

