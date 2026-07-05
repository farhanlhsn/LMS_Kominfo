import { describe, expect, it } from "vitest";
import { createAiConfig } from "@lms/config";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
  LocalEmbeddingProviderFactory,
} from "./ai-provider.factories";

describe("AI provider factories", () => {
  it("selects mock providers by default", () => {
    const config = createAiConfig({});
    const local = new LocalEmbeddingProviderFactory(config);
    expect(
      new AiChatProviderFactory(config).create().capabilities.providerName,
    ).toBe("mock");
    expect(
      new AiEmbeddingProviderFactory(config, local).create().capabilities.model,
    ).toBe("mock-embedding");
  });

  it("selects Gemini chat and local embeddings independently", () => {
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "gemini_openai_compatible",
      GEMINI_API_KEY: "secret",
      GEMINI_OPENAI_BASE_URL: "https://example.test/v1",
      GEMINI_CHAT_MODEL: "gemini-test",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "local-test",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "512",
    });
    const local = new LocalEmbeddingProviderFactory(config);
    expect(new AiChatProviderFactory(config).create().capabilities.model).toBe(
      "gemini-test",
    );
    expect(
      new AiEmbeddingProviderFactory(config, local).create().capabilities,
    ).toMatchObject({
      providerName: "transformers_js",
      model: "local-test",
      embeddingDimensions: 512,
    });
  });

  it("fails clearly before factory creation for an unsupported local runtime", () => {
    expect(() =>
      createAiConfig({
        AI_ENABLED: "true",
        AI_EMBEDDING_PROVIDER: "local",
        AI_LOCAL_EMBEDDING_PROVIDER: "unknown_runtime",
        AI_LOCAL_EMBEDDING_MODEL: "model",
        AI_LOCAL_EMBEDDING_DIMENSIONS: "384",
      }),
    ).toThrow("AI_LOCAL_EMBEDDING_PROVIDER has unsupported value");
  });
});
