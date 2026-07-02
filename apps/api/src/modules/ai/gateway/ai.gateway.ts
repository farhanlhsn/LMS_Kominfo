import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * OpenAI client wrapper (Gateway pattern).
 *
 * Memusatkan konfigurasi (model, key, rate limit) sehingga modul lain tidak
 * perlu tahu detail OpenAI. Client di-load lazy agar build tidak crash jika
 * dependency belum ter-install.
 *
 * Fitur:
 *  - Token-usage tracking ke tabel AiUsage
 *  - Rate limit per-user (default 60 request/jam)
 *  - Streaming chat completion (SSE-friendly)
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  userId?: string;
  feature?: string;
}

export interface ChatCompletionResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export interface StreamChunkResult {
  content: string;
  done: boolean;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

@Injectable()
export class AiGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGateway.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private defaultModel: string;
  private embeddingModel: string;
  private dailyTokenBudget: number;
  private perUserRpm: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.defaultModel = this.configService.get<string>('AI_CHAT_MODEL') || 'gpt-4o-mini';
    this.embeddingModel = this.configService.get<string>('AI_EMBED_MODEL') || 'text-embedding-3-small';
    this.dailyTokenBudget = parseInt(this.configService.get<string>('AI_DAILY_TOKEN_BUDGET') || '1000000', 10);
    this.perUserRpm = parseInt(this.configService.get<string>('AI_USER_RPM') || '20', 10);
  }

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || this.configService.get<string>('AI_GATEWAY_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY tidak di-set. Endpoint AI akan return mock response sampai key dikonfigurasi.',
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const OpenAI = require('openai').OpenAI || require('openai');
      const baseURL = this.configService.get<string>('AI_GATEWAY_URL') || this.configService.get<string>('OPENAI_BASE_URL');
      this.client = new OpenAI({
        apiKey,
        ...(baseURL ? { baseURL } : {}),
      });
      this.logger.log(`AI Gateway siap (model: ${this.defaultModel}, embed: ${this.embeddingModel})`);
    } catch (err) {
      this.logger.error(`Gagal inisialisasi OpenAI client: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    // OpenAI client v4 tidak perlu explicit close
  }

  /**
   * Apakah OpenAI client siap digunakan?
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Cek rate limit & budget sebelum request. Throws kalau melebihi.
   */
  private async checkRateLimit(userId: string | undefined, feature: string): Promise<void> {
    if (!userId) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastHourUsage = await this.prisma.aiUsage.findMany({
      where: { userId, feature, occurredAt: { gte: oneHourAgo } },
      select: { totalTokens: true },
    });
    const totalTokensLastHour = lastHourUsage.reduce((s, r) => s + (r.totalTokens || 0), 0);

    // Asumsi rata-rata 800 token per request => rpm * 800 = hourly token budget per user
    const perHourBudget = this.perUserRpm * 60 * 800;
    if (totalTokensLastHour >= perHourBudget) {
      throw new Error(`AI rate limit tercapai untuk user ${userId}. Coba lagi nanti.`);
    }
  }

  /**
   * Chat completion (non-streaming).
   */
  async chat(messages: ChatMessage[], opts: ChatCompletionOptions = {}): Promise<ChatCompletionResult> {
    if (!this.isReady()) {
      return this.mockChat(messages, opts);
    }
    await this.checkRateLimit(opts.userId, opts.feature || 'chat');

    const model = opts.model || this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1000,
      top_p: opts.topP ?? 1,
    });

    const content = response.choices?.[0]?.message?.content || '';
    const usage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    await this.logUsage({ userId: opts.userId, feature: opts.feature || 'chat', model, usage });
    return { content, usage, model };
  }

  /**
   * Chat completion dengan streaming.
   * Mengembalikan AsyncIterable<StreamChunkResult> yang siap diteruskan ke SSE.
   */
  async *chatStream(messages: ChatMessage[], opts: ChatCompletionOptions = {}): AsyncGenerator<StreamChunkResult> {
    if (!this.isReady()) {
      yield* this.mockStream(messages, opts);
      return;
    }
    await this.checkRateLimit(opts.userId, opts.feature || 'chat-stream');

    const model = opts.model || this.defaultModel;
    const stream = await this.client.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1000,
      top_p: opts.topP ?? 1,
      stream: true,
      stream_options: { include_usage: true },
    });

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) yield { content: delta, done: false };

      if (chunk.usage) {
        totalUsage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    yield { content: '', done: true, usage: totalUsage };
    await this.logUsage({ userId: opts.userId, feature: opts.feature || 'chat-stream', model, usage: totalUsage });
  }

  /**
   * Embedding generation (text-embedding-3-small → 1536 dim).
   */
  async embed(text: string): Promise<{ embedding: number[]; usage: { promptTokens: number; totalTokens: number } }> {
    if (!this.isReady()) {
      // Return mock random vector (untuk dev tanpa key)
      const embedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      return { embedding, usage: { promptTokens: text.length / 4 | 0, totalTokens: text.length / 4 | 0 } };
    }
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return {
      embedding: response.data[0].embedding,
      usage: {
        promptTokens: response.usage.prompt_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      },
    };
  }

  /**
   * Embedding batch (untuk ingestion pipeline).
   */
  async embedBatch(texts: string[]): Promise<{ embeddings: number[][]; usage: { promptTokens: number; totalTokens: number } }> {
    if (!this.isReady()) {
      const embeddings = texts.map(() => Array.from({ length: 1536 }, () => Math.random() - 0.5));
      const tokens = texts.reduce((s, t) => s + (t.length / 4 | 0), 0);
      return { embeddings, usage: { promptTokens: tokens, totalTokens: tokens } };
    }
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    return {
      embeddings: response.data.map((d: { embedding: number[] }) => d.embedding),
      usage: {
        promptTokens: response.usage.prompt_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      },
    };
  }

  private async logUsage(args: {
    userId?: string;
    feature: string;
    model: string;
    usage: { promptTokens: number; completionTokens?: number; totalTokens: number };
  }): Promise<void> {
    try {
      await this.prisma.aiUsage.create({
        data: {
          userId: args.userId || null,
          feature: args.feature,
          model: args.model,
          promptTokens: args.usage.promptTokens,
          completionTokens: args.usage.completionTokens || 0,
          totalTokens: args.usage.totalTokens,
        },
      });
    } catch (err) {
      this.logger.warn(`Gagal log AI usage: ${(err as Error).message}`);
    }
  }

  // ===== Mock fallbacks (saat OPENAI_API_KEY belum di-set) =====

  private async *mockStream(messages: ChatMessage[], _opts: ChatCompletionOptions): AsyncGenerator<StreamChunkResult> {
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    const reply = `Ini adalah respons simulasi AI (mode mock). OPENAI_API_KEY belum dikonfigurasi.\n\nUntuk mengaktifkan AI Tutor sungguhan, set OPENAI_API_KEY di .env.\n\nPertanyaan Anda: "${lastUser?.content?.substring(0, 80)}..."`;
    const tokens = reply.split(/(\s+)/);
    for (const t of tokens) {
      yield { content: t, done: false };
      await new Promise((r) => setTimeout(r, 10));
    }
    yield { content: '', done: true, usage: { promptTokens: 50, completionTokens: 80, totalTokens: 130 } };
  }

  private async mockChat(messages: ChatMessage[], _opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    return {
      content: `[MOCK] OPENAI_API_KEY belum di-set. Pesan Anda: "${lastUser?.content?.substring(0, 60)}..."`,
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      model: 'mock',
    };
  }
}
