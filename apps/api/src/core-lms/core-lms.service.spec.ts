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
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    courseInstructor: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    courseModule: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "mod-1", courseId: "course-1" }),
      delete: vi.fn().mockResolvedValue({ id: "mod-1" }),
      findFirst: vi.fn().mockResolvedValue({
        id: "mod-1",
        courseId: "course-1",
        organizationId: "org-1",
      }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "mod-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    lesson: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "les-1", courseId: "course-1" }),
      delete: vi.fn().mockResolvedValue({ id: "les-1" }),
      findFirst: vi.fn().mockResolvedValue({
        id: "les-1",
        courseId: "course-1",
        moduleId: "mod-1",
        organizationId: "org-1",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "les-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    activity: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "act-1", courseId: "course-1" }),
      delete: vi.fn().mockResolvedValue({ id: "act-1" }),
      findFirst: vi.fn().mockResolvedValue({
        id: "act-1",
        courseId: "course-1",
        lessonId: "les-1",
        organizationId: "org-1",
      }),
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "act-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    activityProgress: {
      count: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "p1", status: "IN_PROGRESS" }),
      update: vi.fn(),
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
    quizAttempt: { findFirst: vi.fn() },
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
  it("generates unique slugs when collisions exist", async () => {
    const { prisma, service } = createService();
    const manager = orgContext({
      isPlatformAdmin: true,
      permissionKeys: ["courses:create", "courses:update"],
    });
    prisma.course.findFirst.mockResolvedValue(null);
    prisma.course.findUnique
      .mockResolvedValueOnce({ id: "exists" })
      .mockResolvedValueOnce(null);
    prisma.course.create.mockResolvedValue({ id: "course-1", slug: "intro-2" });
    prisma.courseInstructor.create.mockResolvedValue({});
    await service.createCourse(manager, "u1", {
      title: "Intro",
      slug: "intro",
    } as any);
    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "intro-2" }),
      }),
    );
  });

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

  it("lists categories and course detail", async () => {
    const { prisma, service } = createService();
    prisma.courseCategory.findMany.mockResolvedValue([{ id: "cat-1" }]);
    expect(await service.listCategories("org-1")).toEqual([{ id: "cat-1" }]);

    prisma.course.findFirst.mockResolvedValue({ id: "course-1", slug: "web" });
    await expect(service.getCourseDetail("org-1", "web")).resolves.toEqual(
      expect.objectContaining({ id: "course-1" }),
    );
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(service.getCourseDetail("org-1", "missing")).rejects.toThrow(
      /Course not found/,
    );
  });

  it("creates a course for instructors", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue(null);
    prisma.course.create.mockResolvedValue({ id: "course-1", slug: "intro" });
    prisma.courseInstructor.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
    const created = await service.createCourse(
      orgContext({
        permissionKeys: ["courses:create"],
        roleKeys: ["instructor"],
        isPlatformAdmin: true,
      }),
      "u1",
      { title: "Intro", slug: "intro" } as any,
    );
    expect(created).toEqual(expect.objectContaining({ id: "course-1" }));
    expect(prisma.course.create).toHaveBeenCalled();
  });

  it("creates updates and deletes modules lessons activities", async () => {
    const { prisma, service } = createService();
    const manager = orgContext({
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    });
    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
      title: "Course",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci" });
    prisma.course.update.mockResolvedValue({
      id: "course-1",
      title: "Course",
      status: "PUBLISHED",
    });

    await service.createModule(manager, "u1", "course-1", {
      title: "M1",
    } as any);
    await service.updateModule(manager, "u1", "mod-1", { title: "M2" } as any);
    await service.deleteModule(manager, "u1", "mod-1");
    await service.reorderModules(manager, "u1", "course-1", {
      ids: ["mod-1"],
    } as any);

    await service.createLesson(manager, "u1", "mod-1", {
      title: "L1",
    } as any);
    await service.updateLesson(manager, "u1", "les-1", {
      title: "L2",
    } as any);
    await service.deleteLesson(manager, "u1", "les-1");

    await service.createActivity(manager, "u1", "les-1", {
      title: "A1",
      activityTypeKey: "core.text",
    } as any);
    await service.updateActivity(manager, "u1", "act-1", {
      title: "A2",
    } as any);
    await service.deleteActivity(manager, "u1", "act-1");

    await service.publishCourse(manager, "u1", "course-1");
    await service.archiveCourse(manager, "u1", "course-1");
    await service.enroll("org-1", "learner-1", "course-1");
    prisma.enrollment.findMany.mockResolvedValue([{ id: "e1" }]);
    expect(await service.myEnrollments("org-1", "learner-1")).toEqual([
      { id: "e1" },
    ]);

    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
      title: "Course",
      status: "DRAFT",
    });
    prisma.course.update.mockResolvedValue({
      id: "course-1",
      title: "Renamed",
    });
    await service.updateCourse(manager, "u1", "course-1", {
      title: "Renamed",
    } as any);
    prisma.courseModule.findMany.mockResolvedValue([]);
    await service.getCurriculum("org-1", "course-1");
    prisma.course.findMany.mockResolvedValue([{ id: "course-1" }]);
    await service.listInstructorCourses("org-1", "u1", true);
    await service.deleteCourse(manager, "u1", "course-1");

    expect(prisma.courseModule.create).toHaveBeenCalled();
    expect(prisma.lesson.create).toHaveBeenCalled();
    expect(prisma.activity.create).toHaveBeenCalled();
    expect(prisma.enrollment.upsert).toHaveBeenCalled();
  });

  it("starts an activity for enrolled learners", async () => {
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
      id: "p1",
      status: "IN_PROGRESS",
    });
    await expect(
      service.startActivity("org-1", "learner-1", "activity-1"),
    ).resolves.toEqual(expect.objectContaining({ id: "p1" }));
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

  it("covers learn views, reorder, progress update, and duplicate", async () => {
    const { prisma, service } = createService();
    const manager = orgContext({
      isPlatformAdmin: true,
      permissionKeys: ["courses:update", "courses:create"],
    });
    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
      title: "Course",
      status: "PUBLISHED",
      slug: "course",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci" });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
      progressPercent: 10,
    });
    prisma.courseModule.findMany.mockResolvedValue([
      {
        id: "mod-1",
        lessons: [
          {
            id: "les-1",
            activities: [{ id: "act-1", title: "A1" }],
          },
        ],
      },
    ]);
    prisma.lesson.findFirst.mockResolvedValue({
      id: "les-1",
      courseId: "course-1",
      moduleId: "mod-1",
      organizationId: "org-1",
      activities: [{ id: "act-1" }],
    });
    prisma.activity.findFirst.mockResolvedValue({
      id: "act-1",
      courseId: "course-1",
      lessonId: "les-1",
      organizationId: "org-1",
    });
    prisma.activityProgress.findUnique.mockResolvedValue(null);
    prisma.activityProgress.upsert.mockResolvedValue({
      id: "p1",
      status: "IN_PROGRESS",
      progressPercent: 25,
    });
    prisma.activity.findMany.mockResolvedValue([{ id: "act-1" }]);
    prisma.activityProgress.count.mockResolvedValue(0);

    await service.learnCourse("org-1", "learner-1", "course-1");
    await service.learnLesson("org-1", "learner-1", "les-1");
    await service.courseProgress("org-1", "learner-1", "course-1");
    await service.updateActivityProgress("org-1", "learner-1", "act-1", {
      progressPercent: 25,
    } as any);
    await service.reorderLessons(manager, "u1", "mod-1", {
      ids: ["les-1"],
    } as any);
    await service.reorderActivities(manager, "u1", "les-1", {
      ids: ["act-1"],
    } as any);
    await service.getInstructorCourse(manager, "u1", "course-1");

    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
      title: "Course",
      slug: "course",
      status: "PUBLISHED",
      categoryId: null,
      subtitle: null,
      description: null,
      level: "BEGINNER",
      learningObjectives: [],
      requirements: [],
      targetAudience: [],
      tags: [],
      metadata: {},
    });
    prisma.courseModule.findMany.mockResolvedValue([
      {
        id: "mod-1",
        title: "Module 1",
        description: null,
        orderIndex: 0,
        lessons: [
          {
            id: "les-1",
            title: "Lesson 1",
            slug: "lesson-1",
            summary: null,
            orderIndex: 0,
            isPreview: false,
            estimatedMinutes: 5,
            metadata: {},
            activities: [
              {
                id: "act-1",
                title: "Activity 1",
                description: null,
                activityTypeKey: "core.text",
                pluginKey: null,
                pluginVersion: null,
                orderIndex: 0,
                isRequired: true,
                estimatedMinutes: 5,
                config: {},
                content: {},
                completionRule: {},
                gradingRule: null,
                metadata: {},
              },
            ],
          },
        ],
      },
    ]);
    prisma.course.create.mockResolvedValue({
      id: "course-2",
      slug: "course-copy",
      title: "Course Copy",
    });
    prisma.courseModule.create.mockResolvedValue({
      id: "mod-2",
      courseId: "course-2",
    });
    prisma.lesson.create.mockResolvedValue({
      id: "les-2",
      courseId: "course-2",
      slug: "lesson-1",
    });
    prisma.activity.create.mockResolvedValue({
      id: "act-2",
      courseId: "course-2",
    });
    await service.duplicateCourse(manager, "u1", "course-1");
    expect(prisma.activityProgress.upsert).toHaveBeenCalled();
    expect(prisma.course.create).toHaveBeenCalled();
  });

  it("blocks quiz completion without a passed attempt", async () => {
    const { prisma, service } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      organizationId: "org-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityTypeKey: "core.quiz",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
    });
    prisma.quizAttempt.findFirst.mockResolvedValue(null);
    await expect(
      service.completeActivity("org-1", "learner-1", "activity-1"),
    ).rejects.toThrow();
  });

  it("completes quiz activity when passed attempt exists", async () => {
    const { prisma, service } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      organizationId: "org-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityTypeKey: "core.quiz",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
    });
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "qa-1",
      passed: true,
      status: "SUBMITTED",
    });
    prisma.activityProgress.upsert.mockResolvedValue({
      id: "p1",
      status: "COMPLETED",
      progressPercent: 100,
    });
    prisma.activity.findMany.mockResolvedValue([{ id: "activity-1" }]);
    prisma.activityProgress.count.mockResolvedValue(1);
    prisma.enrollment.update.mockResolvedValue({});
    await expect(
      service.completeActivity("org-1", "learner-1", "activity-1"),
    ).resolves.toBeTruthy();
  });

  it("updates activity content body via upsert", async () => {
    const { prisma, service } = createService();
    const manager = orgContext({
      isPlatformAdmin: true,
      permissionKeys: ["courses:update"],
    });
    prisma.activity.findFirst.mockResolvedValue({
      id: "act-1",
      courseId: "course-1",
      organizationId: "org-1",
      lessonId: "les-1",
    });
    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
    });
    prisma.activity.update.mockResolvedValue({ id: "act-1" });
    await service.updateActivity(manager, "u1", "act-1", {
      title: "A",
      content: { html: "<p>x</p>" },
    } as any);
    expect(prisma.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityContent: expect.objectContaining({ upsert: expect.any(Object) }),
        }),
      }),
    );
  });

  it("reuses completed progress on startActivity", async () => {
    const { prisma, service } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      organizationId: "org-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityTypeKey: "core.text",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
    });
    prisma.activityProgress.findUnique.mockResolvedValue({
      id: "p1",
      status: "COMPLETED",
      startedAt: new Date(),
    });
    prisma.activityProgress.update.mockResolvedValue({
      id: "p1",
      status: "COMPLETED",
    });
    await expect(
      service.startActivity("org-1", "learner-1", "activity-1"),
    ).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("covers redis cache, not-found helpers, lesson slug collision, auto-cert", async () => {
    const prisma = createPrismaMock();
    const redis = {
      getOrSet: vi.fn(async (_k: string, fn: () => Promise<unknown>) => fn()),
      del: vi.fn(),
      delByPrefix: vi.fn(),
    };
    const certificates = {
      autoIssue: vi.fn().mockResolvedValue({ id: "cert-1" }),
    };
    const service = new CoreLmsService(
      prisma as never,
      certificates as never,
      redis as never,
    );
    const manager = orgContext({
      isPlatformAdmin: true,
      permissionKeys: ["courses:create", "courses:update"],
    });

    prisma.course.findMany.mockResolvedValue([]);
    prisma.course.count.mockResolvedValue(0);
    await service.listCatalog("org-1", { page: 1, limit: 10 });
    expect(redis.getOrSet).toHaveBeenCalled();

    prisma.course.findMany.mockResolvedValue([{ id: "c1" }]);
    await service.listInstructorCourses("org-1", "u1", false);
    await service.listInstructorCourses("org-1", "u1", true);

    prisma.lesson.findFirst.mockResolvedValue(null);
    await expect(service.learnLesson("org-1", "u1", "missing")).rejects.toThrow(
      /Lesson not found/,
    );

    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.updateCourse(manager, "u1", "missing", { title: "x" } as any),
    ).rejects.toThrow(/Course not found/);

    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
    });
    prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      service.updateCourse(
        orgContext({ permissionKeys: [] }),
        "u1",
        "course-1",
        { title: "x" } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.courseModule.findFirst.mockResolvedValue(null);
    await expect(
      service.updateModule(manager, "u1", "missing", { title: "x" } as any),
    ).rejects.toThrow(/Module not found/);

    prisma.lesson.findFirst.mockResolvedValue(null);
    await expect(
      service.updateLesson(manager, "u1", "missing", { title: "x" } as any),
    ).rejects.toThrow(/Lesson not found/);

    prisma.activity.findFirst.mockResolvedValue(null);
    await expect(
      service.updateActivity(manager, "u1", "missing", { title: "x" } as any),
    ).rejects.toThrow(/Activity not found/);

    prisma.course.findFirst.mockResolvedValue({
      id: "course-1",
      organizationId: "org-1",
      deletedAt: null,
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci" });
    prisma.courseModule.findFirst.mockResolvedValue({
      id: "mod-1",
      courseId: "course-1",
      organizationId: "org-1",
    });
    prisma.lesson.findUnique
      .mockResolvedValueOnce({ id: "exists" })
      .mockResolvedValueOnce(null);
    prisma.lesson.create.mockResolvedValue({ id: "les-2", slug: "intro-2" });
    await service.createLesson(manager, "u1", "mod-1", {
      title: "Intro",
      slug: "intro",
    } as any);
    expect(prisma.lesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "intro-2" }),
      }),
    );

    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      organizationId: "org-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityTypeKey: "core.text",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment-1",
      status: "ACTIVE",
    });
    prisma.activityProgress.upsert.mockResolvedValue({
      id: "p1",
      status: "COMPLETED",
      progressPercent: 100,
    });
    prisma.activity.findMany.mockResolvedValue([{ id: "activity-1" }]);
    prisma.activityProgress.count.mockResolvedValue(1);
    prisma.enrollment.update.mockResolvedValue({
      progressPercent: 100,
      requiredTotal: 1,
    });
    await service.completeActivity("org-1", "learner-1", "activity-1");
    await new Promise((r) => setTimeout(r, 0));
    expect(certificates.autoIssue).toHaveBeenCalled();

    prisma.courseModule.findMany.mockResolvedValue([]);
    await service.getCurriculum("org-1", "course-1");
    expect(redis.getOrSet).toHaveBeenCalled();
  });
});
