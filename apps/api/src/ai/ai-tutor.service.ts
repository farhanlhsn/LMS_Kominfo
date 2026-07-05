import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { Prisma } from "@lms/db";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AskAiTutorDto } from "./dto/ai.dto";
import { AiCanonicalCacheService } from "./ai-canonical-cache.service";
import { AiChatProviderFactory } from "./ai-provider.factories";
import { estimateTokens, type AiChatProvider } from "./ai-provider.types";
import {
  AiRetrieverService,
  type RetrievedChunk,
} from "./ai-retriever.service";
import { AiRoutingService, type AiRoute } from "./ai-routing.service";

type SourceType =
  | "COURSE_MATERIAL"
  | "GENERAL_EDUCATIONAL"
  | "BLOCKED"
  | "OUT_OF_SCOPE"
  | "DISABLED";

@Injectable()
export class AiTutorService {
  private readonly userRequests = new Map<string, number[]>();
  private readonly organizationRequests = new Map<string, number[]>();

  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly prisma: PrismaService,
    private readonly chatFactory: AiChatProviderFactory,
    private readonly retriever: AiRetrieverService,
    private readonly routing: AiRoutingService,
    private readonly canonicalCache: AiCanonicalCacheService,
  ) {}

  async ask(organizationId: string, userId: string, dto: AskAiTutorDto) {
    const startedAt = Date.now();
    const scope = await this.ensureScope(organizationId, userId, dto);
    this.enforceRateLimit(organizationId, userId);

    if (!scope.allowAIAssistant) {
      return this.finalize({
        organizationId,
        userId,
        dto,
        sourceType: "BLOCKED",
        answer: "AI Tutor dinonaktifkan untuk asesmen ini.",
        route: "assessment_policy",
        startedAt,
      });
    }
    if (!this.config.enabled || this.config.answerMode === "DISABLED") {
      return this.finalize({
        organizationId,
        userId,
        dto,
        sourceType: "DISABLED",
        answer:
          "AI Tutor sedang dinonaktifkan. Materi pembelajaran tetap dapat digunakan tanpa AI.",
        route: "disabled",
        startedAt,
      });
    }

    const earlyRoute = this.routing.preflight(dto.question);
    if (earlyRoute) {
      return this.boundaryResponse(
        organizationId,
        userId,
        dto,
        earlyRoute,
        startedAt,
      );
    }

    let chunks: RetrievedChunk[] = [];
    try {
      chunks = await this.retriever.retrieve({
        organizationId,
        userId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        activityId: dto.activityId,
        question: dto.question,
        topK: this.config.rag.topK,
        minScore: this.config.rag.minScore,
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;
    }
    const route = await this.resolveRoute(dto.question, chunks.length > 0);
    if (route === "BLOCKED" || route === "OFF_TOPIC") {
      return this.boundaryResponse(
        organizationId,
        userId,
        dto,
        route,
        startedAt,
      );
    }

    const sourceType: SourceType =
      route === "COURSE" ? "COURSE_MATERIAL" : "GENERAL_EDUCATIONAL";
    const candidateCitations = route === "COURSE" ? this.citations(chunks) : [];
    const canonical = await this.canonicalCache.canonicalize(
      organizationId,
      route === "COURSE" ? dto.courseId : null,
      dto.question,
    );
    const contextHash = this.canonicalCache.contextHash(
      route === "COURSE"
        ? [
            "answer-contract:v3",
            dto.courseId,
            dto.lessonId,
            dto.activityId,
            ...chunks.map(
              (chunk) => `${chunk.chunkId}:${chunk.score.toFixed(3)}`,
            ),
          ]
        : ["general", this.config.answerMode],
    );
    const cached = await this.canonicalCache.get(
      organizationId,
      route === "COURSE" ? dto.courseId : null,
      canonical.key,
      contextHash,
    );
    if (cached) {
      return this.finalize({
        organizationId,
        userId,
        dto,
        sourceType,
        answer: cached.answer,
        citations: this.filterCitationsForAnswer(
          cached.answer,
          this.jsonArray(cached.citations),
        ),
        suggestions: this.stringArray(cached.suggestions),
        route: route.toLocaleLowerCase(),
        cacheHit: true,
        provider: cached.provider ?? "cache",
        model: cached.model,
        startedAt,
      });
    }

    const provider = this.chatFactory.create();
    const notes = await this.selectedNotes(organizationId, userId, dto);
    const context = this.buildContext(chunks, dto.selectedText, notes);
    try {
      const result = await provider.generateText({
        systemPrompt: this.systemPrompt(route),
        userPrompt: `${context ? `CONTEXT:\n${context}\n\n` : ""}QUESTION:\n${dto.question}`,
        temperature: this.config.defaultTemperature,
        maxOutputTokens: this.config.maxOutputTokens,
      });
      const answer = await this.repairCourseAnswerIfNeeded({
        provider,
        route,
        answer: result.text,
        context,
        question: dto.question,
        citations: candidateCitations,
      });
      const suggestions = this.followups(dto.question, route);
      const citations = this.filterCitationsForAnswer(
        answer,
        candidateCitations,
      );
      await this.canonicalCache.put({
        organizationId,
        courseId: route === "COURSE" ? dto.courseId : null,
        canonicalQuestion: canonical.text,
        canonicalKey: canonical.key,
        contextHash,
        sourceType,
        answer,
        citations,
        suggestions,
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
      });
      return this.finalize({
        organizationId,
        userId,
        dto,
        sourceType,
        answer,
        citations,
        suggestions,
        route: route.toLocaleLowerCase(),
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        inputTokens: result.inputTokens,
        outputTokens: estimateTokens(answer),
        startedAt,
      });
    } catch {
      return this.finalize({
        organizationId,
        userId,
        dto,
        sourceType: "OUT_OF_SCOPE",
        answer:
          "AI Tutor sedang tidak tersedia. Coba lagi setelah penyedia AI kembali siap.",
        route: "provider_unavailable",
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        startedAt,
        status: "FAILED",
      });
    }
  }

  streamAsk(
    organizationId: string,
    userId: string,
    dto: AskAiTutorDto,
  ): Observable<{ data: any }> {
    return new Observable((subscriber) => {
      void (async () => {
        try {
          const startedAt = Date.now();
          const scope = await this.ensureScope(organizationId, userId, dto);
          this.enforceRateLimit(organizationId, userId);

          if (!scope.allowAIAssistant) {
            const result = await this.finalize({
              organizationId,
              userId,
              dto,
              sourceType: "BLOCKED",
              answer: "AI Tutor dinonaktifkan untuk asesmen ini.",
              route: "assessment_policy",
              startedAt,
            });
            subscriber.next({ data: { type: "chunk", text: result.answer } });
            subscriber.next({ data: { type: "done", result } });
            subscriber.complete();
            return;
          }
          if (!this.config.enabled || this.config.answerMode === "DISABLED") {
            const result = await this.finalize({
              organizationId,
              userId,
              dto,
              sourceType: "DISABLED",
              answer:
                "AI Tutor sedang dinonaktifkan. Materi pembelajaran tetap dapat digunakan tanpa AI.",
              route: "disabled",
              startedAt,
            });
            subscriber.next({ data: { type: "chunk", text: result.answer } });
            subscriber.next({ data: { type: "done", result } });
            subscriber.complete();
            return;
          }

          const earlyRoute = this.routing.preflight(dto.question);
          if (earlyRoute) {
            const result = await this.boundaryResponse(
              organizationId,
              userId,
              dto,
              earlyRoute,
              startedAt,
            );
            subscriber.next({ data: { type: "chunk", text: result.answer } });
            subscriber.next({ data: { type: "done", result } });
            subscriber.complete();
            return;
          }

          let chunks: RetrievedChunk[] = [];
          try {
            chunks = await this.retriever.retrieve({
              organizationId,
              userId,
              courseId: dto.courseId,
              lessonId: dto.lessonId,
              activityId: dto.activityId,
              question: dto.question,
              topK: this.config.rag.topK,
              minScore: this.config.rag.minScore,
            });
          } catch (error) {
            if (
              error instanceof ForbiddenException ||
              error instanceof NotFoundException
            ) {
              subscriber.error(error);
              return;
            }
          }

          const route = await this.resolveRoute(dto.question, chunks.length > 0);
          if (route === "BLOCKED" || route === "OFF_TOPIC") {
            const result = await this.boundaryResponse(
              organizationId,
              userId,
              dto,
              route,
              startedAt,
            );
            subscriber.next({ data: { type: "chunk", text: result.answer } });
            subscriber.next({ data: { type: "done", result } });
            subscriber.complete();
            return;
          }

          const candidateCitations = this.citations(chunks);
          const sourceType =
            route === "GENERAL" ? "GENERAL_EDUCATIONAL" : "COURSE_MATERIAL";

          const canonical = await this.canonicalCache.canonicalize(
            organizationId,
            route === "COURSE" ? dto.courseId : null,
            dto.question,
          );
          const notes = await this.selectedNotes(organizationId, userId, dto);
          const context = this.buildContext(chunks, dto.selectedText, notes);
          const contextHash = this.canonicalCache.contextHash(
            route === "COURSE"
              ? [
                  "answer-contract:v3",
                  dto.courseId,
                  dto.lessonId,
                  dto.activityId,
                  ...chunks.map(
                    (chunk) => `${chunk.chunkId}:${chunk.score.toFixed(3)}`,
                  ),
                ]
              : ["general", this.config.answerMode],
          );

          if (this.config.cache.enabled) {
            const cached = await this.canonicalCache.get(
              organizationId,
              route === "COURSE" ? dto.courseId : null,
              canonical.key,
              contextHash,
            );
            if (cached) {
              const result = await this.finalize({
                organizationId,
                userId,
                dto,
                sourceType: cached.sourceType as SourceType,
                answer: cached.answer,
                citations: this.filterCitationsForAnswer(
                  cached.answer,
                  this.jsonArray(cached.citations),
                ),
                suggestions: (cached.suggestions as any) ?? [],
                cacheHit: true,
                route: route.toLocaleLowerCase(),
                provider: cached.provider ?? "cache",
                model: cached.model,
                startedAt,
              });
              const words = result.answer.split(" ");
              for (const word of words) {
                subscriber.next({ data: { type: "chunk", text: word + " " } });
                await new Promise((r) => setTimeout(r, 10)); // simulate typing from cache
              }
              subscriber.next({ data: { type: "done", result } });
              subscriber.complete();
              return;
            }
          }

          const provider = this.chatFactory.create();
          
          if (!provider.generateStream) {
            // fallback if stream not supported
            const resultText = await provider.generateText({
              systemPrompt: this.systemPrompt(route),
              userPrompt: `${context ? `CONTEXT:\n${context}\n\n` : ""}QUESTION:\n${dto.question}`,
              temperature: this.config.defaultTemperature,
              maxOutputTokens: this.config.maxOutputTokens,
            });
            const answer = await this.repairCourseAnswerIfNeeded({
              provider,
              route,
              answer: resultText.text,
              context,
              question: dto.question,
              citations: candidateCitations,
            });
            const suggestions = this.followups(dto.question, route);
            const citations = this.filterCitationsForAnswer(
              answer,
              candidateCitations,
            );
            await this.canonicalCache.put({
              organizationId,
              courseId: route === "COURSE" ? dto.courseId : null,
              canonicalQuestion: canonical.text,
              canonicalKey: canonical.key,
              contextHash,
              sourceType,
              answer,
              citations,
              suggestions,
              provider: provider.capabilities.providerName,
              model: provider.capabilities.model,
            });
            const result = await this.finalize({
              organizationId,
              userId,
              dto,
              sourceType,
              answer,
              citations,
              suggestions,
              route: route.toLocaleLowerCase(),
              provider: provider.capabilities.providerName,
              model: provider.capabilities.model,
              inputTokens: resultText.inputTokens,
              outputTokens: estimateTokens(answer),
              startedAt,
            });
            subscriber.next({ data: { type: "chunk", text: answer } });
            subscriber.next({ data: { type: "done", result } });
            subscriber.complete();
            return;
          }

          const stream = provider.generateStream({
            systemPrompt: this.systemPrompt(route),
            userPrompt: `${context ? `CONTEXT:\n${context}\n\n` : ""}QUESTION:\n${dto.question}`,
            temperature: this.config.defaultTemperature,
            maxOutputTokens: this.config.maxOutputTokens,
          });

          let fullAnswer = "";
          for await (const chunk of stream) {
            fullAnswer += chunk;
            subscriber.next({ data: { type: "chunk", text: chunk } });
          }
          fullAnswer = await this.repairCourseAnswerIfNeeded({
            provider,
            route,
            answer: fullAnswer,
            context,
            question: dto.question,
            citations: candidateCitations,
          });

          const suggestions = this.followups(dto.question, route);
          const citations = this.filterCitationsForAnswer(
            fullAnswer,
            candidateCitations,
          );
          await this.canonicalCache.put({
            organizationId,
            courseId: route === "COURSE" ? dto.courseId : null,
            canonicalQuestion: canonical.text,
            canonicalKey: canonical.key,
            contextHash,
            sourceType,
            answer: fullAnswer,
            citations,
            suggestions,
            provider: provider.capabilities.providerName,
            model: provider.capabilities.model,
          });

          const result = await this.finalize({
            organizationId,
            userId,
            dto,
            sourceType,
            answer: fullAnswer,
            citations,
            suggestions,
            route: route.toLocaleLowerCase(),
            provider: provider.capabilities.providerName,
            model: provider.capabilities.model,
            inputTokens: estimateTokens(this.systemPrompt(route) + dto.question + context),
            outputTokens: estimateTokens(fullAnswer),
            startedAt,
            canonicalKey: canonical.key,
          });

          subscriber.next({ data: { type: "done", result } });
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  async submitFeedback(organizationId: string, userId: string, messageId: string, feedback: "LIKE" | "DISLIKE") {
    const message = await this.prisma.aiMessage.findFirst({
      where: {
        id: messageId,
        conversation: { organizationId, userId },
      },
    });
    if (!message) throw new NotFoundException("Message not found");

    const metadata = (message.metadata as Record<string, any>) ?? {};
    metadata.feedback = feedback;

    await this.prisma.aiMessage.update({
      where: { id: messageId },
      data: { metadata },
    });

    if (feedback === "DISLIKE" && metadata.canonicalKey) {
      await this.prisma.aiAnswerCache.deleteMany({
        where: {
          organizationId,
          canonicalKey: metadata.canonicalKey,
        },
      });
    }

    return { success: true };
  }

  private async ensureScope(
    organizationId: string,
    userId: string,
    dto: AskAiTutorDto,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id: dto.activityId,
        organizationId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        isPublished: true,
        lesson: { isPublished: true },
        course: { status: "PUBLISHED", deletedAt: null },
      },
      select: { assessmentDisplayPolicy: true },
    });
    if (!activity) throw new NotFoundException("Learning activity not found");
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId,
          courseId: dto.courseId,
          userId,
        },
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw new ForbiddenException("Course enrollment is required");
    }
    const policy = this.record(activity.assessmentDisplayPolicy);
    return { allowAIAssistant: policy.allowAIAssistant !== false };
  }

  private async resolveRoute(
    question: string,
    hasContext: boolean,
  ): Promise<AiRoute> {
    if (!hasContext && this.config.answerMode === "STRICT_COURSE_ONLY")
      return "OFF_TOPIC";
    return this.routing.classifyWithLocalEmbedding(question, hasContext);
  }

  private boundaryResponse(
    organizationId: string,
    userId: string,
    dto: AskAiTutorDto,
    route: "BLOCKED" | "OFF_TOPIC",
    startedAt: number,
  ) {
    return this.finalize({
      organizationId,
      userId,
      dto,
      sourceType: route === "BLOCKED" ? "BLOCKED" : "OUT_OF_SCOPE",
      answer:
        route === "BLOCKED"
          ? "Saya tidak dapat memberikan kunci atau jawaban langsung untuk kuis dan ujian. Saya bisa membantu menjelaskan konsep atau membuat latihan serupa."
          : "Pertanyaan tersebut berada di luar cakupan pembelajaran. Silakan tanyakan materi kursus atau topik edukasional yang relevan.",
      route: route.toLocaleLowerCase(),
      startedAt,
    });
  }

  private buildContext(
    chunks: RetrievedChunk[],
    selectedText?: string,
    notes: string[] = [],
  ) {
    const sections = chunks.map(
      (chunk, index) => `[S${index + 1}] ${chunk.title}\n${chunk.content}`,
    );
    if (selectedText?.trim())
      sections.push(`[Learner-selected text]\n${selectedText.trim()}`);
    if (notes.length)
      sections.push(`[Learner-selected notes]\n${notes.join("\n")}`);
    const combined = sections.join("\n\n");
    return combined.slice(0, this.config.rag.maxContextTokens * 4);
  }

  private systemPrompt(route: "COURSE" | "GENERAL") {
    if (route === "COURSE") {
      return "You are a careful learning tutor. Answer only from supplied course context. Be concise, direct, and complete enough to answer the question. Prefer 2-5 short bullets for list questions and 1-3 short paragraphs for comparison questions. Every factual claim that uses course context must include a source marker like [S1] or [S2] in the same sentence. Do not list sources that are not cited in the answer. Do not reveal quiz answers, grading keys, private submissions, or instructor-only content. If context is insufficient, say so. Always finish the final sentence. Answer in the user's language.";
    }
    return "You are a general educational tutor. Clearly frame the response as general educational knowledge. Be extremely concise, direct, and short. Do not give long explanations unless explicitly requested. Do not claim it comes from the learner's course and do not invent citations. Answer in the user's language.";
  }

  private async repairCourseAnswerIfNeeded(input: {
    provider: AiChatProvider;
    route: "COURSE" | "GENERAL" | "BLOCKED" | "OFF_TOPIC";
    answer: string;
    context: string;
    question: string;
    citations: unknown[];
  }) {
    if (input.route !== "COURSE") return input.answer.trim();
    const answer = input.answer.trim();
    if (this.isGroundedAnswerAcceptable(answer)) return answer;
    try {
      const repaired = await input.provider.generateText({
        systemPrompt:
          "You are repairing a course-grounded tutor answer. Answer only from the supplied context. Use 2-5 short bullets. Every bullet must include at least one source marker such as [S1]. Always finish the final sentence. Answer in the user's language.",
        userPrompt: `${input.context ? `CONTEXT:\n${input.context}\n\n` : ""}QUESTION:\n${input.question}`,
        temperature: 0,
        maxOutputTokens: Math.min(this.config.maxOutputTokens, 500),
      });
      const repairedText = repaired.text.trim();
      if (this.isGroundedAnswerAcceptable(repairedText)) return repairedText;
    } catch {
      return answer;
    }
    return answer;
  }

  private isGroundedAnswerAcceptable(answer: string) {
    if (!answer) return false;
    if (!/\[[^\]]*\bS\d+\b[^\]]*\]/.test(answer)) return false;
    return /[.!?。！？)]$/.test(answer.trim());
  }

  private citations(chunks: RetrievedChunk[]) {
    return chunks.map((chunk, index) => ({
      id: `S${index + 1}`,
      chunkId: chunk.chunkId,
      title: chunk.title,
      sourceType: chunk.sourceType,
      lessonId: chunk.lessonId,
      activityId: chunk.activityId,
      excerpt: chunk.content.slice(0, 240),
      score: Number(chunk.score.toFixed(3)),
    }));
  }

  private filterCitationsForAnswer(answer: string, citations: unknown[]) {
    const referenced = new Set<string>();
    for (const bracket of answer.matchAll(/\[([^\]]+)\]/g)) {
      for (const marker of bracket[1]?.matchAll(/\bS(\d+)\b/g) ?? []) {
        referenced.add(`S${marker[1]}`);
      }
    }
    if (!referenced.size) return [];
    return citations.filter((citation) => {
      const item = this.record(citation);
      return typeof item.id === "string" && referenced.has(item.id);
    });
  }

  private followups(question: string, route: "COURSE" | "GENERAL") {
    if (!this.config.followups.enabled || this.config.followups.count === 0)
      return [];
    const subject = question
      .replace(/[?!.]+$/g, "")
      .trim()
      .slice(0, 90);
    const suggestions =
      route === "COURSE"
        ? [
            `Berikan contoh sederhana tentang ${subject}`,
            `Apa konsep penting yang perlu saya ingat?`,
            `Buat latihan singkat tanpa memberikan kunci jawaban`,
            `Hubungkan materi ini dengan bagian sebelumnya`,
          ]
        : [
            `Berikan contoh praktis tentang ${subject}`,
            `Apa perbedaan konsep utamanya?`,
            `Jelaskan dengan analogi sederhana`,
            `Apa langkah belajar berikutnya?`,
          ];
    return suggestions.slice(0, this.config.followups.count);
  }

  private async selectedNotes(
    organizationId: string,
    userId: string,
    dto: AskAiTutorDto,
  ) {
    if (!dto.includeNoteIds?.length) return [];
    const notes = await this.prisma.learnerNote.findMany({
      where: {
        id: { in: dto.includeNoteIds },
        organizationId,
        userId,
        courseId: dto.courseId,
        deletedAt: null,
      },
      select: { content: true },
    });
    return notes.map((note) => note.content);
  }

  private async finalize(input: {
    organizationId: string;
    userId: string;
    dto: AskAiTutorDto;
    sourceType: SourceType;
    answer: string;
    route: string;
    startedAt: number;
    citations?: unknown[];
    suggestions?: string[];
    cacheHit?: boolean;
    provider?: string;
    model?: string | null;
    canonicalKey?: string | null;
    inputTokens?: number;
    outputTokens?: number;
    status?: string;
  }) {
    const conversation = await this.getConversation(
      input.organizationId,
      input.userId,
      input.dto,
    );
    const provider = input.provider ?? this.config.chatProvider;
    const inputTokens = input.inputTokens ?? estimateTokens(input.dto.question);
    const outputTokens = input.outputTokens ?? estimateTokens(input.answer);
    const writes: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: input.dto.question,
          metadata: {},
        },
      }),
      this.prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: input.answer,
          sourceType: input.sourceType,
          sources: (input.citations ?? []) as Prisma.InputJsonArray,
          provider,
          model: input.model,
          inputTokens,
          outputTokens,
          metadata: {
            suggestions: input.suggestions ?? [],
            cacheHit: input.cacheHit ?? false,
            canonicalKey: input.canonicalKey ?? null,
          },
        },
      }),
    ];
    if (this.config.usage.loggingEnabled) {
      writes.push(
        this.prisma.aiUsageLog.create({
          data: {
            organizationId: input.organizationId,
            userId: input.userId,
            courseId: input.dto.courseId,
            conversationId: conversation.id,
            provider,
            model: input.model,
            requestType: "LEARNER_TUTOR",
            route: input.route,
            sourceType: input.sourceType,
            cacheHit: input.cacheHit ?? false,
            inputTokens,
            outputTokens,
            durationMs: Date.now() - input.startedAt,
            status: input.status ?? "SUCCESS",
            metadata: this.config.usage.logPrompts
              ? { question: input.dto.question }
              : {},
          },
        }),
      );
    }
    const results = await this.prisma.$transaction(writes);
    return {
      conversationId: conversation.id,
      answer: input.answer,
      sourceType: input.sourceType,
      sourceLabel: this.sourceLabel(input.sourceType),
      citations: input.citations ?? [],
      suggestions: input.suggestions ?? [],
      cacheHit: input.cacheHit ?? false,
      disabled: input.sourceType === "DISABLED",
      messageId: (results[1] as { id?: string } | undefined)?.id ?? "",
    };
  }

  private async getConversation(
    organizationId: string,
    userId: string,
    dto: AskAiTutorDto,
  ) {
    if (dto.conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: {
          id: dto.conversationId,
          organizationId,
          userId,
          type: "LEARNER_TUTOR",
        },
      });
      if (!existing) throw new NotFoundException("AI conversation not found");
      return existing;
    }
    return this.prisma.aiConversation.create({
      data: {
        organizationId,
        userId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        activityId: dto.activityId,
        type: "LEARNER_TUTOR",
        title: dto.question.slice(0, 100),
        metadata: {},
      },
    });
  }

  private enforceRateLimit(organizationId: string, userId: string) {
    if (!this.config.rateLimit.enabled) return;
    const now = Date.now();
    const cutoff = now - 60_000;
    const check = (
      map: Map<string, number[]>,
      key: string,
      maximum: number,
    ) => {
      const recent = (map.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      );
      if (recent.length >= maximum) {
        throw new HttpException(
          "AI request rate limit exceeded",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      recent.push(now);
      map.set(key, recent);
    };
    check(
      this.userRequests,
      `${organizationId}:${userId}`,
      this.config.rateLimit.perUserPerMinute,
    );
    check(
      this.organizationRequests,
      organizationId,
      this.config.rateLimit.perOrgPerMinute,
    );
  }

  private sourceLabel(sourceType: SourceType) {
    return {
      COURSE_MATERIAL: "Course material",
      GENERAL_EDUCATIONAL: "General educational",
      BLOCKED: "Blocked",
      OUT_OF_SCOPE: "Out of scope",
      DISABLED: "AI disabled",
    }[sourceType];
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private jsonArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }
}
