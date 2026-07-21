import { describe, expect, it, vi } from "vitest";
import { createAiConfig } from "@lms/config";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
  LocalEmbeddingProviderFactory,
} from "./ai-provider.factories";
import { AiStatusService } from "./ai-status.service";

describe("AiStatusService", () => {
  it("returns a safe disabled status without provider secrets", async () => {
    const config = createAiConfig({ OPENAI_API_KEY: "must-not-leak" });
    const local = new LocalEmbeddingProviderFactory(config);
    const prisma = { $transaction: vi.fn() };
    const service = new AiStatusService(
      config,
      new AiChatProviderFactory(config),
      new AiEmbeddingProviderFactory(config, local),
      prisma as never,
    );

    const status = await service.getStatus("org-1");
    expect(status.enabled).toBe(false);
    expect(status.needsReindex).toBe(false);
    expect(JSON.stringify(status)).not.toContain("must-not-leak");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reports incompatible local embeddings without changing index state", async () => {
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "replacement/model",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "768",
    });
    const local = new LocalEmbeddingProviderFactory(config);
    const prisma = {
      aiDocumentChunk: { count: vi.fn() },
      aiCanonicalQuestion: { count: vi.fn() },
      aiClassificationPrototype: { count: vi.fn() },
      $transaction: vi
        .fn()
        .mockResolvedValue([1, 0, 0, 0, 0, 0]),
    };
    const service = new AiStatusService(
      config,
      new AiChatProviderFactory(config),
      new AiEmbeddingProviderFactory(config, local),
      prisma as never,
    );

    expect((await service.getStatus("org-1")).needsReindex).toBe(true);
    expect(prisma.aiDocumentChunk.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    );
  });

  it("returns needsReindex when pending reindex counts remain", async () => {
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "replacement/model",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "768",
    });
    const local = new LocalEmbeddingProviderFactory(config);
    const prisma = {
      aiDocumentChunk: { count: vi.fn().mockResolvedValue(2) },
      aiCanonicalQuestion: { count: vi.fn().mockResolvedValue(0) },
      aiClassificationPrototype: { count: vi.fn().mockResolvedValue(1) },
      $transaction: vi.fn().mockResolvedValue([0, 0, 0, 2, 0, 1]),
    };
    const service = new AiStatusService(
      config,
      new AiChatProviderFactory(config),
      new AiEmbeddingProviderFactory(config, local),
      prisma as never,
    );
    expect((await service.getStatus("org-1")).needsReindex).toBe(true);
  });
});
