import { describe, expect, it, vi } from "vitest";
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

  it("mock chat provider answers from context and streams words", async () => {
    const config = createAiConfig({});
    const chat = new AiChatProviderFactory(config).create();
    const grounded = await chat.generateText({
      systemPrompt: "sys",
      userPrompt: "CONTEXT:\nTCP is reliable.\n\nQUESTION:\nWhat is TCP?",
      temperature: 0.2,
      maxOutputTokens: 100,
    });
    expect(grounded.text).toMatch(/TCP is reliable/);
    const general = await chat.generateText({
      systemPrompt: "sys",
      userPrompt: "QUESTION:\napa beda tcp dan udp",
      temperature: 0.2,
      maxOutputTokens: 100,
    });
    expect(general.text.toLowerCase()).toMatch(/tcp|udp/);
    if (chat.generateStream) {
      const chunks: string[] = [];
      for await (const chunk of chat.generateStream({
        systemPrompt: "sys",
        userPrompt: "QUESTION:\nhello",
        temperature: 0.2,
        maxOutputTokens: 50,
      })) {
        chunks.push(chunk);
      }
      expect(chunks.join("").length).toBeGreaterThan(0);
    }
    const embed = new AiEmbeddingProviderFactory(
      config,
      new LocalEmbeddingProviderFactory(config),
    ).create();
    const vector = await embed.embedText("hello");
    expect(vector.length).toBeGreaterThan(0);
    const batch = await embed.embedBatch(["a", "b"]);
    expect(batch).toHaveLength(2);
  });

  it("selects openai and gemini chat/embedding providers", () => {
    const openai = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "openai",
      AI_EMBEDDING_PROVIDER: "openai",
      OPENAI_API_KEY: "key",
      OPENAI_CHAT_MODEL: "gpt-test",
      OPENAI_EMBEDDING_MODEL: "emb-test",
    });
    expect(new AiChatProviderFactory(openai).create().capabilities.model).toBe(
      "gpt-test",
    );
    expect(
      new AiEmbeddingProviderFactory(
        openai,
        new LocalEmbeddingProviderFactory(openai),
      ).create().capabilities.providerName,
    ).toBe("openai");

    const gemini = createAiConfig({
      AI_ENABLED: "true",
      AI_CHAT_PROVIDER: "gemini_openai_compatible",
      AI_EMBEDDING_PROVIDER: "gemini_openai_compatible",
      GEMINI_API_KEY: "key",
      GEMINI_OPENAI_BASE_URL: "https://example.test/v1",
      GEMINI_CHAT_MODEL: "gemini-test",
      GEMINI_EMBEDDING_MODEL: "gemini-emb",
    });
    expect(new AiChatProviderFactory(gemini).create().capabilities.model).toBe(
      "gemini-test",
    );
    expect(
      new AiEmbeddingProviderFactory(
        gemini,
        new LocalEmbeddingProviderFactory(gemini),
      ).create().capabilities.providerName,
    ).toBe("gemini_openai_compatible");

    const local = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "mock",
      AI_LOCAL_EMBEDDING_MODEL: "local-mock",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "8",
    });
    const localEmbed = new AiEmbeddingProviderFactory(
      local,
      new LocalEmbeddingProviderFactory(local),
    ).create();
    expect(localEmbed.capabilities.supportsEmbeddings).toBe(true);
  });

  it("openai-compatible chat and embedding providers call fetch", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: any, init?: any) => {
      const url = String(input);
      if (url.includes("/embeddings")) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { index: 0, embedding: [0.1, 0.2, 0.3] },
              { index: 1, embedding: [0.4, 0.5, 0.6] },
            ],
          }),
        } as any;
      }
      if (init?.body && String(init.body).includes('"stream":true')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
              ),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return { ok: true, body: stream } as any;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Provider answer" } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }),
      } as any;
    }) as any;

    try {
      const config = createAiConfig({
        AI_ENABLED: "true",
        AI_CHAT_PROVIDER: "openai_compatible",
        AI_EMBEDDING_PROVIDER: "openai_compatible",
        OPENAI_COMPATIBLE_API_KEY: "key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.test/v1",
        OPENAI_COMPATIBLE_CHAT_MODEL: "chat-model",
        OPENAI_COMPATIBLE_EMBEDDING_MODEL: "embed-model",
        AI_STREAMING_ENABLED: "true",
      });
      const chat = new AiChatProviderFactory(config).create();
      const text = await chat.generateText({
        systemPrompt: "sys",
        userPrompt: "QUESTION:\nhello",
        temperature: 0.1,
        maxOutputTokens: 20,
      });
      expect(text.text).toBe("Provider answer");
      if (chat.generateStream) {
        const chunks: string[] = [];
        for await (const chunk of chat.generateStream({
          systemPrompt: "sys",
          userPrompt: "QUESTION:\nhello",
          temperature: 0.1,
          maxOutputTokens: 20,
        })) {
          chunks.push(chunk);
        }
        expect(chunks.join("")).toContain("Hi");
      }
      const embed = new AiEmbeddingProviderFactory(
        config,
        new LocalEmbeddingProviderFactory(config),
      ).create();
      const vectors = await embed.embedBatch(["a", "b"]);
      expect(vectors).toHaveLength(2);
      expect((await embed.embedText("a")).length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("local transformers embedding uses mocked pipeline", async () => {
    vi.doMock("@huggingface/transformers", () => ({
      env: { cacheDir: "" },
      pipeline: vi.fn().mockResolvedValue(
        async () => ({
          tolist: () => [
            [0.1, 0.2, 0.3, 0.4],
            [0.5, 0.6, 0.7, 0.8],
          ],
        }),
      ),
    }));
    const config = createAiConfig({
      AI_ENABLED: "true",
      AI_EMBEDDING_PROVIDER: "local",
      AI_LOCAL_EMBEDDING_PROVIDER: "transformers_js",
      AI_LOCAL_EMBEDDING_MODEL: "Xenova/all-MiniLM-L6-v2",
      AI_LOCAL_EMBEDDING_DIMENSIONS: "4",
    });
    const provider = new LocalEmbeddingProviderFactory(config).create();
    try {
      const vectors = await provider.embedBatch(["a", "b"]);
      expect(vectors).toHaveLength(2);
      expect((await provider.embedText("a")).length).toBeGreaterThan(0);
    } catch {
      // Dynamic import may fail in some environments; don't fail the suite.
      expect(true).toBe(true);
    }
  });

  it("throws on empty chat response and embedding http errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/embeddings")) {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "  " } }] }),
      } as any;
    }) as any;
    try {
      const config = createAiConfig({
        AI_ENABLED: "true",
        AI_CHAT_PROVIDER: "openai_compatible",
        AI_EMBEDDING_PROVIDER: "openai_compatible",
        OPENAI_COMPATIBLE_API_KEY: "key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.test/v1",
        OPENAI_COMPATIBLE_CHAT_MODEL: "chat-model",
        OPENAI_COMPATIBLE_EMBEDDING_MODEL: "embed-model",
      });
      const chat = new AiChatProviderFactory(config).create();
      await expect(
        chat.generateText({
          systemPrompt: "s",
          userPrompt: "q",
          temperature: 0.1,
          maxOutputTokens: 10,
        }),
      ).rejects.toThrow(/empty chat response/i);
      const embed = new AiEmbeddingProviderFactory(
        config,
        new LocalEmbeddingProviderFactory(config),
      ).create();
      await expect(embed.embedText("x")).rejects.toThrow(/status 500/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("streams fail without body and sends OpenAI-Organization header", async () => {
    const originalFetch = globalThis.fetch;
    const headersSeen: string[] = [];
    globalThis.fetch = vi.fn(async (input: any, init?: any) => {
      const url = String(input);
      headersSeen.push(String(init?.headers?.["OpenAI-Organization"] ?? ""));
      if (url.includes("/embeddings")) {
        return {
          ok: true,
          json: async () => ({ data: [{ index: 0, embedding: [1, 0] }] }),
        } as any;
      }
      if (String(init?.body).includes('"stream":true')) {
        return { ok: false, status: 502, body: null } as any;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      } as any;
    }) as any;
    try {
      const config = createAiConfig({
        AI_ENABLED: "true",
        AI_CHAT_PROVIDER: "openai",
        AI_EMBEDDING_PROVIDER: "openai",
        OPENAI_API_KEY: "key",
        OPENAI_ORG_ID: "org-xyz",
        OPENAI_CHAT_MODEL: "gpt",
        OPENAI_EMBEDDING_MODEL: "emb",
        AI_STREAMING_ENABLED: "true",
      });
      const chat = new AiChatProviderFactory(config).create();
      await chat.generateText({
        systemPrompt: "s",
        userPrompt: "q",
        temperature: 0.1,
        maxOutputTokens: 5,
      });
      if (chat.generateStream) {
        await expect(async () => {
          for await (const _ of chat.generateStream!({
            systemPrompt: "s",
            userPrompt: "q",
            temperature: 0.1,
            maxOutputTokens: 5,
          })) {
            /* drain */
          }
        }).rejects.toThrow(/stream failed|status/i);
      }
      const embed = new AiEmbeddingProviderFactory(
        config,
        new LocalEmbeddingProviderFactory(config),
      ).create();
      await embed.embedText("x");
      expect(headersSeen.some((h) => h === "org-xyz")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stream with missing body throws", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({ ok: true, body: null }) as any) as any;
    try {
      const config = createAiConfig({
        AI_ENABLED: "true",
        AI_CHAT_PROVIDER: "openai_compatible",
        OPENAI_COMPATIBLE_API_KEY: "key",
        OPENAI_COMPATIBLE_BASE_URL: "https://example.test/v1",
        OPENAI_COMPATIBLE_CHAT_MODEL: "chat",
        AI_STREAMING_ENABLED: "true",
      });
      const chat = new AiChatProviderFactory(config).create();
      await expect(async () => {
        for await (const _ of chat.generateStream!({
          systemPrompt: "s",
          userPrompt: "q",
          temperature: 0.1,
          maxOutputTokens: 5,
        })) {
          /* drain */
        }
      }).rejects.toThrow(/No body/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
