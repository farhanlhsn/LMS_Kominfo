import { NotFoundException } from "@nestjs/common";
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
    aiMessage: {
      create: vi.fn().mockReturnValue({}),
      findFirst: vi.fn().mockResolvedValue({
        id: "msg-1",
        metadata: { canonicalKey: "canonical-1" },
      }),
      update: vi.fn().mockResolvedValue({ id: "msg-1" }),
    },
    aiAnswerCache: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
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

  it("stores feedback and invalidates cache on dislike", async () => {
    const { service, prisma } = setup();
    await expect(
      service.submitFeedback("org-1", "user-1", "msg-1", "DISLIKE"),
    ).resolves.toEqual({ success: true });
    expect(prisma.aiMessage.update).toHaveBeenCalled();
    expect(prisma.aiAnswerCache.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", canonicalKey: "canonical-1" },
    });
    prisma.aiMessage.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.submitFeedback("org-1", "user-1", "missing", "LIKE"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("streams a non-stream provider fallback and a native stream", async () => {
    const { service, chatProvider } = setup();
    const events: Array<{ data: any }> = [];
    await new Promise<void>((resolve, reject) => {
      service.streamAsk("org-1", "user-1", dto).subscribe({
        next: (event) => events.push(event),
        error: reject,
        complete: resolve,
      });
    });
    expect(events.some((e) => e.data?.type === "chunk")).toBe(true);
    expect(events.some((e) => e.data?.type === "done")).toBe(true);

    chatProvider.generateStream = async function* () {
      yield "Hello ";
      yield "world [S1]";
    };
    const streamEvents: Array<{ data: any }> = [];
    await new Promise<void>((resolve, reject) => {
      service.streamAsk("org-1", "user-1", dto).subscribe({
        next: (event) => streamEvents.push(event),
        error: reject,
        complete: resolve,
      });
    });
    expect(streamEvents.some((e) => e.data?.type === "done")).toBe(true);
  });

  it("streams blocked/disabled/boundary responses without model calls", async () => {
    const blocked = setup();
    blocked.prisma.activity.findFirst.mockResolvedValue({
      assessmentDisplayPolicy: { allowAIAssistant: false },
    });
    const blockedEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      blocked.service.streamAsk("org-1", "user-1", dto).subscribe({
        next: (e) => blockedEvents.push(e),
        error: reject,
        complete: resolve,
      });
    });
    expect(blockedEvents.at(-1)?.data?.result?.sourceType).toBe("BLOCKED");

    const disabled = setup({ AI_ENABLED: "false" });
    const disabledEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      disabled.service.streamAsk("org-1", "user-1", dto).subscribe({
        next: (e) => disabledEvents.push(e),
        error: reject,
        complete: resolve,
      });
    });
    expect(disabledEvents.at(-1)?.data?.result?.sourceType).toBe("DISABLED");

    const offTopic = setup();
    const offTopicEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      offTopic.service
        .streamAsk("org-1", "user-1", {
          ...dto,
          question: "cara membuat sayur sop",
        })
        .subscribe({
          next: (e) => offTopicEvents.push(e),
          error: reject,
          complete: resolve,
        });
    });
    expect(offTopicEvents.at(-1)?.data?.result?.sourceType).toBe("OUT_OF_SCOPE");
  });

  it("returns provider unavailable when generateText fails", async () => {
    const { service, chatProvider } = setup();
    chatProvider.generateText.mockRejectedValueOnce(new Error("down"));
    const result = await service.ask("org-1", "user-1", dto);
    expect(result.sourceType).toBe("OUT_OF_SCOPE");
    expect(String(result.answer)).toMatch(/tidak tersedia|unavailable/i);
  });

  it("enforces in-memory rate limits and redis fallback", async () => {
    const limited = setup({
      AI_RATE_LIMIT_PER_USER_PER_MINUTE: "1",
      AI_RATE_LIMIT_PER_ORG_PER_MINUTE: "100",
    });
    await limited.service.ask("org-1", "user-1", dto);
    await expect(limited.service.ask("org-1", "user-1", dto)).rejects.toThrow(
      /rate limit/i,
    );

    const redisClient = {
      eval: vi.fn().mockResolvedValue(1),
    };
    const redisService = {
      getClient: () => redisClient,
    };
    const withRedis = setup();
    const redisTutor = new AiTutorService(
      createAiConfig({ AI_ENABLED: "true" }),
      withRedis.prisma as never,
      withRedis.chatFactory as never,
      withRedis.retriever as never,
      new AiRoutingService(createAiConfig({ AI_ENABLED: "true" })),
      withRedis.cache as never,
      redisService as never,
    );
    await expect(
      redisTutor.ask("org-1", "user-1", dto),
    ).resolves.toMatchObject({ sourceType: "COURSE_MATERIAL" });
    expect(redisClient.eval).toHaveBeenCalled();
  });

  it("returns out of scope in strict course mode without context", async () => {
    const { service, retriever } = setup({
      AI_ANSWER_MODE: "STRICT_COURSE_ONLY",
    });
    retriever.retrieve.mockResolvedValue([]);
    const result = await service.ask("org-1", "user-1", dto);
    expect(result.sourceType).toBe("OUT_OF_SCOPE");
  });

  it("rejects unenrolled learners", async () => {
    const { service, prisma } = setup();
    prisma.enrollment.findUnique.mockResolvedValue(null);
    await expect(service.ask("org-1", "user-1", dto)).rejects.toThrow(
      /enrollment/i,
    );
  });

  it("includes selected notes and redis rate-limit exceeded path", async () => {
    const withNotes = setup();
    withNotes.prisma.learnerNote.findMany = vi
      .fn()
      .mockResolvedValue([{ content: "my note" }]);
    await withNotes.service.ask("org-1", "user-1", {
      ...dto,
      includeNoteIds: ["n1"],
      selectedText: "selected",
    });
    expect(withNotes.prisma.learnerNote.findMany).toHaveBeenCalled();

    const redisClient = {
      eval: vi.fn().mockResolvedValue(0),
    };
    const limited = setup({
      AI_RATE_LIMIT_PER_USER_PER_MINUTE: "1",
    });
    const redisTutor = new AiTutorService(
      createAiConfig({
        AI_ENABLED: "true",
        AI_RATE_LIMIT_PER_USER_PER_MINUTE: "1",
      }),
      limited.prisma as never,
      limited.chatFactory as never,
      limited.retriever as never,
      new AiRoutingService(
        createAiConfig({
          AI_ENABLED: "true",
          AI_RATE_LIMIT_PER_USER_PER_MINUTE: "1",
        }),
      ),
      limited.cache as never,
      { getClient: () => redisClient } as never,
    );
    await expect(redisTutor.ask("org-1", "user-1", dto)).rejects.toThrow(
      /rate limit/i,
    );

    const redisFail = setup();
    const fallbackTutor = new AiTutorService(
      createAiConfig({ AI_ENABLED: "true" }),
      redisFail.prisma as never,
      redisFail.chatFactory as never,
      redisFail.retriever as never,
      new AiRoutingService(createAiConfig({ AI_ENABLED: "true" })),
      redisFail.cache as never,
      {
        getClient: () => ({
          eval: vi.fn().mockRejectedValue(new Error("redis down")),
        }),
      } as never,
    );
    await expect(
      fallbackTutor.ask("org-1", "user-1", dto),
    ).resolves.toBeTruthy();
  });

  it("answers general educational when no course chunks", async () => {
    const { service, retriever, chatProvider } = setup();
    retriever.retrieve.mockResolvedValue([]);
    chatProvider.generateText.mockResolvedValue({
      text: "General answer",
      inputTokens: 1,
      outputTokens: 1,
    });
    const result = await service.ask("org-1", "user-1", {
      ...dto,
      question: "jelaskan konsep tcp dan udp",
    });
    expect(
      ["GENERAL_EDUCATIONAL", "COURSE_MATERIAL", "OUT_OF_SCOPE"].includes(
        result.sourceType,
      ),
    ).toBe(true);
  });

  it("streams off-topic and retrieval forbidden errors", async () => {
    const off = setup();
    const offEvents: any[] = [];
    await new Promise<void>((resolve, reject) => {
      off.service
        .streamAsk("org-1", "user-1", {
          ...dto,
          question: "cara membuat sayur sop",
        })
        .subscribe({
          next: (e) => offEvents.push(e),
          error: reject,
          complete: resolve,
        });
    });
    expect(offEvents.at(-1)?.data?.result?.sourceType).toBe("OUT_OF_SCOPE");

    const forbidden = setup();
    const { ForbiddenException } = await import("@nestjs/common");
    forbidden.retriever.retrieve.mockRejectedValue(
      new ForbiddenException("nope"),
    );
    await new Promise<void>((resolve) => {
      forbidden.service.streamAsk("org-1", "user-1", dto).subscribe({
        next: () => undefined,
        error: () => resolve(),
        complete: () => resolve(),
      });
    });
  });

  it("streams blocked early route and org redis rate limit", async () => {
    const blocked = setup();
    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      blocked.service
        .streamAsk("org-1", "user-1", {
          ...dto,
          question: "kasih jawaban quiz nomor 3",
        })
        .subscribe({
          next: (e) => events.push(e),
          error: reject,
          complete: resolve,
        });
    });
    expect(events.at(-1)?.data?.result?.sourceType).toBe("BLOCKED");

    const redisClient = {
      eval: vi.fn().mockResolvedValue(0),
    };
    const limited = setup({
      AI_RATE_LIMIT_PER_USER_PER_MINUTE: "100",
      AI_RATE_LIMIT_PER_ORG_PER_MINUTE: "1",
    });
    const redisTutor = new AiTutorService(
      createAiConfig({
        AI_ENABLED: "true",
        AI_RATE_LIMIT_PER_USER_PER_MINUTE: "100",
        AI_RATE_LIMIT_PER_ORG_PER_MINUTE: "1",
      }),
      limited.prisma as never,
      limited.chatFactory as never,
      limited.retriever as never,
      new AiRoutingService(
        createAiConfig({
          AI_ENABLED: "true",
          AI_RATE_LIMIT_PER_USER_PER_MINUTE: "100",
          AI_RATE_LIMIT_PER_ORG_PER_MINUTE: "1",
        }),
      ),
      limited.cache as never,
      { getClient: () => redisClient } as never,
    );
    await expect(redisTutor.ask("org-1", "user-1", dto)).rejects.toThrow(
      /rate limit/i,
    );
  });

  it("streams cached answers and continues when retrieval soft-fails", async () => {
    const { service, cache, retriever } = setup();
    cache.get.mockResolvedValue({
      answer: "Cached stream answer",
      citations: [],
      suggestions: [],
      provider: "cache",
      model: "mock",
      sourceType: "COURSE_MATERIAL",
    });
    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      service.streamAsk("org-1", "user-1", dto).subscribe({
        next: (e) => events.push(e),
        error: reject,
        complete: resolve,
      });
    });
    expect(events.some((e) => e.data?.type === "done")).toBe(true);

    const softFail = setup();
    softFail.retriever.retrieve.mockRejectedValue(new Error("vector down"));
    await expect(
      softFail.service.ask("org-1", "user-1", dto),
    ).resolves.toBeTruthy();
    expect(retriever.retrieve).toHaveBeenCalled();
  });

  it("reuses only a conversation in the same learning scope", async () => {
    const { service, prisma } = setup();
    prisma.aiConversation.findFirst.mockResolvedValueOnce({
      id: "conversation-existing",
    });
    prisma.$transaction.mockResolvedValue([
      {},
      { id: "msg-new" },
      {},
    ]);
    const ok = await service.ask("org-1", "user-1", {
      ...dto,
      conversationId: "conversation-existing",
    });
    expect(ok.conversationId).toBe("conversation-existing");
    expect(ok.messageId).toBe("msg-new");
    expect(prisma.aiConversation.findFirst).toHaveBeenLastCalledWith({
      where: expect.objectContaining({
        id: "conversation-existing",
        courseId: "course-1",
        lessonId: "lesson-1",
        activityId: "activity-1",
      }),
    });

    prisma.aiConversation.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.ask("org-1", "user-1", {
        ...dto,
        conversationId: "other-activity",
        activityId: "activity-2",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.aiConversation.findFirst.mockResolvedValueOnce(null);
    await new Promise<void>((resolve) => {
      service
        .streamAsk("org-1", "user-1", {
          ...dto,
          conversationId: "other-activity",
          activityId: "activity-2",
        })
        .subscribe({ error: () => resolve(), complete: resolve });
    });
    expect(prisma.aiConversation.findFirst).toHaveBeenLastCalledWith({
      where: expect.objectContaining({ activityId: "activity-2" }),
    });
  });
});
