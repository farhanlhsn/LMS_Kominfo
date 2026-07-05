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
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    videoCaptionTrack: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn().mockImplementation(({ data }) => ({ id: "track_1", ...data })),
      update: vi.fn().mockImplementation(({ data }) => ({ id: "track_1", ...data })),
      updateMany: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: "track_1" }),
    },
    courseInstructor: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (input) => {
      if (typeof input === "function") {
        return input(prisma);
      }
      return Promise.all(input);
    }),
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

  it("creates a caption track and syncs transcript cues for video activities", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });

    await service.createCaptionTrack(
      {
        id: "org_1",
        slug: "org",
        name: "Org",
        memberId: "m_1",
        roleKeys: ["instructor"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "user_1",
      "activity_1",
      {
        label: "English captions",
        language: "en",
        rawContent:
          "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nWelcome to the lesson.",
        isDefault: true,
        syncTranscript: true,
      },
    );

    expect(prisma.videoCaptionTrack.create).toHaveBeenCalled();
    expect(prisma.transcriptSegment.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activityId: "activity_1", language: "en" }),
      }),
    );
    expect(prisma.transcriptSegment.create).toHaveBeenCalled();
  });

  it("updates an individual caption cue and re-normalizes the track", async () => {
    const { service, prisma } = createService();
    prisma.videoCaptionTrack.findFirst.mockResolvedValue({
      id: "track_1",
      organizationId: "org_1",
      activityId: "activity_1",
      cues: [
        { startSeconds: 0, endSeconds: 1, text: "Hello" },
        { startSeconds: 1, endSeconds: 2, text: "World" },
      ],
    });
    prisma.videoCaptionTrack.update.mockImplementation(({ data }) => ({
      id: "track_1",
      cues: data.cues,
    }));
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });

    const result = await service.updateCaptionCue(
      {
        id: "org_1",
        slug: "org",
        name: "Org",
        memberId: "m_1",
        roleKeys: ["instructor"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "user_1",
      "track_1",
      0,
      { text: "Hi" },
    );
    const cues = (result.cues ?? []) as Array<{ text: string }>;
    expect(cues[0]?.text).toBe("Hi");
  });

  it("rejects caption cue updates for missing indexes", async () => {
    const { service, prisma } = createService();
    prisma.videoCaptionTrack.findFirst.mockResolvedValue({
      id: "track_1",
      organizationId: "org_1",
      activityId: "activity_1",
      cues: [{ startSeconds: 0, endSeconds: 1, text: "Only" }],
    });
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });

    await expect(
      service.updateCaptionCue(
        {
          id: "org_1",
          slug: "org",
          name: "Org",
          memberId: "m_1",
          roleKeys: ["instructor"],
          permissionKeys: ["courses:update"],
          isPlatformAdmin: false,
        },
        "user_1",
        "track_1",
        5,
        { text: "X" },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("reorders caption cues and enforces a complete permutation", async () => {
    const { service, prisma } = createService();
    prisma.videoCaptionTrack.findFirst.mockResolvedValue({
      id: "track_1",
      organizationId: "org_1",
      activityId: "activity_1",
      cues: [
        { startSeconds: 0, endSeconds: 1, text: "A" },
        { startSeconds: 1, endSeconds: 2, text: "B" },
        { startSeconds: 2, endSeconds: 3, text: "C" },
      ],
    });
    prisma.videoCaptionTrack.update.mockImplementation(({ data }) => ({
      id: "track_1",
      cues: data.cues,
    }));
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });

    await expect(
      service.reorderCaptionCues(
        {
          id: "org_1",
          slug: "org",
          name: "Org",
          memberId: "m_1",
          roleKeys: ["instructor"],
          permissionKeys: ["courses:update"],
          isPlatformAdmin: false,
        },
        "user_1",
        "track_1",
        { orderedIndices: [2, 0, 1] },
      ),
    ).resolves.toBeDefined();

    await expect(
      service.reorderCaptionCues(
        {
          id: "org_1",
          slug: "org",
          name: "Org",
          memberId: "m_1",
          roleKeys: ["instructor"],
          permissionKeys: ["courses:update"],
          isPlatformAdmin: false,
        },
        "user_1",
        "track_1",
        { orderedIndices: [0, 1] },
      ),
    ).rejects.toThrow();
  });
});
