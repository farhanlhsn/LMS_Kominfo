import { describe, expect, it } from "vitest";
import {
  API_VERSION_PREFIX,
  createAiConfig,
  DEFAULT_PORTS,
  DEFAULT_TIMEZONE,
  readRequiredEnv,
  validateEnvironment,
} from "./index";


describe("createAiConfig", () => {
  it("uses disabled mock defaults without provider keys", () => {
    const config = createAiConfig({});
    expect(config.enabled).toBe(false);
    expect(config.chatProvider).toBe("mock");
    expect(config.embeddingProvider).toBe("mock");
    expect(config.usage.logPrompts).toBe(false);
  });

  it("does not validate unused providers", () => {
    expect(() =>
      createAiConfig({ AI_ENABLED: "true", AI_CHAT_PROVIDER: "mock" }),
    ).not.toThrow();
  });

  it.each([
    ["openai", { OPENAI_API_KEY: "key", OPENAI_CHAT_MODEL: "chat" }],
    [
      "openai_compatible",
      {
        OPENAI_COMPATIBLE_API_KEY: "key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.test/v1",
        OPENAI_COMPATIBLE_CHAT_MODEL: "chat",
      },
    ],
    [
      "gemini_openai_compatible",
      {
        GEMINI_API_KEY: "key",
        GEMINI_OPENAI_BASE_URL: "https://example.test/v1",
        GEMINI_CHAT_MODEL: "gemini",
      },
    ],
  ])("validates selected %s chat provider", (provider, selected) => {
    expect(() =>
      createAiConfig({
        AI_ENABLED: "true",
        AI_CHAT_PROVIDER: provider,
        ...selected,
      }),
    ).not.toThrow();
    expect(() =>
      createAiConfig({ AI_ENABLED: "true", AI_CHAT_PROVIDER: provider }),
    ).toThrow(`AI_CHAT_PROVIDER=${provider} requires`);
  });

  it("requires only local model configuration for local embeddings", () => {
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "custom/model",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "768",
    });
    expect(config.localEmbedding.model).toBe("custom/model");
    expect(config.localEmbedding.dimensions).toBe(768);
  });

  it.each([
    ["openai", { OPENAI_API_KEY: "key", OPENAI_EMBEDDING_MODEL: "embedding" }],
    [
      "openai_compatible",
      {
        OPENAI_COMPATIBLE_API_KEY: "key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.test/v1",
        OPENAI_COMPATIBLE_EMBEDDING_MODEL: "embedding",
      },
    ],
    [
      "gemini_openai_compatible",
      {
        GEMINI_API_KEY: "key",
        GEMINI_OPENAI_BASE_URL: "https://example.test/v1",
        GEMINI_EMBEDDING_MODEL: "embedding",
      },
    ],
  ])("validates selected %s embedding provider", (provider, selected) => {
    expect(() =>
      createAiConfig({
        AI_ENABLED: "true",
        AI_EMBEDDING_PROVIDER: provider,
        ...selected,
      }),
    ).not.toThrow();
    expect(() =>
      createAiConfig({ AI_ENABLED: "true", AI_EMBEDDING_PROVIDER: provider }),
    ).toThrow(`AI_EMBEDDING_PROVIDER=${provider} requires`);
  });

  it("parses booleans, numbers, and thresholds safely", () => {
    const config = createAiConfig({
      AI_STREAMING_ENABLED: "false",
      AI_MAX_OUTPUT_TOKENS: "1200",
      AI_RAG_MIN_SCORE: "0.45",
    });
    expect(config.streamingEnabled).toBe(false);
    expect(config.maxOutputTokens).toBe(1200);
    expect(config.rag.minScore).toBe(0.45);
    expect(() => createAiConfig({ AI_ENABLED: "yes" })).toThrow(
      "AI_ENABLED must be either true or false",
    );
  });

  it("rejects invalid providers and numeric limits clearly", () => {
    expect(() => createAiConfig({ AI_CHAT_PROVIDER: "other" })).toThrow(
      "AI_CHAT_PROVIDER has unsupported value",
    );
    expect(() =>
      createAiConfig({ AI_LOCAL_EMBEDDING_PROVIDER: "other" }),
    ).toThrow("AI_LOCAL_EMBEDDING_PROVIDER has unsupported value");
    expect(() => createAiConfig({ AI_FOLLOWUP_SUGGESTION_COUNT: "6" })).toThrow(
      "AI_FOLLOWUP_SUGGESTION_COUNT must be at most 5",
    );
  });

  it("allows the local classifier to be disabled", () => {
    expect(
      createAiConfig({ AI_LOCAL_CLASSIFIER_ENABLED: "false" }).localClassifier
        .enabled,
    ).toBe(false);
  });

  it("rejects non-integer and out-of-range numbers", () => {
    expect(() =>
      createAiConfig({ AI_RATE_LIMIT_PER_USER_PER_MINUTE: "1.5" }),
    ).toThrow(/must be an integer/);
    expect(() =>
      createAiConfig({ AI_RATE_LIMIT_PER_USER_PER_MINUTE: "0" }),
    ).toThrow(/must be at least/);
    expect(() => createAiConfig({ AI_MAX_OUTPUT_TOKENS: "not-a-number" })).toThrow(
      /must be a number/,
    );
  });

  it("exports package constants and validateEnvironment", () => {
    expect(API_VERSION_PREFIX).toBe("api/v1");
    expect(DEFAULT_TIMEZONE).toBe("UTC");
    expect(DEFAULT_PORTS.api).toBe(4000);
    expect(validateEnvironment({})).toEqual({});
  });

  it("readRequiredEnv requires process env", () => {
    const key = "LMS_TEST_REQUIRED_ENV_KEY";
    const prev = process.env[key];
    delete process.env[key];
    try {
      expect(() => readRequiredEnv(key)).toThrow(/Missing required/);
      process.env[key] = "present";
      expect(readRequiredEnv(key)).toBe("present");
    } finally {
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
  });
});

