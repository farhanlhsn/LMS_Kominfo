import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { AiChatProviderFactory } from "./ai-provider.factories";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

type GradingSuggestion = {
  pointsAwarded: number;
  confidence: number;
  feedback: string;
  rationale: string;
  provider: string;
  model: string | null;
  reviewRequired: true;
};

@Injectable()
export class AiGradingAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatFactory: AiChatProviderFactory,
    private readonly tenantRuntime: AiTenantRuntimeService,
  ) {}

  async suggest(
    organization: OrganizationContext,
    userId: string,
    answerId: string,
  ): Promise<GradingSuggestion> {
    const answer = await this.prisma.quizAnswer.findFirst({
      where: { id: answerId, organizationId: organization.id },
      include: {
        question: true,
        attempt: {
          include: {
            quiz: { select: { id: true, courseId: true, title: true } },
          },
        },
      },
    });
    if (!answer) throw new NotFoundException("Answer not found");
    if (!["ESSAY", "SHORT_ANSWER"].includes(answer.question.type)) {
      throw new BadRequestException(
        "AI grading suggestions support written answers only",
      );
    }
    if (!answer.textAnswer?.trim()) {
      throw new BadRequestException("Written answer is empty");
    }
    await this.ensureCanGrade(
      organization,
      userId,
      answer.attempt.quiz.courseId,
    );

    const config = await this.tenantRuntime.assertReady(organization.id);
    const provider = this.chatFactory.create(config);
    const maxPoints = answer.maxPoints || answer.question.points;
    const acceptedAnswers = this.stringArray(answer.question.acceptedAnswers);
    let suggestion = this.fallbackSuggestion(
      answer.textAnswer,
      acceptedAnswers,
      maxPoints,
    );
    try {
      const result = await provider.generateText({
        systemPrompt:
          "Act as a grading assistant. Return strict JSON only: {\"pointsAwarded\": number, \"confidence\": number, \"feedback\": string, \"rationale\": string}. Score within the supplied maximum. This is an instructor suggestion, never a final grade.",
        userPrompt: [
          `QUESTION:\n${answer.question.prompt}`,
          `MAX POINTS:\n${maxPoints}`,
          `REFERENCE ANSWERS:\n${acceptedAnswers.join("\n") || "No reference answer supplied"}`,
          `LEARNER ANSWER:\n${answer.textAnswer}`,
        ].join("\n\n"),
        temperature: 0.1,
        maxOutputTokens: 500,
      });
      suggestion = this.parseSuggestion(result.text, maxPoints) ?? suggestion;
    } catch {
      // Deterministic fallback keeps review workflow usable if provider fails.
    }
    const response: GradingSuggestion = {
      ...suggestion,
      provider: provider.capabilities.providerName,
      model: provider.capabilities.model,
      reviewRequired: true,
    };
    await this.prisma.quizAnswer.update({
      where: { id: answer.id },
      data: {
        metadata: {
          ...this.object(answer.metadata),
          aiGradingSuggestion: {
            ...response,
            generatedAt: new Date().toISOString(),
            generatedById: userId,
          },
        } as Prisma.InputJsonObject,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId,
        action: "ai_grading.suggestion_created",
        entityType: "QuizAnswer",
        entityId: answer.id,
        metadata: {
          provider: response.provider,
          model: response.model,
          reviewRequired: true,
        },
      },
    });
    return response;
  }

  private async ensureCanGrade(
    organization: OrganizationContext,
    userId: string,
    courseId: string | null,
  ) {
    if (
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("quiz:grade")
    ) {
      return;
    }
    if (courseId) {
      const instructor = await this.prisma.courseInstructor.findFirst({
        where: { organizationId: organization.id, courseId, userId },
        select: { id: true },
      });
      if (instructor) return;
    }
    throw new ForbiddenException("Insufficient quiz grading permissions");
  }

  private fallbackSuggestion(
    learnerAnswer: string,
    acceptedAnswers: string[],
    maxPoints: number,
  ) {
    const normalized = this.normalize(learnerAnswer);
    const referenceScores = acceptedAnswers.map((answer) => {
      const reference = this.normalize(answer);
      if (!reference.size) return 0;
      const overlap = [...reference].filter((term) =>
        normalized.has(term),
      ).length;
      return overlap / reference.size;
    });
    const ratio = referenceScores.length
      ? Math.max(...referenceScores)
      : Math.min(0.75, normalized.size / 80);
    return {
      pointsAwarded: Number((maxPoints * ratio).toFixed(2)),
      confidence: acceptedAnswers.length
        ? Number(Math.min(0.85, 0.45 + ratio * 0.4).toFixed(2))
        : 0.35,
      feedback:
        ratio >= 0.75
          ? "Jawaban mencakup sebagian besar konsep utama. Tinjau ketepatan istilah sebelum menyimpan nilai."
          : "Jawaban perlu diperjelas dan dibandingkan kembali dengan konsep utama pada materi.",
      rationale: acceptedAnswers.length
        ? "Saran dihitung dari cakupan istilah terhadap jawaban referensi."
        : "Tidak ada jawaban referensi; saran memakai kelengkapan jawaban dan berkonfidensi rendah.",
    };
  }

  private parseSuggestion(text: string, maxPoints: number) {
    const match = text.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const value = JSON.parse(match[0]) as Record<string, unknown>;
      if (
        typeof value.pointsAwarded !== "number" ||
        typeof value.feedback !== "string" ||
        typeof value.rationale !== "string"
      ) {
        return null;
      }
      return {
        pointsAwarded: Math.max(
          0,
          Math.min(maxPoints, Number(value.pointsAwarded.toFixed(2))),
        ),
        confidence:
          typeof value.confidence === "number"
            ? Math.max(0, Math.min(1, value.confidence))
            : 0.5,
        feedback: value.feedback.slice(0, 2000),
        rationale: value.rationale.slice(0, 2000),
      };
    } catch {
      return null;
    }
  }

  private normalize(value: string) {
    return new Set(
      value
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+/gu)
        ?.filter((term) => term.length > 2) ?? [],
    );
  }

  private stringArray(value: Prisma.JsonValue) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  private object(value: Prisma.JsonValue) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
