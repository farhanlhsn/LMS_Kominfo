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
      chunk: vi.fn().mockReturnValue([
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
});
