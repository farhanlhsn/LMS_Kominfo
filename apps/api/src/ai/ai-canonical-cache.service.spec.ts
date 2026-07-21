import { describe, expect, it, vi } from "vitest";
import { AiCanonicalCacheService } from "./ai-canonical-cache.service";

function config(overrides: Record<string, unknown> = {}) {
  return {
    canonicalization: {
      enabled: true,
      similarityThreshold: 0.9,
      ...(overrides.canonicalization as object),
    },
    cache: {
      enabled: true,
      ttlSeconds: 60,
      ...(overrides.cache as object),
    },
    localEmbedding: { queryPrefix: "query:" },
  } as any;
}

function setup(cfg = config()) {
  const prisma = {
    aiCanonicalQuestion: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "can-1", canonicalText: "tcp" }),
    },
    aiAnswerCache: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      create: vi.fn(),
    },
  };
  const provider = {
    embedText: vi.fn().mockResolvedValue([1, 0, 0]),
    capabilities: { providerName: "mock", model: "m1" },
  };
  const embeddingFactory = { create: vi.fn().mockReturnValue(provider) };
  const service = new AiCanonicalCacheService(
    cfg,
    prisma as any,
    embeddingFactory as any,
  );
  return { service, prisma, provider };
}

describe("AiCanonicalCacheService", () => {
  it("returns normalized text when canonicalization disabled", async () => {
    const { service, provider } = setup(
      config({ canonicalization: { enabled: false } }),
    );
    const result = await service.canonicalize("org", "c1", "Apa itu TCP?");
    expect(result.text).toContain("tcp");
    expect(provider.embedText).not.toHaveBeenCalled();
  });

  it("reuses similar canonical question", async () => {
    const { service, prisma, provider } = setup();
    prisma.aiCanonicalQuestion.findMany.mockResolvedValue([
      {
        id: "hit",
        canonicalText: "tcp",
        embedding: [1, 0, 0],
      },
    ]);
    const result = await service.canonicalize("org", "c1", "tcp udp");
    expect(result.key).toBe("hit");
    expect(provider.embedText).toHaveBeenCalled();
  });

  it("creates canonical when no match", async () => {
    const { service, prisma } = setup();
    prisma.aiCanonicalQuestion.findMany.mockResolvedValue([
      { id: "other", canonicalText: "x", embedding: [0, 1, 0] },
    ]);
    const result = await service.canonicalize("org", null, "Hello world");
    expect(result.key).toBe("can-1");
    expect(prisma.aiCanonicalQuestion.create).toHaveBeenCalled();
  });

  it("contextHash is stable", () => {
    const { service } = setup();
    expect(service.contextHash(["a", "b"])).toBe(service.contextHash(["a", "b"]));
  });

  it("get returns null when disabled or missing", async () => {
    const disabled = setup(config({ cache: { enabled: false } }));
    expect(await disabled.service.get("o", null, "k", "h")).toBeNull();

    const { service, prisma } = setup();
    expect(await service.get("o", null, "k", "h")).toBeNull();
    prisma.aiAnswerCache.findFirst.mockResolvedValue({ id: "c1", answer: "ok" });
    const hit = await service.get("o", "course", "k", "h");
    expect(hit).toEqual({ id: "c1", answer: "ok" });
    expect(prisma.aiAnswerCache.update).toHaveBeenCalled();
  });

  it("put creates or updates cache entries", async () => {
    const disabled = setup(config({ cache: { enabled: false } }));
    await disabled.service.put({
      organizationId: "o",
      courseId: null,
      canonicalQuestion: "q",
      canonicalKey: "k",
      contextHash: "h",
      sourceType: "COURSE_MATERIAL",
      answer: "a",
      citations: [],
      suggestions: [],
      provider: "mock",
      model: null,
    });

    const { service, prisma } = setup();
    await service.put({
      organizationId: "o",
      courseId: "c",
      canonicalQuestion: "q",
      canonicalKey: "k",
      contextHash: "h",
      sourceType: "GENERAL_EDUCATIONAL",
      answer: "a",
      citations: [],
      suggestions: ["s"],
      provider: "mock",
      model: "m",
    });
    expect(prisma.aiAnswerCache.create).toHaveBeenCalled();

    prisma.aiAnswerCache.findFirst.mockResolvedValue({ id: "existing" });
    await service.put({
      organizationId: "o",
      courseId: "c",
      canonicalQuestion: "q",
      canonicalKey: "k",
      contextHash: "h",
      sourceType: "COURSE_MATERIAL",
      answer: "b",
      citations: [],
      suggestions: [],
      provider: "mock",
      model: null,
    });
    expect(prisma.aiAnswerCache.update).toHaveBeenCalled();
  });
});
