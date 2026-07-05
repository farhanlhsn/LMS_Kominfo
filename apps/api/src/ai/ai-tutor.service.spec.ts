import { describe, expect, it, vi } from "vitest";
import { createAiConfig } from "@lms/config";
import { AiTutorService } from "./ai-tutor.service";
import { AiRoutingService } from "./ai-routing.service";

const dto = {
  courseId: "course-1",
  lessonId: "lesson-1",
  activityId: "activity-1",
  question: "jelaskan materi ini",
};

function setup(overrides: Record<string, string> = {}) {
  const config = createAiConfig({ AI_ENABLED: "true", ...overrides });
  const prisma = {
    activity: {
      findFirst: vi.fn().mockResolvedValue({ assessmentDisplayPolicy: {} }),
    },
    enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }) },
    learnerNote: { findMany: vi.fn().mockResolvedValue([]) },
    aiConversation: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "conversation-1" }),
    },
    aiMessage: { create: vi.fn().mockReturnValue({}) },
    aiUsageLog: { create: vi.fn().mockReturnValue({}) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const chatProvider = {
    capabilities: { providerName: "mock", model: "mock-chat" },
    generateText: vi.fn().mockResolvedValue({
      text: "Grounded answer [S1]",
      inputTokens: 10,
      outputTokens: 5,
    }),
  };
  const chatFactory = { create: vi.fn().mockReturnValue(chatProvider) };
  const retriever = {
    retrieve: vi.fn().mockResolvedValue([
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        title: "Lesson material",
        sourceType: "ACTIVITY_CONTENT",
        courseId: "course-1",
        lessonId: "lesson-1",
        activityId: "activity-1",
        content: "Course context",
        score: 0.9,
      },
    ]),
  };
  const cache = {
    canonicalize: vi
      .fn()
      .mockResolvedValue({ text: "materi", key: "canonical-1" }),
    contextHash: vi.fn().mockReturnValue("context-hash"),
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const service = new AiTutorService(
    config,
    prisma as never,
    chatFactory as never,
    retriever as never,
    new AiRoutingService(config),
    cache as never,
  );
  return { service, prisma, chatFactory, chatProvider, retriever, cache };
}

describe("AiTutorService", () => {
  it("returns grounded answers with citations", async () => {
    const { service, cache } = setup();
    const result = await service.ask("org-1", "user-1", dto);
    expect(result).toMatchObject({
      sourceType: "COURSE_MATERIAL",
      answer: "Grounded answer [S1]",
      citations: [expect.objectContaining({ chunkId: "chunk-1" })],
    });
    expect(cache.put).toHaveBeenCalled();
  });

  it("blocks cheating without calling retrieval or the answer model", async () => {
    const { service, retriever, chatFactory } = setup();
    const result = await service.ask("org-1", "user-1", {
      ...dto,
      question: "kasih jawaban quiz nomor 3",
    });
    expect(result.sourceType).toBe("BLOCKED");
    expect(retriever.retrieve).not.toHaveBeenCalled();
    expect(chatFactory.create).not.toHaveBeenCalled();
  });

  it("enforces assessment display policy before retrieval", async () => {
    const { service, prisma, retriever, chatFactory } = setup();
    prisma.activity.findFirst.mockResolvedValue({
      assessmentDisplayPolicy: { allowAIAssistant: false },
    });
    const result = await service.ask("org-1", "user-1", dto);
    expect(result.sourceType).toBe("BLOCKED");
    expect(retriever.retrieve).not.toHaveBeenCalled();
    expect(chatFactory.create).not.toHaveBeenCalled();
  });

  it("refuses off-topic cooking requests without calling the model", async () => {
    const { service, chatFactory } = setup();
    const result = await service.ask("org-1", "user-1", {
      ...dto,
      question: "cara membuat sayur sop",
    });
    expect(result.sourceType).toBe("OUT_OF_SCOPE");
    expect(chatFactory.create).not.toHaveBeenCalled();
  });

  it("reuses a safe canonical cache entry", async () => {
    const { service, cache, chatFactory } = setup();
    cache.get.mockResolvedValue({
      answer: "Cached grounded answer",
      citations: [],
      suggestions: ["Follow up"],
      provider: "mock",
      model: "mock-chat",
    });
    const result = await service.ask("org-1", "user-1", dto);
    expect(result.cacheHit).toBe(true);
    expect(result.answer).toBe("Cached grounded answer");
    expect(chatFactory.create).not.toHaveBeenCalled();
  });

  it("returns a disabled state without provider calls", async () => {
    const { service, chatFactory } = setup({ AI_ENABLED: "false" });
    const result = await service.ask("org-1", "user-1", dto);
    expect(result.sourceType).toBe("DISABLED");
    expect(chatFactory.create).not.toHaveBeenCalled();
  });
});
