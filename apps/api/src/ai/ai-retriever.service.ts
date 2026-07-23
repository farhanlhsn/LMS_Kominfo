import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AiEmbeddingProviderFactory } from "./ai-provider.factories";
import { PrismaService } from "../prisma/prisma.service";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string | null;
  title: string;
  sourceType: string;
  courseId: string;
  lessonId: string | null;
  activityId: string | null;
  content: string;
  score: number;
}

function cosine(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return -1;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dot / denominator : -1;
}

@Injectable()
export class AiRetrieverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
    @Optional()
    private readonly tenantRuntime?: AiTenantRuntimeService,
  ) {}

  async retrieve(input: {
    organizationId: string;
    userId: string;
    courseId: string;
    lessonId?: string;
    activityId?: string;
    question: string;
    topK: number;
    minScore: number;
  }): Promise<RetrievedChunk[]> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId: input.organizationId,
          courseId: input.courseId,
          userId: input.userId,
        },
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw new ForbiddenException(
        "Course enrollment is required for AI retrieval",
      );
    }
    const course = await this.prisma.course.findFirst({
      where: {
        id: input.courseId,
        organizationId: input.organizationId,
        status: "PUBLISHED",
        deletedAt: null,
      },
    });
    if (!course) throw new NotFoundException("Published course not found");

    const allowedActivities = await this.prisma.activity.findMany({
      where: {
        organizationId: input.organizationId,
        courseId: input.courseId,
        isPublished: true,
        lesson: { isPublished: true },
        activityTypeKey: { notIn: ["core.quiz", "core.assignment"] },
      },
      select: { id: true },
    });
    const activityIds = allowedActivities.map((activity) => activity.id);
    if (!activityIds.length) return [];

    const tenantConfig = await this.tenantRuntime?.assertReady(
      input.organizationId,
    );
    const provider = this.embeddingFactory.create(tenantConfig);
    const queryVector = await provider.embedText(input.question);
    const chunks = await this.prisma.aiDocumentChunk.findMany({
      where: {
        organizationId: input.organizationId,
        courseId: input.courseId,
        activityId: { in: activityIds },
        status: "READY",
        embeddingProvider: provider.capabilities.providerName,
        embeddingModel: provider.capabilities.model ?? "unknown",
        embeddingDimensions: queryVector.length,
        sourceDocument: { is: { status: "READY", deletedAt: null } },
      },
      include: {
        sourceDocument: { select: { id: true, title: true, sourceType: true } },
      },
      take: 500,
    });

    const terms = new Set(
      input.question.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
    );
    return chunks
      .map((chunk) => {
        const vector = Array.isArray(chunk.embedding)
          ? chunk.embedding.filter(
              (value): value is number => typeof value === "number",
            )
          : [];
        const semantic = cosine(queryVector, vector);
        const chunkTerms = new Set(
          chunk.content.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [],
        );
        const matches = [...terms].filter((term) =>
          chunkTerms.has(term),
        ).length;
        const lexical = terms.size ? matches / terms.size : 0;
        const scopeBoost =
          chunk.activityId === input.activityId
            ? 0.25
            : chunk.lessonId === input.lessonId
              ? 0.12
              : 0;
        return {
          chunkId: chunk.id,
          documentId: chunk.sourceDocumentId,
          title: chunk.sourceDocument?.title ?? "Course material",
          sourceType: chunk.sourceDocument?.sourceType ?? "COURSE_CONTENT",
          courseId: chunk.courseId ?? input.courseId,
          lessonId: chunk.lessonId,
          activityId: chunk.activityId,
          content: chunk.content,
          score: Math.min(1, semantic * 0.8 + lexical * 0.2 + scopeBoost),
        };
      })
      .filter((chunk) => chunk.score >= input.minScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }
}
