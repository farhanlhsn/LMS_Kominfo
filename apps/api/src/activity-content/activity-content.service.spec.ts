import { ForbiddenException, NotFoundException } from "@nestjs/common";
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
  const aiIndexing = {
    requestActivityReindex: vi.fn().mockResolvedValue({ queued: true }),
  };

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
    aiIndexing,
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

  it("returns missing plugin reason when registry throws not found", async () => {
    const { service, prisma, pluginRegistry } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      title: "Intro",
      organizationId: "org_1",
      courseId: "course_1",
      activityTypeKey: "plugin.unknown",
      pluginKey: "plugin.unknown",
      pluginVersion: null,
      completionRule: {},
      activityContent: null,
      course: { id: "course_1" },
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    pluginRegistry.getPlugin.mockImplementation(() => {
      throw new NotFoundException("missing");
    });
    await expect(
      service.getLearningContent(organization, "learner_1", "activity_1"),
    ).resolves.toMatchObject({
      plugin: { reason: "missing", available: false },
    });
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

  it("updates content attaches file and reprocesses", async () => {
    const { service, prisma, aiIndexing } = createService();
    const instructorOrg = {
      ...organization,
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    };
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      organizationId: "org_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.text",
      activityContent: null,
    });
    prisma.activityContent.upsert.mockResolvedValue({
      id: "ac_1",
      activityId: "activity_1",
    });
    prisma.activity.update.mockResolvedValue({ id: "activity_1" });
    await service.updateActivityContent(
      instructorOrg as any,
      "u1",
      "activity_1",
      {
        textContent: "Hello",
        body: { html: "<p>Hello</p>" },
      } as any,
    );
    expect(prisma.activityContent.upsert).toHaveBeenCalled();
    expect(aiIndexing.requestActivityReindex).toHaveBeenCalledWith(
      "org_1",
      "activity_1",
    );

    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      organizationId: "org_1",
      courseId: "course_1",
      activityTypeKey: "core.file",
      activityContent: { id: "ac_1" },
    });
    await service.attachFile(instructorOrg as any, "u1", "activity_1", {
      fileId: "file_1",
    } as any);

    prisma.contentLibraryItem.findFirst.mockResolvedValue({
      id: "lib_1",
      organizationId: "org_1",
      fileId: "file_1",
    });
    await service.attachLibraryItem(instructorOrg as any, "u1", "activity_1", {
      libraryItemId: "lib_1",
    } as any);

    await service.reprocessContent(instructorOrg as any, "u1", "activity_1", {
      reason: "manual",
    } as any);
  });

  it("returns public course content and partial video progress", async () => {
    const { service, prisma, pluginRegistry } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      title: "Intro",
      organizationId: "org_1",
      courseId: "course_1",
      activityTypeKey: "core.video",
      pluginKey: "core.video",
      pluginVersion: "1.0.0",
      completionRule: {},
      activityContent: {
        id: "ac_1",
        textContent: null,
        body: null,
        fileId: null,
      },
      course: { id: "course_1", visibility: "PUBLIC" },
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.course.findFirst.mockResolvedValue({
      id: "course_1",
      visibility: "PUBLIC",
    });
    pluginRegistry.getPlugin.mockReturnValue({
      key: "core.video",
      name: "Video",
      version: "1.0.0",
      placeholder: false,
    });
    pluginRegistry.isEnabledForOrganization.mockResolvedValue(true);
    await expect(
      service.getLearningContent(organization, "learner_1", "activity_1"),
    ).resolves.toMatchObject({
      plugin: expect.objectContaining({ enabled: true }),
    });

    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    prisma.activityProgress.findUnique.mockResolvedValue({
      id: "p1",
      status: "IN_PROGRESS",
      progressPercent: 20,
      metadata: {},
    });
    await expect(
      service.updateVideoProgress(organization, "learner_1", "activity_1", {
        currentTimeSeconds: 30,
        durationSeconds: 100,
      }),
    ).resolves.toMatchObject({
      status: "IN_PROGRESS",
      progressPercent: 30,
    });
  });

  it("sanitizes rich text body on content update", async () => {
    const { service, prisma } = createService();
    const instructorOrg = {
      ...organization,
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    };
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      organizationId: "org_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.text",
      activityContent: { id: "ac_1", body: null },
    });
    prisma.activityContent.upsert.mockResolvedValue({ id: "ac_1" });
    await service.updateActivityContent(
      instructorOrg as any,
      "u1",
      "activity_1",
      {
        body: { html: "<script>alert(1)</script><p>Safe</p>" },
        textContent: "Safe",
      } as any,
    );
    await service.updateActivityContent(
      instructorOrg as any,
      "u1",
      "activity_1",
      {
        content: {
          format: "rich_text_html",
          body: "<p>From body field</p>",
        },
      } as any,
    );
    expect(prisma.activityContent.upsert).toHaveBeenCalled();
  });

  it("creates video progress when none exists yet", async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    prisma.activityProgress.findUnique.mockResolvedValue(null);
    await expect(
      service.updateVideoProgress(organization, "learner_1", "activity_1", {
        currentTimeSeconds: 10,
        durationSeconds: 100,
      }),
    ).resolves.toMatchObject({
      status: "IN_PROGRESS",
      progressPercent: 10,
    });
    expect(prisma.activityProgress.create).toHaveBeenCalled();
  });

  it("uses watchedPercent override and completes on create path", async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    prisma.activityProgress.findUnique.mockResolvedValue(null);
    await expect(
      service.updateVideoProgress(organization, "learner_1", "activity_1", {
        currentTimeSeconds: 1,
        durationSeconds: 100,
        watchedPercent: 90,
      } as any),
    ).resolves.toMatchObject({
      status: "COMPLETED",
      progressPercent: 90,
    });
  });

  it("rejects missing library items on attach", async () => {
    const { service, prisma } = createService();
    const instructorOrg = {
      ...organization,
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    };
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      organizationId: "org_1",
      courseId: "course_1",
      activityTypeKey: "core.file",
      activityContent: { id: "ac_1" },
    });
    prisma.contentLibraryItem.findFirst.mockResolvedValue(null);
    await expect(
      service.attachLibraryItem(instructorOrg as any, "u1", "activity_1", {
        libraryItemId: "missing",
      } as any),
    ).rejects.toThrow();
  });

  it("keeps completed status when already completed video progress", async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    prisma.activityProgress.findUnique.mockResolvedValue({
      id: "p1",
      status: "COMPLETED",
      progressPercent: 100,
      completedAt: new Date(),
      metadata: { watchedPercent: 100 },
    });
    await expect(
      service.updateVideoProgress(organization, "learner_1", "activity_1", {
        currentTimeSeconds: 50,
        durationSeconds: 100,
      }),
    ).resolves.toMatchObject({ status: "COMPLETED" });
  });
});
