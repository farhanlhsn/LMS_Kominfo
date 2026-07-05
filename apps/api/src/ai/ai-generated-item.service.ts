import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { Prisma } from "@lms/db";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { AiChatProviderFactory } from "./ai-provider.factories";
import type {
  GenerateVideoQuizDto,
  GenerateVideoSummaryDto,
} from "./dto/video-ai.dto";

type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
  language: string | null;
};

@Injectable()
export class AiGeneratedItemService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly prisma: PrismaService,
    private readonly chatFactory: AiChatProviderFactory,
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
    });
  }

  async listForOrganization(
    organization: OrganizationContext,
    userId: string,
    query: { type?: string; status?: string; activityId?: string } = {},
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
          courseId: { in: courseIds },
          type: query.type as never,
          status: query.status as never,
          activityId: query.activityId,
        },
        orderBy: { createdAt: "desc" },
      });
    }
    return this.prisma.aiGeneratedItem.findMany({
      where: {
        organizationId: organization.id,
        type: query.type as never,
        status: query.status as never,
        activityId: query.activityId,
      },
      orderBy: { createdAt: "desc" },
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
    const updated = await this.prisma.aiGeneratedItem.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
      },
    });
    await this.audit(organization.id, userId, "ai_generated_item.published", item.id);
    return updated;
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
    const generated = await this.generateSummaryText(scope.segments, prompt);
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

  private async generateSummaryText(
    segments: TranscriptSegment[],
    prompt: string,
  ) {
    const transcript = this.transcriptText(segments);
    if (!this.config.enabled) {
      return {
        text: this.fallbackSummary(segments),
        provider: "disabled-fallback",
        model: null,
        source: "fallback",
      };
    }
    const provider = this.chatFactory.create();
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
    activityTitle: string,
    segments: TranscriptSegment[],
    prompt: string,
    questionCount: number,
    difficulty: string,
  ) {
    const fallback = this.fallbackQuiz(activityTitle, segments, questionCount);
    const transcript = this.transcriptText(segments);
    if (!this.config.enabled) {
      return {
        ...fallback,
        provider: "disabled-fallback",
        model: null,
        source: "fallback",
      };
    }
    const provider = this.chatFactory.create();
    try {
      const result = await provider.generateText({
        systemPrompt:
          "You create reviewable instructor quiz drafts from transcripts. Return strict JSON only with shape {\"title\": string, \"instructions\": string, \"questions\": [{\"prompt\": string, \"type\": \"SHORT_ANSWER\", \"suggestedAnswer\": string, \"explanation\": string, \"sourceTimestamp\": number}]}. Answer fields in Bahasa Indonesia.",
        userPrompt: `TITLE:\n${activityTitle}\n\nDIFFICULTY:\n${difficulty}\n\nTRANSCRIPT:\n${transcript}\n\nTASK:\n${prompt}`,
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
            .map((question) => this.normalizeQuizQuestion(question))
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
  ) {
    const questions = segments.slice(0, questionCount).map((segment, index) => ({
      prompt: `Jelaskan inti materi pada ${this.formatTimestamp(segment.startSeconds)} dari video "${activityTitle}".`,
      type: "SHORT_ANSWER",
      suggestedAnswer: segment.text,
      explanation:
        "Tinjau kembali bagian transcript yang dirujuk dan sesuaikan redaksi sebelum dipublikasikan.",
      sourceTimestamp: Math.round(segment.startSeconds),
      orderIndex: index,
    }));
    return {
      title: `Draft quiz for ${activityTitle}`,
      output: {
        title: `Draft quiz for ${activityTitle}`,
        instructions:
          "Draf ini dibuat dari transcript video dan wajib ditinjau instructor sebelum dipublikasikan.",
        questions,
      },
    };
  }

  private normalizeQuizQuestion(value: unknown) {
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
      sourceTimestamp:
        typeof record.sourceTimestamp === "number" &&
        Number.isFinite(record.sourceTimestamp)
          ? Math.max(0, Math.round(record.sourceTimestamp))
          : 0,
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
