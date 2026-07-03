import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CoreLmsService } from "./core-lms.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";

function createPrismaMock() {
  return {
    courseCategory: { findMany: vi.fn() },
    course: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    courseInstructor: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    courseModule: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    lesson: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    activity: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    activityProgress: {
      count: vi.fn(),
      upsert: vi.fn(),
    },
    activityContent: { create: vi.fn() },
    enrollment: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    learningEvent: { create: vi.fn() },
  };
}

function createService() {
  const prisma = createPrismaMock();
  return {
    prisma,
    service: new CoreLmsService(prisma as never),
  };
}

function orgContext(
  overrides: Partial<OrganizationContext> = {},
): OrganizationContext {
  return {
    id: "org-1",
    slug: "demo",
    name: "Demo",
    memberId: "member-1",
    roleKeys: ["learner"],
    permissionKeys: [],
    isPlatformAdmin: false,
    ...overrides,
  };
}

describe("CoreLmsService", () => {
  it("lists catalog courses inside the active tenant only", async () => {
    const { prisma, service } = createService();
    prisma.course.findMany.mockResolvedValue([]);
    prisma.course.count.mockResolvedValue(0);

    await service.listCatalog("org-1", { page: 1, limit: 10, search: "web" });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: "PUBLISHED",
          deletedAt: null,
        }),
        take: 10,
      }),
    );
    expect(prisma.course.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    );
  });

  it("blocks learners from updating courses they do not manage", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
    });
    prisma.courseInstructor.findFirst.mockResolvedValue(null);

    await expect(
      service.updateCourse(orgContext(), "learner-1", "course-1", {
        title: "Updated title",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it("completes an activity and recalculates course progress", async () => {
    const { prisma, service } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      organizationId: "org-1",
      courseId: "course-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
    });
    prisma.activityProgress.upsert.mockResolvedValue({
      id: "progress-1",
      status: "COMPLETED",
      progressPercent: 100,
    });
    prisma.activity.findMany.mockResolvedValue([
      { id: "activity-1" },
      { id: "activity-2" },
    ]);
    prisma.activityProgress.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.enrollment.update.mockResolvedValue({});
    prisma.learningEvent.create.mockResolvedValue({});

    const result = await service.completeActivity(
      "org-1",
      "learner-1",
      "activity-1",
    );

    expect(prisma.activityProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_userId_activityId: {
            organizationId: "org-1",
            userId: "learner-1",
            activityId: "activity-1",
          },
        },
        update: expect.objectContaining({
          status: "COMPLETED",
          progressPercent: 100,
        }),
      }),
    );
    expect(prisma.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progressPercent: 50 }),
      }),
    );
    expect(result).toMatchObject({
      courseProgress: {
        progressPercent: 50,
        completedRequired: 1,
        requiredTotal: 2,
      },
    });
  });
});
