import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { Prisma } from "@lms/db";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { AiChatProviderFactory } from "./ai-provider.factories";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";
import type {
  GenerateCourseQuestionsDto,
  GenerateVideoQuizDto,
  GenerateVideoSummaryDto,
} from "./dto/video-ai.dto";

type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
  language: string | null;
};

type QuestionScopeResolution = {
  scope: NonNullable<GenerateCourseQuestionsDto["scope"]>;
  label: string;
  where: Prisma.AiDocumentChunkWhereInput;
  lessonId?: string;
  activityId?: string;
  sourceDocumentIds?: string[];
};

@Injectable()
export class AiGeneratedItemService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly prisma: PrismaService,
    private readonly chatFactory: AiChatProviderFactory,
    @Optional()
    private readonly tenantRuntime?: AiTenantRuntimeService,
  ) {}

  async listForActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    await this.ensureCanManageActivity(organization, userId, activityId, false);
    return this.prisma.aiGeneratedItem.findMany({
      where: {
        organizationId: organization.id,
        activityId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listForOrganization(
    organization: OrganizationContext,
    userId: string,
    query: {
      type?: string;
      status?: string;
      activityId?: string;
      courseId?: string;
    } = {},
  ) {
    if (
      !organization.isPlatformAdmin &&
      !organization.permissionKeys.includes("courses:read") &&
      !organization.permissionKeys.includes("courses:update")
    ) {
      const instructorAssignments = await this.prisma.courseInstructor.findMany({
        where: { organizationId: organization.id, userId },
        select: { courseId: true },
      });
      if (!instructorAssignments.length) {
        throw new ForbiddenException("Insufficient course permissions");
      }
      const courseIds = instructorAssignments.map((assignment) => assignment.courseId);
      return this.prisma.aiGeneratedItem.findMany({
        where: {
          organizationId: organization.id,
          courseId: query.courseId
            ? { in: courseIds.filter((id) => id === query.courseId) }
            : { in: courseIds },
          type: query.type as never,
          status: query.status as never,
          activityId: query.activityId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    return this.prisma.aiGeneratedItem.findMany({
      where: {
        organizationId: organization.id,
        type: query.type as never,
        status: query.status as never,
        activityId: query.activityId,
        courseId: query.courseId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getItem(organizationId: string, itemId: string) {
    const item = await this.prisma.aiGeneratedItem.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) throw new NotFoundException("AI generated item not found");
    return item;
  }

  async updateItemContent(
    organizationId: string,
    itemId: string,
    patch: { title?: string; output?: Record<string, unknown>; prompt?: string },
  ) {
    const item = await this.getItem(organizationId, itemId);
    if (item.status === "PUBLISHED") {
      throw new BadRequestException("Published items are immutable");
    }
    return this.prisma.aiGeneratedItem.update({
      where: { id: item.id },
      data: {
        title: patch.title ?? undefined,
        output: patch.output
          ? (patch.output as Prisma.InputJsonObject)
          : undefined,
        prompt: patch.prompt ?? undefined,
        status: item.status === "REJECTED" ? "DRAFT" : item.status,
      },
    });
  }

  async approveItem(
    organization: OrganizationContext,
    userId: string,
    itemId: string,
  ) {
    const item = await this.getItem(organization.id, itemId);
    if (item.status === "APPROVED" || item.status === "PUBLISHED") {
      return item;
    }
    const updated = await this.prisma.aiGeneratedItem.update({
      where: { id: item.id },
      data: { status: "APPROVED" },
    });
    await this.audit(organization.id, userId, "ai_generated_item.approved", item.id);
    return updated;
  }

  async rejectItem(
    organization: OrganizationContext,
    userId: string,
    itemId: string,
    reason?: string,
  ) {
    const item = await this.getItem(organization.id, itemId);
    if (item.status === "PUBLISHED") {
      throw new BadRequestException("Published items cannot be rejected");
    }
    const updated = await this.prisma.aiGeneratedItem.update({
      where: { id: item.id },
      data: {
        status: "REJECTED",
        metadata: {
          ...((item.metadata ?? {}) as Record<string, unknown>),
          rejectedReason: reason ?? null,
          rejectedAt: new Date().toISOString(),
          rejectedById: userId,
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, userId, "ai_generated_item.rejected", item.id);
    return updated;
  }

  async publishItem(
    organization: OrganizationContext,
    userId: string,
    itemId: string,
  ) {
    const item = await this.getItem(organization.id, itemId);
    if (item.status === "PUBLISHED") return item;
    if (item.status !== "APPROVED") {
      throw new BadRequestException("Item must be approved before publishing");
    }

    // ponytail: materialize QUIZ drafts into question bank on publish
    let bankMeta: Record<string, unknown> = {};
    if (item.type === "QUIZ") {
      bankMeta = await this.materializeQuizToBank(organization, userId, item);
    }

    const updated = await this.prisma.aiGeneratedItem.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
        metadata: {
          ...((item.metadata ?? {}) as Record<string, unknown>),
          ...bankMeta,
          publishedAt: new Date().toISOString(),
          publishedById: userId,
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, userId, "ai_generated_item.published", item.id);
    return updated;
  }

  private async materializeQuizToBank(
    organization: OrganizationContext,
    userId: string,
    item: {
      id: string;
      title: string | null;
      courseId: string | null;
      output: Prisma.JsonValue;
    },
  ) {
    const output =
      item.output && typeof item.output === "object" && !Array.isArray(item.output)
        ? (item.output as Record<string, unknown>)
        : {};
    const rawQuestions = Array.isArray(output.questions) ? output.questions : [];
    const title =
      (typeof output.title === "string" && output.title.trim()) ||
      item.title?.trim() ||
      "AI quiz draft";

    const bank = await this.prisma.questionBank.create({
      data: {
        organizationId: organization.id,
        courseId: item.courseId,
        title: `${title} (AI)`,
        description:
          typeof output.instructions === "string"
            ? output.instructions
            : "Imported from AI quiz draft",
        ownerId: userId,
        metadata: {
          source: "ai_generated_item",
          aiGeneratedItemId: item.id,
        } as Prisma.InputJsonObject,
      },
    });

    let created = 0;
    for (const raw of rawQuestions) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const q = raw as Record<string, unknown>;
      const prompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
      if (prompt.length < 2) continue;
      const suggested =
        typeof q.suggestedAnswer === "string" ? q.suggestedAnswer.trim() : "";
      const explanation =
        typeof q.explanation === "string" ? q.explanation.trim() : undefined;
      await this.prisma.question.create({
        data: {
          organizationId: organization.id,
          questionBankId: bank.id,
          createdById: userId,
          type: "SHORT_ANSWER",
          prompt,
          explanation,
          points: 1,
          acceptedAnswers: (suggested ? [suggested] : []) as Prisma.InputJsonArray,
          metadata: {
            source: "ai_generated_item",
            aiGeneratedItemId: item.id,
            sourceTimestamp:
              typeof q.sourceTimestamp === "number" ? q.sourceTimestamp : null,
          } as Prisma.InputJsonObject,
        },
      });
      created += 1;
    }

    return {
      questionBankId: bank.id,
      questionsCreated: created,
    };
  }

  async generateVideoSummary(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: GenerateVideoSummaryDto,
  ) {
    const scope = await this.loadTranscriptScope(
      organization,
      userId,
      activityId,
      dto.language,
      true,
    );
    const prompt =
      dto.prompt?.trim() ||
      "Summarize the video transcript into 4-6 short bullets. Keep it factual, instructor-ready, and easy to review. Answer in Bahasa Indonesia.";
    const generated = await this.generateSummaryText(
      organization.id,
      scope.segments,
      prompt,
    );
    const item = await this.prisma.aiGeneratedItem.create({
      data: {
        organizationId: organization.id,
        courseId: scope.activity.courseId,
        lessonId: scope.activity.lessonId,
        activityId,
        createdById: userId,
        type: "SUMMARY",
        title: `Draft summary for ${scope.activity.title}`,
        prompt,
        output: {
          format: "markdown",
          content: generated.text,
          transcriptLanguage: scope.language,
          transcriptSegmentCount: scope.segments.length,
        } as Prisma.InputJsonObject,
        status: "DRAFT",
        metadata: {
          provider: generated.provider,
          model: generated.model,
          source: generated.source,
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "ai_generated_item.summary_created",
      item.id,
    );
    return item;
  }

  async generateVideoQuiz(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: GenerateVideoQuizDto,
  ) {
    const scope = await this.loadTranscriptScope(
      organization,
      userId,
      activityId,
      dto.language,
      true,
    );
    const questionCount = dto.questionCount ?? 5;
    const difficulty = dto.difficulty ?? "medium";
    const prompt =
      dto.prompt?.trim() ||
      `Create a reviewable quiz draft from the transcript with ${questionCount} questions at ${difficulty} difficulty. Return JSON with title, instructions, and questions. Each question must include prompt, type, suggestedAnswer, explanation, and sourceTimestamp.`;
    const generated = await this.generateQuizDraft(
      organization.id,
      scope.activity.title,
      scope.segments,
      prompt,
      questionCount,
      difficulty,
    );
    const item = await this.prisma.aiGeneratedItem.create({
      data: {
        organizationId: organization.id,
        courseId: scope.activity.courseId,
        lessonId: scope.activity.lessonId,
        activityId,
        createdById: userId,
        type: "QUIZ",
        title: generated.title,
        prompt,
        output: generated.output as Prisma.InputJsonObject,
        status: "DRAFT",
        metadata: {
          provider: generated.provider,
          model: generated.model,
          source: generated.source,
          transcriptLanguage: scope.language,
          transcriptSegmentCount: scope.segments.length,
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "ai_generated_item.quiz_created",
      item.id,
    );
    return item;
  }

  async generateCourseQuestions(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    dto: GenerateCourseQuestionsDto,
  ) {
    const course = await this.ensureCanManageCourse(
      organization,
      userId,
      courseId,
    );
    const resolvedScope = await this.resolveQuestionScope(
      organization.id,
      courseId,
      dto,
    );
    const chunks = await this.prisma.aiDocumentChunk.findMany({
      where: resolvedScope.where,
      select: {
        content: true,
        sourceDocument: { select: { title: true, sourceType: true } },
      },
      orderBy: [{ lessonId: "asc" }, { chunkIndex: "asc" }],
      take: 40,
    });
    if (!chunks.length) {
      throw new BadRequestException(
        `No indexed material found for ${resolvedScope.label}. Index course knowledge or choose another scope.`,
      );
    }
    const questionCount = dto.questionCount ?? 5;
    const difficulty = dto.difficulty ?? "medium";
    const prompt =
      dto.prompt?.trim() ||
      `Create ${questionCount} reviewable questions at ${difficulty} difficulty using only ${resolvedScope.label}.`;
    const generated = await this.generateQuizDraft(
      organization.id,
      `${course.title} - ${resolvedScope.label}`,
      chunks.map((chunk) => ({
        startSeconds: 0,
        endSeconds: 0,
        text: `[${chunk.sourceDocument?.title ?? "Course material"} | ${chunk.sourceDocument?.sourceType ?? "CONTENT"}]\n${chunk.content}`,
        language: null,
      })),
      prompt,
      questionCount,
      difficulty,
      "MATERIAL",
    );
    const item = await this.prisma.aiGeneratedItem.create({
      data: {
        organizationId: organization.id,
        courseId,
        lessonId: resolvedScope.lessonId,
        activityId: resolvedScope.activityId,
        createdById: userId,
        type: "QUIZ",
        title: generated.title,
        prompt,
        output: generated.output as Prisma.InputJsonObject,
        status: "DRAFT",
        metadata: {
          provider: generated.provider,
          model: generated.model,
          source: generated.source,
          indexedChunkCount: chunks.length,
          scope: resolvedScope.scope,
          scopeLabel: resolvedScope.label,
          sourceDocumentIds: resolvedScope.sourceDocumentIds ?? [],
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "ai_generated_item.course_questions_created",
      item.id,
    );
    return item;
  }

  private async resolveQuestionScope(
    organizationId: string,
    courseId: string,
    dto: GenerateCourseQuestionsDto,
  ): Promise<QuestionScopeResolution> {
    const scope = dto.scope ?? "COURSE";
    const baseWhere: Prisma.AiDocumentChunkWhereInput = {
      organizationId,
      courseId,
      status: "READY",
      sourceDocument: { is: { status: "READY", deletedAt: null } },
    };

    if (scope === "COURSE") {
      return {
        scope,
        label: "the entire indexed course",
        where: baseWhere,
      };
    }

    if (scope === "MODULE") {
      if (!dto.moduleId) {
        throw new BadRequestException("moduleId is required for MODULE scope");
      }
      const module = await this.prisma.courseModule.findFirst({
        where: { id: dto.moduleId, organizationId, courseId },
        select: {
          title: true,
          lessons: { select: { id: true } },
        },
      });
      if (!module) {
        throw new BadRequestException(
          "Selected module does not belong to this course",
        );
      }
      return {
        scope,
        label: `module "${module.title}"`,
        where: {
          ...baseWhere,
          lessonId: { in: module.lessons.map((lesson) => lesson.id) },
        },
      };
    }

    if (scope === "LESSON") {
      if (!dto.lessonId) {
        throw new BadRequestException("lessonId is required for LESSON scope");
      }
      const lesson = await this.prisma.lesson.findFirst({
        where: { id: dto.lessonId, organizationId, courseId },
        select: { id: true, title: true },
      });
      if (!lesson) {
        throw new BadRequestException(
          "Selected lesson does not belong to this course",
        );
      }
      return {
        scope,
        label: `lesson "${lesson.title}"`,
        lessonId: lesson.id,
        where: { ...baseWhere, lessonId: lesson.id },
      };
    }

    if (scope === "ACTIVITY") {
      if (!dto.activityId) {
        throw new BadRequestException(
          "activityId is required for ACTIVITY scope",
        );
      }
      const activity = await this.prisma.activity.findFirst({
        where: { id: dto.activityId, organizationId, courseId },
        select: { id: true, lessonId: true, title: true },
      });
      if (!activity) {
        throw new BadRequestException(
          "Selected activity does not belong to this course",
        );
      }
      return {
        scope,
        label: `activity "${activity.title}"`,
        lessonId: activity.lessonId,
        activityId: activity.id,
        where: { ...baseWhere, activityId: activity.id },
      };
    }

    const sourceDocumentIds = [...new Set(dto.sourceDocumentIds ?? [])];
    if (!sourceDocumentIds.length) {
      throw new BadRequestException(
        "sourceDocumentIds is required for DOCUMENTS scope",
      );
    }
    const documents = await this.prisma.aiDocument.findMany({
      where: {
        id: { in: sourceDocumentIds },
        organizationId,
        courseId,
        status: "READY",
        deletedAt: null,
      },
      select: { id: true, title: true },
    });
    if (documents.length !== sourceDocumentIds.length) {
      throw new BadRequestException(
        "One or more selected materials are unavailable in this course",
      );
    }
    return {
      scope,
      label:
        documents.length === 1
          ? `selected material "${documents[0]?.title ?? "material"}"`
          : `${documents.length} selected materials`,
      sourceDocumentIds,
      where: { ...baseWhere, sourceDocumentId: { in: sourceDocumentIds } },
    };
  }

  private async loadTranscriptScope(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    language?: string,
    requireUpdate = false,
  ) {
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      activityId,
      requireUpdate,
    );
    if (activity.activityTypeKey !== "core.video") {
      throw new BadRequestException(
        "AI transcript generation is only available for video activities",
      );
    }
    const segments = await this.prisma.transcriptSegment.findMany({
      where: {
        organizationId: organization.id,
        activityId,
        language: language ?? undefined,
      },
      orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
    });
    if (!segments.length) {
      throw new BadRequestException(
        "A transcript is required before generating AI video drafts",
      );
    }
    return {
      activity,
      segments,
      language:
        language ??
        segments.find((segment) => segment.language)?.language ??
        "und",
    };
  }

  private async ensureCanManageActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    requireUpdate: boolean,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId: organization.id },
      select: {
        id: true,
        title: true,
        courseId: true,
        lessonId: true,
        activityTypeKey: true,
      },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    if (organization.isPlatformAdmin) return activity;
    const permission = requireUpdate ? "courses:update" : "courses:read";
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: {
        organizationId: organization.id,
        courseId: activity.courseId,
        userId,
      },
      select: { id: true },
    });
    if (
      !organization.permissionKeys.includes(permission) &&
      !organization.permissionKeys.includes("courses:update") &&
      !instructor
    ) {
      throw new ForbiddenException("Insufficient course permissions");
    }
    return activity;
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: organization.id, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("courses:update")
    ) {
      return course;
    }
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, courseId, userId },
      select: { id: true },
    });
    if (!instructor) {
      throw new ForbiddenException("Insufficient course permissions");
    }
    return course;
  }

  private async generateSummaryText(
    organizationId: string,
    segments: TranscriptSegment[],
    prompt: string,
  ) {
    const transcript = this.transcriptText(segments);
    const config =
      (await this.tenantRuntime?.assertReady(organizationId)) ?? this.config;
    if (!config.enabled) {
      return {
        text: this.fallbackSummary(segments),
        provider: "disabled-fallback",
        model: null,
        source: "fallback",
      };
    }
    const provider = this.chatFactory.create(config);
    try {
      const result = await provider.generateText({
        systemPrompt:
          "You create concise instructor-facing summaries from course video transcripts. Keep the result as 4-6 short bullets. Do not publish. Answer in Bahasa Indonesia.",
        userPrompt: `TRANSCRIPT:\n${transcript}\n\nTASK:\n${prompt}`,
        temperature: 0.3,
        maxOutputTokens: 500,
      });
      return {
        text: result.text.trim() || this.fallbackSummary(segments),
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        source: "provider",
      };
    } catch {
      return {
        text: this.fallbackSummary(segments),
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        source: "fallback",
      };
    }
  }

  private async generateQuizDraft(
    organizationId: string,
    activityTitle: string,
    segments: TranscriptSegment[],
    prompt: string,
    questionCount: number,
    difficulty: string,
    sourceMode: "TRANSCRIPT" | "MATERIAL" = "TRANSCRIPT",
  ) {
    const fallback = this.fallbackQuiz(
      activityTitle,
      segments,
      questionCount,
      sourceMode,
    );
    const sourceText =
      sourceMode === "TRANSCRIPT"
        ? this.transcriptText(segments)
        : this.materialText(segments);
    const config =
      (await this.tenantRuntime?.assertReady(organizationId)) ?? this.config;
    if (!config.enabled) {
      return {
        ...fallback,
        provider: "disabled-fallback",
        model: null,
        source: "fallback",
      };
    }
    const provider = this.chatFactory.create(config);
    try {
      const result = await provider.generateText({
        systemPrompt:
          sourceMode === "TRANSCRIPT"
            ? "You create reviewable instructor quiz drafts from transcripts. Return strict JSON only with shape {\"title\": string, \"instructions\": string, \"questions\": [{\"prompt\": string, \"type\": \"SHORT_ANSWER\", \"suggestedAnswer\": string, \"explanation\": string, \"sourceTimestamp\": number}]}. Answer fields in Bahasa Indonesia."
            : "You create reviewable instructor quiz drafts using only supplied learning materials. Do not invent timestamps or facts. Return strict JSON only with shape {\"title\": string, \"instructions\": string, \"questions\": [{\"prompt\": string, \"type\": \"SHORT_ANSWER\", \"suggestedAnswer\": string, \"explanation\": string}]}. Answer fields in Bahasa Indonesia.",
        userPrompt: `TITLE:\n${activityTitle}\n\nDIFFICULTY:\n${difficulty}\n\n${sourceMode === "TRANSCRIPT" ? "TRANSCRIPT" : "MATERIALS"}:\n${sourceText}\n\nTASK:\n${prompt}`,
        temperature: 0.2,
        maxOutputTokens: 1200,
      });
      const parsed = this.parseJsonObject(result.text);
      if (!parsed) {
        return {
          ...fallback,
          provider: provider.capabilities.providerName,
          model: provider.capabilities.model,
          source: "fallback",
        };
      }
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions
            .map((question) =>
              this.normalizeQuizQuestion(
                question,
                sourceMode === "TRANSCRIPT",
              ),
            )
            .filter(Boolean)
            .slice(0, questionCount)
        : [];
      if (!questions.length) {
        return {
          ...fallback,
          provider: provider.capabilities.providerName,
          model: provider.capabilities.model,
          source: "fallback",
        };
      }
      return {
        title:
          (typeof parsed.title === "string" && parsed.title.trim()) ||
          fallback.title,
        output: {
          title:
            (typeof parsed.title === "string" && parsed.title.trim()) ||
            fallback.title,
          instructions:
            (typeof parsed.instructions === "string" &&
              parsed.instructions.trim()) ||
            fallback.output.instructions,
          questions,
        },
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        source: "provider",
      };
    } catch {
      return {
        ...fallback,
        provider: provider.capabilities.providerName,
        model: provider.capabilities.model,
        source: "fallback",
      };
    }
  }

  private fallbackSummary(segments: TranscriptSegment[]) {
    return segments
      .slice(0, 5)
      .map(
        (segment, index) =>
          `- ${index + 1}. ${segment.text.slice(0, 160)} (${this.formatTimestamp(segment.startSeconds)})`,
      )
      .join("\n");
  }

  private fallbackQuiz(
    activityTitle: string,
    segments: TranscriptSegment[],
    questionCount: number,
    sourceMode: "TRANSCRIPT" | "MATERIAL",
  ) {
    const questions = segments.slice(0, questionCount).map((segment, index) => {
      const excerpt = segment.text.replace(/\s+/g, " ").trim().slice(0, 180);
      return {
        prompt:
          sourceMode === "TRANSCRIPT"
            ? `Jelaskan inti materi pada ${this.formatTimestamp(segment.startSeconds)} dari video "${activityTitle}".`
            : `Jelaskan konsep utama dari materi berikut: "${excerpt}"`,
        type: "SHORT_ANSWER",
        suggestedAnswer: segment.text,
        explanation:
          sourceMode === "TRANSCRIPT"
            ? "Tinjau kembali bagian transcript yang dirujuk dan sesuaikan redaksi sebelum dipublikasikan."
            : "Tinjau kembali sumber materi terpilih dan sesuaikan redaksi sebelum dipublikasikan.",
        ...(sourceMode === "TRANSCRIPT"
          ? { sourceTimestamp: Math.round(segment.startSeconds) }
          : {}),
        orderIndex: index,
      };
    });
    return {
      title: `Draft quiz for ${activityTitle}`,
      output: {
        title: `Draft quiz for ${activityTitle}`,
        instructions:
          sourceMode === "TRANSCRIPT"
            ? "Draf ini dibuat dari transcript video dan wajib ditinjau instructor sebelum dipublikasikan."
            : "Draf ini dibuat hanya dari materi terpilih dan wajib ditinjau instructor sebelum dipublikasikan.",
        questions,
      },
    };
  }

  private normalizeQuizQuestion(value: unknown, includeTimestamp = true) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const prompt =
      typeof record.prompt === "string" ? record.prompt.trim() : "";
    const suggestedAnswer =
      typeof record.suggestedAnswer === "string"
        ? record.suggestedAnswer.trim()
        : "";
    if (!prompt || !suggestedAnswer) return null;
    return {
      prompt,
      type: "SHORT_ANSWER",
      suggestedAnswer,
      explanation:
        typeof record.explanation === "string" && record.explanation.trim()
          ? record.explanation.trim()
          : "Tinjau kembali draf ini sebelum dipublikasikan.",
      ...(includeTimestamp
        ? {
            sourceTimestamp:
              typeof record.sourceTimestamp === "number" &&
              Number.isFinite(record.sourceTimestamp)
                ? Math.max(0, Math.round(record.sourceTimestamp))
                : 0,
          }
        : {}),
    };
  }

  private parseJsonObject(text: string) {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      const parsed = JSON.parse(objectMatch[0]) as Record<string, unknown>;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  private transcriptText(segments: TranscriptSegment[]) {
    return segments
      .map(
        (segment) =>
          `[${this.formatTimestamp(segment.startSeconds)}-${this.formatTimestamp(segment.endSeconds)}] ${segment.text}`,
      )
      .join("\n")
      .slice(0, 12_000);
  }

  private materialText(segments: TranscriptSegment[]) {
    return segments
      .map((segment, index) => `SOURCE ${index + 1}:\n${segment.text}`)
      .join("\n\n")
      .slice(0, 12_000);
  }

  private formatTimestamp(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    return [hours, minutes, remainingSeconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "AiGeneratedItem",
        entityId,
        metadata: {},
      },
    });
  }
}
