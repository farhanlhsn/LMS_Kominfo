import { describe, expect, it, vi } from "vitest";
import { AiIndexingService } from "./ai-indexing.service";

describe("AiIndexingService", () => {
  it("indexes a course with a single batched activity load", async () => {
    const prisma = {
      activity: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "activity-1",
            organizationId: "org-1",
            courseId: "course-1",
            lessonId: "lesson-1",
            title: "Introduction",
            activityTypeKey: "core.video",
            activityContent: {
              textContent: "Lesson body",
              body: null,
              file: null,
            },
            transcriptSegments: [],
            lesson: { id: "lesson-1", title: "Lesson 1" },
          },
        ]),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "doc-1" }),
        update: vi.fn().mockResolvedValue({ id: "doc-1" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      aiDocumentChunk: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(0),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
      course: {
        findFirst: vi.fn().mockResolvedValue({ id: "course-1" }),
      },
      courseInstructor: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    };
    const extractor = {
      fromRichContent: vi.fn().mockReturnValue("Lesson body"),
      fromFile: vi.fn(),
    };
    const chunker = {
      chunk: vi
        .fn()
        .mockReturnValue([
          { chunkIndex: 0, content: "Lesson body", tokenCount: 2 },
        ]),
    };
    const embeddingFactory = {
      create: vi.fn().mockReturnValue({
        capabilities: { providerName: "mock", model: "mock-model" },
        embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2]]),
      }),
    };
    const service = new AiIndexingService(
      prisma as never,
      extractor as never,
      chunker as never,
      embeddingFactory as never,
    );

    const result = await service.indexCourse(
      {
        id: "org-1",
        slug: "org",
        name: "Org",
        memberId: "member-1",
        roleKeys: ["org_admin"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "user-1",
      "course-1",
    );

    expect(result).toMatchObject({ activities: 1, documents: 1, chunks: 1 });
    expect(prisma.activity.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.aiDocument.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("indexes a single activity", async () => {
    const prisma = {
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          organizationId: "org-1",
          courseId: "course-1",
          lessonId: "lesson-1",
          title: "Intro",
          activityTypeKey: "core.text",
          activityContent: { textContent: "Body", body: null, file: null },
          transcriptSegments: [],
          lesson: { id: "lesson-1", title: "L1" },
        }),
        findMany: vi.fn(),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "doc-1" }),
        update: vi.fn().mockResolvedValue({ id: "doc-1" }),
      },
      aiDocumentChunk: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(0),
      },
      auditLog: { create: vi.fn() },
      course: { findFirst: vi.fn().mockResolvedValue({ id: "course-1" }) },
      courseInstructor: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (ops: any) => Promise.all(ops)),
    };
    const service = new AiIndexingService(
      prisma as never,
      {
        fromRichContent: vi.fn().mockReturnValue("Body"),
        fromFile: vi.fn(),
      } as never,
      {
        chunk: vi
          .fn()
          .mockReturnValue([{ chunkIndex: 0, content: "Body", tokenCount: 1 }]),
      } as never,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "m" },
          embedBatch: vi.fn().mockResolvedValue([[0.1]]),
        }),
      } as never,
    );
    await service.indexActivity("org-1", "activity-1");
    expect(prisma.activity.findFirst).toHaveBeenCalled();
  });

  it("returns course indexing status and skips assessment activities", async () => {
    const prisma = {
      activity: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "quiz-1",
            organizationId: "org-1",
            courseId: "course-1",
            lessonId: "lesson-1",
            title: "Quiz",
            activityTypeKey: "core.quiz",
            activityContent: null,
            transcriptSegments: [],
            lesson: { id: "lesson-1", title: "L1" },
          },
        ]),
        findFirst: vi.fn(),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        groupBy: vi.fn().mockResolvedValue([
          { status: "READY", _count: { _all: 2 } },
          { status: "FAILED", _count: { _all: 1 } },
        ]),
      },
      aiDocumentChunk: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        count: vi.fn().mockResolvedValue(4),
      },
      auditLog: { create: vi.fn() },
      course: { findFirst: vi.fn().mockResolvedValue({ id: "course-1" }) },
      courseInstructor: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (ops: any) => Promise.all(ops)),
    };
    const service = new AiIndexingService(
      prisma as never,
      {
        fromRichContent: vi.fn().mockReturnValue(""),
        fromFile: vi.fn(),
      } as never,
      { chunk: vi.fn().mockReturnValue([]) } as never,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "m" },
          embedBatch: vi.fn().mockResolvedValue([]),
        }),
      } as never,
    );
    const org = {
      id: "org-1",
      slug: "org",
      name: "Org",
      memberId: "m1",
      roleKeys: ["org_admin"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: true,
    };
    const indexed = await service.indexCourse(
      org as never,
      "user-1",
      "course-1",
    );
    expect(indexed).toMatchObject({ activities: 1, documents: 0, chunks: 0 });
    const status = await service.courseStatus(
      org as never,
      "user-1",
      "course-1",
    );
    expect(status).toMatchObject({ documents: 3, chunks: 4 });
  });

  it("indexes transcript/file, reuses ready hash, and handles empty/failed extract", async () => {
    const prisma = {
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          organizationId: "org-1",
          courseId: "course-1",
          lessonId: "lesson-1",
          title: "Video",
          activityTypeKey: "core.video",
          activityContent: {
            textContent: null,
            body: null,
            file: {
              id: "file-1",
              originalFilename: "notes.txt",
              mimeType: "text/plain",
              deletedAt: null,
            },
          },
          transcriptSegments: [
            { text: "Hello transcript", orderIndex: 0, startSeconds: 0 },
          ],
          lesson: { id: "lesson-1", title: "L1" },
        }),
        findMany: vi.fn(),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "doc-ready",
            activityId: "activity-1",
            sourceType: "TRANSCRIPT",
            fileId: null,
            contentHash:
              "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
            status: "READY",
          },
        ]),
        create: vi.fn().mockImplementation(({ data }) => ({
          id: `doc-${data.sourceType}`,
          ...data,
        })),
        update: vi.fn().mockImplementation(({ where, data }) => ({
          id: where.id,
          ...data,
        })),
      },
      aiDocumentChunk: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(2),
      },
      auditLog: { create: vi.fn() },
      course: { findFirst: vi.fn() },
      courseInstructor: { findFirst: vi.fn() },
      $transaction: vi.fn(async (ops: any) => Promise.all(ops)),
    };
    const extractor = {
      fromRichContent: vi.fn().mockReturnValue(""),
      fromFile: vi
        .fn()
        .mockResolvedValueOnce("file body text")
        .mockRejectedValueOnce(new Error("extract fail")),
    };
    const chunker = {
      chunk: vi
        .fn()
        .mockReturnValue([{ chunkIndex: 0, content: "chunk", tokenCount: 1 }]),
    };
    const embedBatch = vi
      .fn()
      .mockResolvedValueOnce([[0.1]])
      .mockRejectedValueOnce(new Error("embed fail"));
    const service = new AiIndexingService(
      prisma as never,
      extractor as never,
      chunker as never,
      {
        create: vi.fn().mockReturnValue({
          capabilities: { providerName: "mock", model: "m" },
          embedBatch,
        }),
      } as never,
    );

    // First run: transcript + file success; transcript may reuse if hash matches
    await service.indexActivity("org-1", "activity-1");
    expect(prisma.aiDocument.create).toHaveBeenCalled();

    // Ready-hash reuse with existing READY chunks
    const { createHash } = await import("node:crypto");
    const transcriptHash = createHash("sha256")
      .update("Hello transcript")
      .digest("hex");
    prisma.aiDocument.findMany.mockResolvedValue([
      {
        id: "doc-ready",
        activityId: "activity-1",
        sourceType: "TRANSCRIPT",
        fileId: null,
        contentHash: transcriptHash,
        status: "READY",
      },
    ]);
    prisma.aiDocumentChunk.count.mockResolvedValue(2);
    extractor.fromFile.mockResolvedValue("file body text");
    await service.indexActivity("org-1", "activity-1");

    // Force file extraction failure path
    prisma.aiDocument.findMany.mockResolvedValue([]);
    extractor.fromFile.mockRejectedValueOnce(new Error("extract fail"));
    await service.indexActivity("org-1", "activity-1");
    expect(prisma.aiDocument.update).toHaveBeenCalled();
  });

  it("marks documents failed when embeddings are incomplete or invalid", async () => {
    const prisma = {
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          organizationId: "org-1",
          courseId: "course-1",
          lessonId: "lesson-1",
          title: "Intro",
          activityTypeKey: "core.text",
          activityContent: { textContent: "Body", body: null, file: null },
          transcriptSegments: [],
          lesson: { id: "lesson-1", title: "L1" },
        }),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "doc-1" }),
        update: vi.fn().mockResolvedValue({ id: "doc-1" }),
      },
      aiDocumentChunk: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    const service = new AiIndexingService(
      prisma as never,
      { fromRichContent: vi.fn().mockReturnValue("Body") } as never,
      {
        chunk: vi.fn().mockReturnValue([
          { chunkIndex: 0, content: "A", tokenCount: 1 },
          { chunkIndex: 1, content: "B", tokenCount: 1 },
        ]),
      } as never,
      {
        create: vi.fn().mockReturnValue({
          capabilities: {
            providerName: "mock",
            model: "m",
            embeddingDimensions: 2,
          },
          embedBatch: vi.fn().mockResolvedValue([[0.1, Number.NaN]]),
        }),
      } as never,
    );

    await expect(
      service.indexActivity("org-1", "activity-1"),
    ).resolves.toMatchObject({ chunks: 0 });
    expect(prisma.aiDocumentChunk.createMany).not.toHaveBeenCalled();
    expect(prisma.aiDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({ status: "FAILED" }),
    });
  });

  it("rejects missing activity/course and allows instructor without courses:update", async () => {
    const { ForbiddenException, NotFoundException } =
      await import("@nestjs/common");
    const prisma = {
      activity: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "orphan",
            activityId: null,
            sourceType: "X",
            fileId: null,
            contentHash: "h",
            status: "READY",
          },
          {
            id: "ok",
            activityId: "a1",
            sourceType: "ACTIVITY_CONTENT",
            fileId: null,
            contentHash: "h2",
            status: "READY",
          },
        ]),
        groupBy: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      aiDocumentChunk: { count: vi.fn().mockResolvedValue(0) },
      course: { findFirst: vi.fn().mockResolvedValue(null) },
      courseInstructor: {
        findFirst: vi.fn().mockResolvedValue({ id: "ci-1" }),
      },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (ops: any) => Promise.all(ops)),
    };
    const service = new AiIndexingService(
      prisma as never,
      { fromRichContent: vi.fn(), fromFile: vi.fn() } as never,
      { chunk: vi.fn() } as never,
      { create: vi.fn() } as never,
    );
    await expect(
      service.indexActivity("org-1", "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);

    const orgNoPerm = {
      id: "org-1",
      slug: "o",
      name: "O",
      memberId: "m",
      roleKeys: [],
      permissionKeys: [] as string[],
      isPlatformAdmin: false,
    };
    await expect(
      service.indexCourse(orgNoPerm as never, "u1", "c1"),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.course.findFirst.mockResolvedValue({ id: "c1" });
    await service.indexCourse(orgNoPerm as never, "u1", "c1");
    expect(prisma.courseInstructor.findFirst).toHaveBeenCalled();

    prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      service.indexCourse(orgNoPerm as never, "u1", "c1"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.courseStatus(
      {
        ...orgNoPerm,
        permissionKeys: ["courses:update"],
      } as never,
      "u1",
      "c1",
    );
  });

  it("reports INDEXING while an automatic activity reindex is running", async () => {
    let finishIndex: ((value: unknown) => void) | undefined;
    const prisma = {
      activity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "activity-1",
          courseId: "course-1",
          isPublished: true,
          activityTypeKey: "core.text",
        }),
      },
      aiDocument: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        groupBy: vi
          .fn()
          .mockResolvedValue([{ status: "READY", _count: { _all: 1 } }]),
      },
      aiDocumentChunk: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(2),
      },
      course: {
        findFirst: vi.fn().mockResolvedValue({ id: "course-1" }),
      },
      courseInstructor: { findFirst: vi.fn() },
    };
    const service = new AiIndexingService(
      prisma as never,
      { fromRichContent: vi.fn(), fromFile: vi.fn() } as never,
      { chunk: vi.fn() } as never,
      { create: vi.fn() } as never,
    );
    const indexActivity = vi.spyOn(service, "indexActivity").mockReturnValue(
      new Promise((resolve) => {
        finishIndex = resolve;
      }) as never,
    );
    const organization = {
      id: "org-1",
      slug: "org",
      name: "Org",
      memberId: "member-1",
      roleKeys: ["instructor"],
      permissionKeys: ["courses:update"],
      isPlatformAdmin: false,
    };

    await service.requestActivityReindex("org-1", "activity-1");
    await expect(
      service.courseStatus(organization as never, "user-1", "course-1"),
    ).resolves.toMatchObject({
      state: "INDEXING",
      ready: false,
      isIndexing: true,
    });
    expect(prisma.aiDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "NEEDS_REINDEX" }),
      }),
    );

    finishIndex?.({});
    await vi.waitFor(() => expect(indexActivity).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => {
      const status = await service.courseStatus(
        organization as never,
        "user-1",
        "course-1",
      );
      expect(status.state).toBe("READY");
    });
  });

  it("lists ready indexed sources within organization and course", async () => {
    const prisma = {
      course: { findFirst: vi.fn().mockResolvedValue({ id: "course-1" }) },
      courseInstructor: { findFirst: vi.fn() },
      aiDocument: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "document-1",
            title: "Lesson notes",
            sourceType: "ACTIVITY_CONTENT",
            lessonId: "lesson-1",
            activityId: "activity-1",
            fileId: null,
            indexedAt: new Date("2026-07-23T00:00:00.000Z"),
            _count: { chunks: 3 },
          },
        ]),
      },
    };
    const service = new AiIndexingService(
      prisma as never,
      { fromRichContent: vi.fn(), fromFile: vi.fn() } as never,
      { chunk: vi.fn() } as never,
      { create: vi.fn() } as never,
    );
    const result = await service.courseSources(
      {
        id: "org-1",
        slug: "org",
        name: "Org",
        memberId: "member-1",
        roleKeys: ["instructor"],
        permissionKeys: ["courses:update"],
        isPlatformAdmin: false,
      },
      "user-1",
      "course-1",
    );

    expect(prisma.aiDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          courseId: "course-1",
          status: "READY",
          deletedAt: null,
        },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: "document-1", chunkCount: 3 }),
    ]);
  });
});
