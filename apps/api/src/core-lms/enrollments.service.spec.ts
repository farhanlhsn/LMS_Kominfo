import { describe, expect, it, vi } from "vitest";
import { CoreLmsService } from "./core-lms.service";
import { NotFoundException } from "@nestjs/common";

const organizationId = "org-1";
const userId = "user-1";

function setupEnrollment(overrides: Record<string, any> = {}) {
  const published = { id: "c1", organizationId, status: "PUBLISHED", deletedAt: null, maxEnrollments: null };
  const prisma = {
    course: {
      findFirst: vi.fn().mockResolvedValue(published),
      findUnique: vi.fn().mockResolvedValue(published),
    },
    enrollment: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue({ id: "enr-1", courseId: "c1", userId, status: "ACTIVE" }),
    },
    learningEvent: { create: vi.fn().mockResolvedValue(undefined) },
    user: { update: vi.fn().mockResolvedValue(undefined) },
    courseCategory: { findMany: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Default" }]) },
    ...overrides,
  };
  return { service: new CoreLmsService(prisma as never), prisma };
}

describe("CoreLmsService", () => {
  it("lists categories scoped to organization", async () => {
    const { service, prisma } = setupEnrollment();
    const result = await service.listCategories(organizationId);
    expect(prisma.courseCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId } })
    );
    expect(result).toEqual([{ id: "cat-1", name: "Default" }]);
  });

  it("enrolls a user into a published course", async () => {
    const { service, prisma } = setupEnrollment();
    const result = await service.enroll(organizationId, userId, "c1");
    expect(prisma.enrollment.upsert).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "enr-1", courseId: "c1", status: "ACTIVE" });
  });

  it("rejects enrollment when course is missing", async () => {
    const { service } = setupEnrollment({
      course: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(service.enroll(organizationId, userId, "missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("updates existing enrollment when already enrolled", async () => {
    const { service, prisma } = setupEnrollment({
      enrollment: {
        upsert: vi.fn().mockResolvedValue({ id: "enr-2", courseId: "c1", userId, status: "ACTIVE" }),
      },
    });
    const result = await service.enroll(organizationId, userId, "c1");
    expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId_courseId_userId: { organizationId, courseId: "c1", userId } } })
    );
    expect(result).toMatchObject({ id: "enr-2" });
  });
});
