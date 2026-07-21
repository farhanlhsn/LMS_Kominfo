import { Inject, Injectable } from "@nestjs/common";
import {
  AI_CONFIG,
  type AiConfig,
  type AiProviderConnectionConfig,
} from "@lms/config";
import {
  deterministicEmbedding,
  estimateTokens,
  normalizeVector,
  type AiChatProvider,
  type AiChatRequest,
  type AiChatResult,
  type AiEmbeddingProvider,
  type AiProviderCapabilities,
  type LocalEmbeddingProvider,
} from "./ai-provider.types";

function capabilities(
  providerName: string,
  model: string | null,
  overrides: Partial<AiProviderCapabilities>,
): AiProviderCapabilities {
  return {
    supportsChat: false,
    supportsStreaming: false,
    supportsEmbeddings: false,
    supportsBatchEmbeddings: false,
    supportsToolCalling: false,
    supportsStructuredOutput: false,
    supportsVision: false,
    providerName,
    model,
    ...overrides,
  };
}

class MockChatProvider implements AiChatProvider {
  readonly capabilities = capabilities("mock", "mock-chat", {
    supportsChat: true,
    supportsStreaming: true,
  });

  async generateText(request: AiChatRequest): Promise<AiChatResult> {
    const contextMatch = request.userPrompt.match(
      /CONTEXT:\n([\s\S]*?)\n\nQUESTION:/,
    );
    const question = request.userPrompt.split("QUESTION:").at(-1)?.trim() ?? "";
    const context = contextMatch?.[1]?.trim();
    const tcpUdp = /\btcp\b/i.test(question) && /\budp\b/i.test(question);
    const text = context
      ? `Berdasarkan materi yang tersedia: ${context.slice(0, 700)}${context.length > 700 ? "..." : ""}`
      : tcpUdp
        ? "Sebagai pengetahuan edukasional umum: TCP mengutamakan koneksi, urutan, dan keandalan pengiriman data. UDP mengutamakan latensi rendah dengan overhead lebih kecil tanpa menjamin paket tiba atau berurutan. TCP umum dipakai untuk web dan transfer file, sedangkan UDP cocok untuk streaming real-time, permainan daring, dan DNS."
        : `Sebagai pengetahuan edukasional umum, pertanyaan ini membahas: ${question}. Gunakan sumber pembelajaran tepercaya untuk memperdalam konsepnya.`;
    return {
      text,
      inputTokens: estimateTokens(request.systemPrompt + request.userPrompt),
      outputTokens: estimateTokens(text),
    };
  }

  async *generateStream(request: AiChatRequest): AsyncGenerator<string> {
    const result = await this.generateText(request);
    const words = result.text.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
}

class OpenAiCompatibleChatProvider implements AiChatProvider {
  readonly capabilities: AiProviderCapabilities;

  constructor(
    providerName: string,
    private readonly connection: AiProviderConnectionConfig,
    private readonly timeoutMs: number,
    private readonly streamingEnabled: boolean,
  ) {
    this.capabilities = capabilities(
      providerName,
      connection.chatModel ?? null,
      {
        supportsChat: true,
        supportsStreaming: streamingEnabled,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
      },
    );
  }

  async generateText(request: AiChatRequest): Promise<AiChatResult> {
    const response = await this.request("chat/completions", {
      model: this.connection.chatModel,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature,
      max_tokens: request.maxOutputTokens,
      stream: false,
    });
    const body = response as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("AI provider returned an empty chat response");
    return {
      text,
      inputTokens:
        body.usage?.prompt_tokens ?? estimateTokens(request.userPrompt),
      outputTokens: body.usage?.completion_tokens ?? estimateTokens(text),
    };
  }

  private async request(
    path: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const baseUrl = this.connection.baseUrl?.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.connection.apiKey}`,
          ...(this.connection.organizationId
            ? { "OpenAI-Organization": this.connection.organizationId }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `AI provider request failed with status ${response.status}`,
        );
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async *generateStream(request: AiChatRequest): AsyncGenerator<string> {
    const baseUrl = this.connection.baseUrl?.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.connection.apiKey}`,
        ...(this.connection.organizationId
          ? { "OpenAI-Organization": this.connection.organizationId }
          : {}),
      },
      body: JSON.stringify({
        model: this.connection.chatModel,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: request.temperature,
        max_tokens: request.maxOutputTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider stream failed with status ${response.status}`);
    }
    
    if (!response.body) throw new Error("No body in stream");
    
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    for await (const chunk of response.body as any) {
      buffer += decoder.decode(chunk, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const data = event
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.replace(/^data: /, ""))
          .join("\n")
          .trim();
        if (!data) continue;
        if (data === "[DONE]") return;
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

class MockEmbeddingProvider implements AiEmbeddingProvider {
  readonly capabilities: AiProviderCapabilities;
  constructor(private readonly dimensions: number) {
    this.capabilities = capabilities("mock", "mock-embedding", {
      supportsEmbeddings: true,
      supportsBatchEmbeddings: true,
      embeddingDimensions: dimensions,
    });
  }
  async embedText(text: string) {
    return deterministicEmbedding(text, this.dimensions);
  }
  async embedBatch(texts: string[]) {
    return Promise.all(texts.map((text) => this.embedText(text)));
  }
}

class OpenAiCompatibleEmbeddingProvider implements AiEmbeddingProvider {
  readonly capabilities: AiProviderCapabilities;
  constructor(
    providerName: string,
    private readonly connection: AiProviderConnectionConfig,
    private readonly timeoutMs: number,
  ) {
    this.capabilities = capabilities(
      providerName,
      connection.embeddingModel ?? null,
      {
        supportsEmbeddings: true,
        supportsBatchEmbeddings: true,
      },
    );
  }

  async embedText(text: string): Promise<number[]> {
    return (await this.embedBatch([text]))[0] ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(
        `${this.connection.baseUrl?.replace(/\/$/, "")}/embeddings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.connection.apiKey}`,
            ...(this.connection.organizationId
              ? { "OpenAI-Organization": this.connection.organizationId }
              : {}),
          },
          body: JSON.stringify({
            model: this.connection.embeddingModel,
            input: texts,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(
          `Embedding provider request failed with status ${response.status}`,
        );
      }
      const body = (await response.json()) as {
        data?: Array<{ index: number; embedding: number[] }>;
      };
      return (body.data ?? [])
        .sort((left, right) => left.index - right.index)
        .map((item) => normalizeVector(item.embedding));
    } finally {
      clearTimeout(timer);
    }
  }
}

class TransformersJsEmbeddingProvider implements LocalEmbeddingProvider {
  readonly capabilities: AiProviderCapabilities;
  private extractor?: Promise<
    (input: string | string[], options: object) => Promise<unknown>
  >;

  constructor(
    private readonly config: AiConfig["localEmbedding"],
    readonly revision?: string,
  ) {
    this.capabilities = capabilities("transformers_js", config.model, {
      supportsEmbeddings: true,
      supportsBatchEmbeddings: true,
      embeddingDimensions: config.dimensions,
    });
  }

  async embedText(text: string): Promise<number[]> {
    return (await this.embedBatch([text]))[0] ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor();
    const output = (await extractor(texts, {
      pooling: "mean",
      normalize: this.config.normalize,
    })) as { tolist?: () => number[][] };
    const vectors = output.tolist?.();
    if (!vectors?.length)
      throw new Error("Local embedding model returned no vectors");
    return vectors.map((vector) => normalizeVector(vector));
  }

  private getExtractor() {
    this.extractor ??= import("@huggingface/transformers").then(
      async ({ pipeline, env }) => {
        env.cacheDir = "./models";
        const extractor = await pipeline(
          "feature-extraction",
          this.config.model,
          {
            revision: this.revision,
          },
        );
        return extractor as unknown as (
          input: string | string[],
          options: object,
        ) => Promise<unknown>;
      },
    );
    return this.extractor;
  }
}

@Injectable()
export class LocalEmbeddingProviderFactory {
  constructor(@Inject(AI_CONFIG) private readonly config: AiConfig) {}

  create(): LocalEmbeddingProvider {
    if (this.config.localEmbedding.provider === "mock") {
      return new MockEmbeddingProvider(
        this.config.localEmbedding.dimensions,
      ) as LocalEmbeddingProvider;
    }
    return new TransformersJsEmbeddingProvider(
      this.config.localEmbedding,
      this.config.localEmbedding.revision,
    );
  }
}

@Injectable()
export class AiChatProviderFactory {
  constructor(@Inject(AI_CONFIG) private readonly config: AiConfig) {}

  create(): AiChatProvider {
    const provider = this.config.chatProvider;
    if (provider === "mock") return new MockChatProvider();
    const connection =
      provider === "openai"
        ? this.config.providers.openai
        : provider === "openai_compatible"
          ? this.config.providers.openaiCompatible
          : this.config.providers.geminiOpenAiCompatible;
    return new OpenAiCompatibleChatProvider(
      provider,
      connection,
      this.config.requestTimeoutMs,
      this.config.streamingEnabled,
    );
  }
}

@Injectable()
export class AiEmbeddingProviderFactory {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly localFactory: LocalEmbeddingProviderFactory,
  ) {}

  create(): AiEmbeddingProvider {
    const provider = this.config.embeddingProvider;
    if (provider === "mock") {
      return new MockEmbeddingProvider(this.config.localEmbedding.dimensions);
    }
    if (provider === "local") return this.localFactory.create();
    const connection =
      provider === "openai"
        ? this.config.providers.openai
        : provider === "openai_compatible"
          ? this.config.providers.openaiCompatible
          : this.config.providers.geminiOpenAiCompatible;
    return new OpenAiCompatibleEmbeddingProvider(
      provider,
      connection,
      this.config.requestTimeoutMs,
    );
  }
}
