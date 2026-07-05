import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LearningWorkspaceService } from "./learning-workspace.service";

function createService() {
  const prisma = {
    learningWorkspacePreference: {
      upsert: vi.fn().mockImplementation(({ create, update }) => ({
        id: "pref_1",
        ...create,
        ...update,
      })),
    },
    lessonWorkspaceState: {
      findFirst: vi.fn(),
      create: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "state_1", ...data })),
      update: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "state_1", ...data })),
    },
    activity: {
      findFirst: vi.fn(),
    },
    lesson: {
      findFirst: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    learnerNote: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "note_1", ...data })),
      update: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "note_1", ...data })),
      count: vi.fn().mockResolvedValue(0),
    },
    learnerBookmark: {
      count: vi.fn().mockResolvedValue(0),
    },
    transcriptSegment: {
      findMany: vi.fn(),
    },
    courseInstructor: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return {
    service: new LearningWorkspaceService(
      prisma as never,
      { indexActivity: vi.fn().mockResolvedValue({}) } as never,
    ),
    prisma,
  };
}

describe("LearningWorkspaceService", () => {
  it("upserts organization-scoped workspace preferences", async () => {
    const { service, prisma } = createService();

    await service.updatePreferences("org_1", "user_1", {
      preferredLayout: "side_by_side",
      rightPanelMode: "notes",
      sidebarCollapsed: true,
    });

    expect(prisma.learningWorkspacePreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_userId: {
            organizationId: "org_1",
            userId: "user_1",
          },
        },
      }),
    );
  });

  it("creates notes only after enrollment is verified", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });

    await expect(
      service.createNote("org_1", "user_1", {
        courseId: "course_1",
        lessonId: "lesson_1",
        activityId: "activity_1",
        content: "Remember this",
      }),
    ).resolves.toMatchObject({
      organizationId: "org_1",
      userId: "user_1",
      visibility: "PRIVATE",
    });
  });

  it("blocks notes when the learner is not enrolled", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
    });
    prisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      service.createNote("org_1", "user_1", {
        courseId: "course_1",
        lessonId: "lesson_1",
        activityId: "activity_1",
        content: "Nope",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("does not allow updating another learner's note", async () => {
    const { service, prisma } = createService();
    prisma.learnerNote.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNote("org_1", "user_1", "note_2", {
        content: "Cross-user edit",
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
