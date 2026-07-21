import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LearningWorkspaceService } from "./learning-workspace.service";

function createService() {
  const prisma: any = {
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
      findMany: vi.fn().mockResolvedValue([{ id: "note_1" }]),
      findFirst: vi.fn().mockResolvedValue({
        id: "note_1",
        organizationId: "org_1",
        userId: "user_1",
      }),
      create: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "note_1", ...data })),
      update: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "note_1", ...data })),
      count: vi.fn().mockResolvedValue(0),
    },
    learnerBookmark: {
      findMany: vi.fn().mockResolvedValue([{ id: "bm_1" }]),
      findFirst: vi.fn().mockResolvedValue({
        id: "bm_1",
        organizationId: "org_1",
        userId: "user_1",
      }),
      create: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "bm_1", ...data })),
      update: vi
        .fn()
        .mockImplementation(({ data }) => ({ id: "bm_1", ...data })),
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

  it("updates caption track with syncTranscript", async () => {
    const org = {
      id: "org_1",
      slug: "org",
      name: "Org",
      memberId: "m_1",
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: false,
    };
    const { service, prisma } = createService();
    prisma.videoCaptionTrack.findFirst.mockResolvedValue({
      id: "track_1",
      organizationId: "org_1",
      activityId: "activity_1",
      language: "en",
      label: "EN",
      kind: "captions",
      source: "manual",
      isDefault: false,
      rawContent: null,
      metadata: {},
      cues: [{ startSeconds: 0, endSeconds: 1, text: "A" }],
    });
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });
    await service.updateCaptionTrack(org as any, "user_1", "track_1", {
      label: "EN2",
      isDefault: true,
      syncTranscript: true,
      rawContent:
        "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello",
    } as any);
    expect(prisma.transcriptSegment.deleteMany).toHaveBeenCalled();
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
    prisma.videoCaptionTrack.update.mockImplementation(({ data }: any) => ({
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
    prisma.videoCaptionTrack.update.mockImplementation(({ data }: any) => ({
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

  it("covers learner notes/bookmarks/state/transcript paths", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
    });
    prisma.lesson.findFirst.mockResolvedValue({
      id: "lesson_1",
      courseId: "course_1",
    });

    expect(await service.getPreferences("org_1", "user_1")).toMatchObject({
      id: "pref_1",
    });
    await service.getState("org_1", "user_1", {
      courseId: "course_1",
      lessonId: "lesson_1",
      activityId: "activity_1",
    } as any);
    prisma.lessonWorkspaceState.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "state_1" });
    await service.updateState("org_1", "user_1", {
      courseId: "course_1",
      lessonId: "lesson_1",
      activityId: "activity_1",
      layout: "side_by_side",
    } as any);
    await service.updateState("org_1", "user_1", {
      courseId: "course_1",
      lessonId: "lesson_1",
      activityId: "activity_1",
      layout: "standard",
    } as any);

    expect(
      await service.listNotes("org_1", "user_1", {
        courseId: "course_1",
        lessonId: "lesson_1",
        activityId: "activity_1",
      } as any),
    ).toEqual([{ id: "note_1" }]);
    await service.updateNote("org_1", "user_1", "note_1", {
      content: "edited",
    } as any);
    await service.deleteNote("org_1", "user_1", "note_1");

    expect(
      await service.listBookmarks("org_1", "user_1", {
        courseId: "course_1",
        lessonId: "lesson_1",
        activityId: "activity_1",
      } as any),
    ).toEqual([{ id: "bm_1" }]);
    await service.createBookmark("org_1", "user_1", {
      courseId: "course_1",
      lessonId: "lesson_1",
      activityId: "activity_1",
      title: "Mark",
      videoTimeSeconds: 12,
    } as any);
    await service.updateBookmark("org_1", "user_1", "bm_1", {
      title: "Mark2",
    } as any);
    await service.deleteBookmark("org_1", "user_1", "bm_1");

    prisma.transcriptSegment.findMany.mockResolvedValue([{ id: "seg_1" }]);
    prisma.videoCaptionTrack.findMany.mockResolvedValue([{ id: "track_1" }]);
    expect(
      await service.getTranscript("org_1", "user_1", "activity_1", {
        language: "en",
      } as any),
    ).toEqual([{ id: "seg_1" }]);
    expect(await service.getCaptionTracks("org_1", "user_1", "activity_1")).toEqual([
      { id: "track_1" },
    ]);
  });

  it("covers instructor caption/transcript management helpers", async () => {
    const org = {
      id: "org_1",
      slug: "org",
      name: "Org",
      memberId: "m_1",
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: false,
    };
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.video",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });
    prisma.transcriptSegment.findMany.mockResolvedValue([{ id: "seg_1" }]);
    prisma.videoCaptionTrack.findMany.mockResolvedValue([{ id: "track_1" }]);
    prisma.videoCaptionTrack.findFirst.mockResolvedValue({
      id: "track_1",
      organizationId: "org_1",
      activityId: "activity_1",
      cues: [{ startSeconds: 0, endSeconds: 1, text: "A" }],
      language: "en",
      label: "EN",
      kind: "captions",
      source: "manual",
      isDefault: false,
      rawContent: null,
      metadata: {},
    });

    expect(await service.instructorTranscript(org as any, "user_1", "activity_1")).toEqual([
      { id: "seg_1" },
    ]);
    expect(
      await service.instructorCaptionTracks(org as any, "user_1", "activity_1"),
    ).toEqual([{ id: "track_1" }]);
    expect(await service.listCaptionCues(org as any, "user_1", "track_1")).toEqual([
      { startSeconds: 0, endSeconds: 1, text: "A" },
    ]);
    await service.createCaptionCue(org as any, "user_1", "track_1", {
      startSeconds: 1,
      endSeconds: 2,
      text: "B",
    } as any);
    await service.deleteCaptionCue(org as any, "user_1", "track_1", 0);
    await service.updateCaptionTrack(org as any, "user_1", "track_1", {
      label: "EN2",
      isDefault: true,
    } as any);
    await service.deleteCaptionTrack(org as any, "user_1", "track_1");

    prisma.transcriptSegment.findFirst = vi.fn().mockResolvedValue({
      id: "seg_1",
      organizationId: "org_1",
      activityId: "activity_1",
    });
    prisma.transcriptSegment.update = vi
      .fn()
      .mockResolvedValue({ id: "seg_1", text: "edited" });
    prisma.transcriptSegment.delete = vi.fn().mockResolvedValue({ id: "seg_1" });
    prisma.transcriptSegment.createMany = vi.fn().mockResolvedValue({ count: 1 });
    await service.upsertInstructorTranscript(org as any, "user_1", "activity_1", {
      language: "en",
      segments: [{ startSeconds: 0, endSeconds: 1, text: "Hi" }],
    } as any);
    await service.updateTranscriptSegment(org as any, "user_1", "seg_1", {
      text: "edited",
    } as any);
    await service.deleteTranscriptSegment(org as any, "user_1", "seg_1");
  });

  it("resolves lesson and course scoped workspace state", async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.lesson.findFirst.mockResolvedValue({
      id: "lesson_1",
      courseId: "course_1",
    });
    prisma.lessonWorkspaceState.findFirst.mockResolvedValue(null);
    await service.getState("org_1", "user_1", {
      lessonId: "lesson_1",
    } as any);
    await service.getState("org_1", "user_1", {
      courseId: "course_1",
    } as any);
    await expect(
      service.getState("org_1", "user_1", {} as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.lesson.findFirst.mockResolvedValue(null);
    await expect(
      service.getState("org_1", "user_1", { lessonId: "missing" } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects non-video caption tracks and missing tracks", async () => {
    const org = {
      id: "org_1",
      slug: "org",
      name: "Org",
      memberId: "m_1",
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: false,
    };
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      activityTypeKey: "core.text",
    });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "inst_1" });
    await expect(
      service.createCaptionTrack(org as any, "user_1", "activity_1", {
        label: "EN",
        language: "en",
        rawContent: "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHi",
      } as any),
    ).rejects.toThrow();
    prisma.videoCaptionTrack.findFirst.mockResolvedValue(null);
    await expect(
      service.listCaptionCues(org as any, "user_1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns workspace context with available panels", async () => {
    const { service, prisma } = createService();
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      title: "Video",
      activityTypeKey: "core.video",
      pluginKey: "core.video",
      courseId: "course_1",
      assessmentDisplayPolicy: {
        allowNotes: true,
        allowTranscript: true,
        allowAIAssistant: true,
      },
      course: { id: "course_1", title: "Course", subtitle: null },
      lesson: { id: "lesson_1", title: "Lesson", summary: null },
      progress: [{ id: "p1", progressPercent: 10 }],
      transcriptSegments: [{ id: "seg_1" }],
      videoCaptionTracks: [
        { language: "en", isDefault: true },
        { language: "id", isDefault: false },
      ],
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.learnerNote.count.mockResolvedValue(2);
    prisma.learnerBookmark.count.mockResolvedValue(1);
    const ctx = await service.getWorkspaceContext(
      "org_1",
      "user_1",
      "activity_1",
    );
    expect(ctx.availablePanels).toContain("notes");
    expect(ctx.availablePanels).toContain("ai");
    expect(ctx.transcriptAvailable).toBe(true);
    expect(ctx.defaultCaptionLanguage).toBe("en");
  });
});
