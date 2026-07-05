import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ActivityContentService } from "./activity-content.service";

const organization = {
  id: "org_1",
  slug: "demo",
  name: "Demo",
  memberId: "member_1",
  roleKeys: [],
  permissionKeys: [],
  isPlatformAdmin: false,
};

function createService() {
  const prisma = {
    activity: {
      findFirst: vi.fn().mockResolvedValue({
        id: "activity_1",
        organizationId: "org_1",
        courseId: "course_1",
        lessonId: "lesson_1",
      }),
      update: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    course: {
      findFirst: vi.fn(),
    },
    activityProgress: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      upsert: vi.fn().mockImplementation(({ create }) => create),
    },
    activityContent: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    contentLibraryItem: {
      findFirst: vi.fn(),
    },
  };
  const fileAccessPolicy = {
    ensureInstructorCanManageCourse: vi.fn(),
    ensureCanReadFile: vi.fn(),
  };
  const filesService = {
    signedUrl: vi.fn(),
  };
  const contentProcessing = {
    enqueue: vi.fn().mockResolvedValue({ queued: false }),
  };
  const pluginRegistry = {
    getPlugin: vi.fn().mockReturnValue({
      key: "core.text",
      name: "Text Activity",
      version: "1.0.0",
      placeholder: false,
    }),
    isEnabledForOrganization: vi.fn().mockResolvedValue(true),
  };
  const aiIndexing = { indexActivity: vi.fn().mockResolvedValue({}) };

  return {
    service: new ActivityContentService(
      prisma as never,
      fileAccessPolicy as never,
      filesService as never,
      contentProcessing as never,
      pluginRegistry as never,
      aiIndexing as never,
    ),
    prisma,
    pluginRegistry,
  };
}

describe("ActivityContentService", () => {
  it("records video progress and completes at 80 percent watched", async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });

    await expect(
      service.updateVideoProgress(organization, "learner_1", "activity_1", {
        currentTimeSeconds: 90,
        durationSeconds: 100,
      }),
    ).resolves.toMatchObject({
      status: "COMPLETED",
      progressPercent: 90,
      enrollmentId: "enrollment_1",
    });
  });

  it("blocks learning content when the user is not enrolled and course is not public", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      organizationId: "org_1",
      courseId: "course_1",
      activityContent: null,
      course: { id: "course_1" },
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.course.findFirst.mockResolvedValue(null);

    await expect(
      service.getLearningContent(organization, "learner_1", "activity_1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("marks learning content unavailable when its plugin is disabled for the organization", async () => {
    const { service, prisma, pluginRegistry } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      title: "Intro",
      organizationId: "org_1",
      courseId: "course_1",
      activityTypeKey: "core.text",
      pluginKey: null,
      pluginVersion: null,
      completionRule: {},
      activityContent: null,
      course: { id: "course_1" },
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    pluginRegistry.isEnabledForOrganization.mockResolvedValue(false);

    await expect(
      service.getLearningContent(organization, "learner_1", "activity_1"),
    ).resolves.toMatchObject({
      plugin: {
        key: "core.text",
        enabled: false,
        available: true,
        reason: "disabled",
      },
    });
  });
});
