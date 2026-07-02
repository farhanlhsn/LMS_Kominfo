import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AiGateway, ChatMessage } from './gateway/ai.gateway';
import { RagService, RetrievedChunk } from './rag/rag.service';
import { AiQueueService } from './queue/ai-queue.service';
import { AskAiDto, SummaryDto, QuizGeneratorDto, EssayReviewDto, RecommendationDto } from './dto/ai.dto';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGateway,
    private readonly rag: RagService,
    private readonly aiQueue: AiQueueService,
  ) {}

  /**
   * Register background job handlers. Dipanggil sekali saat module init.
   */
  onModuleInit(): void {
    this.aiQueue.registerHandler('EMBED_LESSON', this.handleEmbedLesson.bind(this));
    this.aiQueue.registerHandler('EMBED_MATERIAL', this.handleEmbedMaterial.bind(this));
    this.aiQueue.registerHandler('SUMMARY', this.handleSummary.bind(this));
    this.aiQueue.registerHandler('RECOMMENDATION', this.handleRecommendation.bind(this));
    this.logger.log('AI job handlers registered: EMBED_LESSON, EMBED_MATERIAL, SUMMARY, RECOMMENDATION');
  }

  // ===== Public endpoints =====

  /**
   * Chat dengan AI Tutor (RAG-based).
   * - Jika lessonId diberikan, retrieval dibatasi ke lesson tersebut (atau course jika tidak ada).
   * - Response disimpan ke ChatMessage untuk history.
   */
  async askAi(userId: string, dto: AskAiDto) {
    // 1) Get or create session
    let sessionId = dto.sessionId;
    if (!sessionId) {
      const session = await this.prisma.chatSession.create({
        data: {
          userId,
          lessonId: dto.lessonId || null,
          courseId: dto.courseId || null,
          title: dto.message.substring(0, 50),
        },
      });
      sessionId = session.id;
    }

    // 2) Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content: dto.message },
    });

    // 3) Retrieve context (RAG)
    const scope: { lessonId?: string; courseId?: string } = {};
    if (dto.lessonId) scope.lessonId = dto.lessonId;
    else if (dto.courseId) scope.courseId = dto.courseId;

    const retrieved = scope.lessonId || scope.courseId
      ? await this.rag.retrieve(dto.message, 5, scope)
      : await this.rag.retrieve(dto.message, 5);

    // 4) Build prompt
    const systemPrompt = this.rag.buildPromptWithContext(dto.message, retrieved);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.message },
    ];

    // 5) Call OpenAI
    const result = await this.aiGateway.chat(messages, {
      userId,
      feature: 'ask-ai',
      temperature: 0.5,
      maxTokens: 800,
    });

    // 6) Save AI message
    const aiMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: result.content,
        tokenUsage: result.usage.totalTokens,
        sources: this.serializeSources(retrieved),
      },
    });

    return {
      sessionId,
      message: aiMessage,
      sources: retrieved,
    };
  }

  /**
   * Chat dengan streaming. Digunakan oleh endpoint SSE.
   * Mengembalikan AsyncGenerator yang bisa di-forward ke Express sebagai SSE.
   */
  async *askAiStream(userId: string, dto: AskAiDto): AsyncGenerator<{ event: string; data: any }> {
    let sessionId = dto.sessionId;
    if (!sessionId) {
      const session = await this.prisma.chatSession.create({
        data: {
          userId,
          lessonId: dto.lessonId || null,
          courseId: dto.courseId || null,
          title: dto.message.substring(0, 50),
        },
      });
      sessionId = session.id;
      yield { event: 'session', data: { sessionId } };
    }

    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content: dto.message },
    });

    // Retrieve context
    const scope: { lessonId?: string; courseId?: string } = {};
    if (dto.lessonId) scope.lessonId = dto.lessonId;
    else if (dto.courseId) scope.courseId = dto.courseId;
    const retrieved = scope.lessonId || scope.courseId
      ? await this.rag.retrieve(dto.message, 5, scope)
      : await this.rag.retrieve(dto.message, 5);

    if (retrieved.length > 0) {
      yield { event: 'sources', data: retrieved };
    }

    const systemPrompt = this.rag.buildPromptWithContext(dto.message, retrieved);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.message },
    ];

    let fullContent = '';
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    for await (const chunk of this.aiGateway.chatStream(messages, {
      userId,
      feature: 'ask-ai-stream',
      temperature: 0.5,
      maxTokens: 800,
    })) {
      if (chunk.content) {
        fullContent += chunk.content;
        yield { event: 'token', data: { delta: chunk.content } };
      }
      if (chunk.usage) totalUsage = chunk.usage;
    }

    // Save final message
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: fullContent,
        tokenUsage: totalUsage.totalTokens,
        sources: this.serializeSources(retrieved),
      },
    });

    yield { event: 'done', data: { sessionId, usage: totalUsage } };
  }

  /**
   * Summarize materi (lesson) atau text bebas.
   */
  async summarize(userId: string, dto: SummaryDto) {
    let text = dto.text;
    let title = 'Ringkasan';

    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        include: { content: true },
      });
      if (!lesson) throw new BadRequestException('Lesson not found');
      title = lesson.title;

      // Prioritas: lesson.content.markdown > hasil RAG retrieval > empty
      const markdown = (lesson.content as any)?.markdown || (lesson.content as any)?.transcript || '';
      if (markdown) {
        text = markdown;
      } else {
        const retrieved = await this.rag.retrieve(`Ringkasan materi ${lesson.title}`, 8, { lessonId: lesson.id });
        text = retrieved.map((r) => r.content).join('\n\n');
      }
    }

    if (!text) throw new BadRequestException('Tidak ada teks untuk diringkas.');

    const targetLang = dto.language || 'id';
    const lengthHint = dto.length === 'SHORT' ? '3-5 poin' : dto.length === 'LONG' ? 'paragraf utuh 200-300 kata' : '5-7 poin';

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Kamu adalah asisten peringkas materi. Ringkas dalam bahasa ${targetLang === 'id' ? 'Indonesia' : 'Inggris'}, format poin (${lengthHint}), jelas dan akurat.`,
      },
      { role: 'user', content: `Ringkas materi berikut:\n\n${text}` },
    ];

    const result = await this.aiGateway.chat(messages, {
      userId,
      feature: 'summary',
      temperature: 0.3,
      maxTokens: 600,
    });

    return { title, summary: result.content, usage: result.usage };
  }

  /**
   * Generate kuis dari materi lesson via RAG.
   */
  async generateQuiz(userId: string, dto: QuizGeneratorDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { content: true },
    });
    if (!lesson) throw new BadRequestException('Lesson not found');

    const retrieved = await this.rag.retrieve(
      `Materi utama ${lesson.title}`,
      8,
      { lessonId: lesson.id },
    );
    const context = retrieved.map((r) => r.content).join('\n\n') ||
      (lesson.content as any)?.markdown || '';

    const numQ = dto.numQuestions || 5;
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Kamu adalah pembuat soal kuis. Hasilkan ${numQ} soal pilihan ganda dalam format JSON valid (tanpa markdown) dengan struktur:
{"questions":[{"question":"...","choices":[{"label":"A","text":"...","isCorrect":true/false},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"explanation":"..."}]}`,
      },
      { role: 'user', content: `Buat ${numQ} soal dari materi berikut:\n\n${context}` },
    ];

    const result = await this.aiGateway.chat(messages, {
      userId,
      feature: 'quiz-generator',
      temperature: 0.7,
      maxTokens: 1500,
    });

    let parsed: any;
    try {
      const jsonStart = result.content.indexOf('{');
      const jsonEnd = result.content.lastIndexOf('}');
      parsed = JSON.parse(result.content.substring(jsonStart, jsonEnd + 1));
    } catch {
      parsed = { questions: [], raw: result.content };
    }

    return { lessonId: lesson.id, lessonTitle: lesson.title, ...parsed, usage: result.usage };
  }

  /**
   * Review esai student via AI. Return score (0-100), feedback, strengths, improvements.
   */
  async reviewEssay(userId: string, dto: EssayReviewDto) {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Kamu adalah penilai esai. Berikan review dalam format JSON valid (tanpa markdown):
{"score":0-100,"feedback":"...","strengths":["..."],"improvements":["..."]}`,
      },
      {
        role: 'user',
        content: `Rubrik penilaian:\n${dto.rubric || 'Penilaian umum: akurasi, kedalaman, kejelasan, orisinalitas.'}\n\nEsai siswa:\n${dto.essay}`,
      },
    ];

    const result = await this.aiGateway.chat(messages, {
      userId,
      feature: 'essay-review',
      temperature: 0.3,
      maxTokens: 800,
    });

    let parsed: any;
    try {
      const jsonStart = result.content.indexOf('{');
      const jsonEnd = result.content.lastIndexOf('}');
      parsed = JSON.parse(result.content.substring(jsonStart, jsonEnd + 1));
    } catch {
      parsed = { score: null, feedback: result.content, strengths: [], improvements: [] };
    }
    return { ...parsed, usage: result.usage };
  }

  /**
   * Rekomendasi materi/lesson untuk student berdasarkan progress.
   */
  async recommend(userId: string, _dto: RecommendationDto) {
    // Ambil progress student: course yang enrolled, lesson yang completed
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        course: { include: { modules: { include: { lessons: { select: { id: true, order: true, type: true } } } } } },
        progress: { where: { completed: true }, select: { lessonId: true } },
      },
      take: 10,
      orderBy: { lastActivityAt: 'desc' },
    });

    const context = enrollments.map((e) => ({
      course: e.course.title,
      completedLessons: e.progress.length,
      totalLessons: e.course.modules.reduce((s, m) => s + m.lessons.length, 0),
    }));

    if (context.length === 0) {
      return {
        recommendations: [
          { type: 'COURSE', reason: 'Siswa baru: mulai dari kursus populer di region Anda.' },
        ],
      };
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `Kamu adalah rekomendasi belajar. Berikan 3-5 rekomendasi dalam format JSON valid (tanpa markdown):
{"recommendations":[{"type":"LESSON|COURSE|REVIEW","lessonId?":"...","courseId?":"...","reason":"...","priority":"HIGH|MEDIUM|LOW"}]}`,
      },
      {
        role: 'user',
        content: `Progress siswa saat ini:\n${JSON.stringify(context, null, 2)}\n\nBerikan rekomendasi personal.`,
      },
    ];

    const result = await this.aiGateway.chat(messages, {
      userId,
      feature: 'recommendation',
      temperature: 0.5,
      maxTokens: 600,
    });

    let parsed: any;
    try {
      const jsonStart = result.content.indexOf('{');
      const jsonEnd = result.content.lastIndexOf('}');
      parsed = JSON.parse(result.content.substring(jsonStart, jsonEnd + 1));
    } catch {
      parsed = { recommendations: [], raw: result.content };
    }
    return { ...parsed, usage: result.usage };
  }

  /**
   * Trigger ingestion: extract text dari material lesson → chunk → embed → simpan ke Embedding.
   * Memakai antrian BullMQ agar tidak block HTTP request.
   */
  async triggerLessonIngestion(lessonId: string): Promise<{ jobId: string }> {
    const jobId = await this.aiQueue.addJob('EMBED_LESSON', { lessonId });
    return { jobId };
  }

  // ===== Background handlers =====

  private async handleEmbedLesson(payload: { lessonId: string }): Promise<Record<string, any>> {
    const { lessonId } = payload;
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { content: true },
    });
    if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

    const content = lesson.content as any;
    let text = content?.markdown || content?.transcript || '';

    // Jika tidak ada markdown, pakai material terkait
    if (!text) {
      const materials = await this.prisma.material.findMany({
        where: {
          filename: { contains: lessonId },
          deletedAt: null,
        },
        take: 1,
      });
      if (materials.length > 0) {
        // Lazy import to avoid circular
        const { ExtractorService } = await import('./extractor/extractor.service');
        const { ModuleRef } = await import('@nestjs/core');
        // We can use the global service through DI lookup if available
        // For simplicity, return marker — full flow handled by EMBED_MATERIAL job
        return { lessonId, status: 'deferred-to-material', materialId: materials[0].id };
      }
    }

    if (!text) return { lessonId, status: 'no-content' };

    const result = await this.rag.ingestLessonText(lessonId, text);
    return { lessonId, ...result };
  }

  private async handleEmbedMaterial(payload: { materialId: string }): Promise<Record<string, any>> {
    const { materialId } = payload;
    const material = await this.prisma.material.findUnique({ where: { id: materialId } });
    if (!material || !material.storageKey) return { materialId, status: 'not-found' };

    const { ExtractorService } = await import('./extractor/extractor.service');
    // Service tersedia via global module — ambil dari container
    const extractor = (global as any).__extractor as InstanceType<typeof ExtractorService> | undefined;
    if (!extractor) {
      return { materialId, status: 'extractor-unavailable' };
    }

    const text = await extractor.extract(
      material.storageKey,
      material.mimeType,
      material.storageProvider as 'MINIO' | 'LOCAL',
    );
    if (!text) return { materialId, status: 'empty-text' };

    // Tentukan lessonId (asumsi: material terkait dengan lesson via filename prefix)
    const lessonId = material.filename.split('-')[1] || null;
    if (!lessonId) return { materialId, status: 'no-lesson-mapping' };

    return { materialId, lessonId, ...(await this.rag.ingestLessonText(lessonId, text)) };
  }

  private async handleSummary(payload: { lessonId: string; language: string; length: string; userId: string }): Promise<Record<string, any>> {
    return this.summarize(payload.userId, {
      lessonId: payload.lessonId,
      language: payload.language as any,
      length: payload.length as any,
    });
  }

  private async handleRecommendation(payload: { userId: string }): Promise<Record<string, any>> {
    return this.recommend(payload.userId, {});
  }

  async getChatHistory(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found or not owned by user');
    }
    return session;
  }

  private serializeSources(retrieved: RetrievedChunk[]): any {
    return {
      chunks: retrieved.map((r) => ({
        embeddingId: r.id,
        lessonId: r.lessonId,
        lessonTitle: r.lessonTitle,
        score: r.score,
        chunkIndex: r.chunkIndex,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
