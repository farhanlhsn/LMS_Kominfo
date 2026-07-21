import { describe, expect, it, vi } from "vitest";
import { AiRetrieverService } from "./ai-retriever.service";

describe("AiRetrieverService", () => {
  it("scopes every retrieval to the active tenant, enrolled course, and published activities", async () => {
    const prisma = {
      enrollment: {
        findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
      },
      course: { findFirst: vi.fn().mockResolvedValue({ id: "course-1" }) },
      activity: { findMany: vi.fn().mockResolvedValue([{ id: "activity-1" }]) },
      aiDocumentChunk: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "chunk-1",
            sourceDocumentId: "doc-1",
            courseId: "course-1",
            lessonId: "lesson-1",
            activityId: "activity-1",
            content: "TCP provides reliable ordered delivery.",
            embedding: [1, 0],
            sourceDocument: {
              id: "doc-1",
              title: "Networking",
              sourceType: "ACTIVITY_CONTENT",
            },
          },
        ]),
      },
    };
    const embeddingFactory = {
      create: () => ({
        capabilities: { providerName: "mock", model: "mock-embedding" },
        embedText: vi.fn().mockResolvedValue([1, 0]),
      }),
    };
    const service = new AiRetrieverService(
      prisma as never,
      embeddingFactory as never,
    );
    const result = await service.retrieve({
      organizationId: "org-1",
      userId: "user-1",
      courseId: "course-1",
      lessonId: "lesson-1",
      activityId: "activity-1",
      question: "TCP",
      topK: 5,
      minScore: 0.2,
    });

    expect(result).toHaveLength(1);
    expect(prisma.aiDocumentChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          courseId: "course-1",
          activityId: { in: ["activity-1"] },
        }),
      }),
    );
  });
});
