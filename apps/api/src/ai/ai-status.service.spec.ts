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

  it("marks incompatible local embeddings for reindex", async () => {
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "replacement/model",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "768",
    });
    const local = new LocalEmbeddingProviderFactory(config);
    const updateMany = vi.fn();
    const prisma = {
      aiDocumentChunk: {
        updateMany,
        count: vi.fn(),
        findMany: vi.fn().mockResolvedValue([{ sourceDocumentId: "doc-1" }]),
      },
      aiDocument: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      aiCanonicalQuestion: { updateMany: vi.fn(), count: vi.fn() },
      aiClassificationPrototype: { updateMany: vi.fn(), count: vi.fn() },
      $transaction: vi
        .fn()
        .mockResolvedValue([{ count: 1 }, { count: 0 }, { count: 0 }]),
    };
    const service = new AiStatusService(
      config,
      new AiChatProviderFactory(config),
      new AiEmbeddingProviderFactory(config, local),
      prisma as never,
    );

    expect((await service.getStatus("org-1")).needsReindex).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
        data: { status: "NEEDS_REINDEX" },
      }),
    );
  });
});
