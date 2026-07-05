import { createHash } from "node:crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { AiChunkerService } from "./ai-chunker.service";
import { AiEmbeddingProviderFactory } from "./ai-provider.factories";
import type { LocalEmbeddingProvider } from "./ai-provider.types";
import { AiTextExtractorService } from "./ai-text-extractor.service";

interface IndexableDocument {
  sourceType: string;
  title: string;
  rawText: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AiIndexingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: AiTextExtractorService,
    private readonly chunker: AiChunkerService,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
  ) {}

  async indexCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const activities = await this.prisma.activity.findMany({
      where: { organizationId: organization.id, courseId, isPublished: true },
      select: { id: true },
      orderBy: { orderIndex: "asc" },
    });
    const results = [];
    for (const activity of activities) {
      results.push(await this.indexActivity(organization.id, activity.id));
    }
    await this.prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId,
        action: "ai.course.indexed",
        entityType: "Course",
        entityId: courseId,
        metadata: { activityCount: activities.length },
      },
    });
    return {
      courseId,
      activities: results.length,
      documents: results.reduce((sum, result) => sum + result.documents, 0),
      chunks: results.reduce((sum, result) => sum + result.chunks, 0),
    };
  }

  async indexActivity(organizationId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        lesson: { select: { id: true, title: true } },
        activityContent: { include: { file: true } },
        transcriptSegments: {
          orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
        },
      },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    if (
      activity.activityTypeKey === "core.quiz" ||
      activity.activityTypeKey === "core.assignment"
    ) {
      return {
        activityId,
        documents: 0,
        chunks: 0,
        skipped: "assessment_content",
      };
    }

    const documents: IndexableDocument[] = [];
    const richText = this.extractor.fromRichContent(
      activity.activityContent?.textContent ?? null,
      activity.activityContent?.body,
    );
    if (richText) {
      documents.push({
        sourceType: "ACTIVITY_CONTENT",
        title: activity.title,
        rawText: richText,
      });
    }
    const transcript = activity.transcriptSegments
      .map((segment) => segment.text)
      .join("\n")
      .trim();
    if (transcript) {
      documents.push({
        sourceType: "TRANSCRIPT",
        title: `${activity.title} transcript`,
        rawText: transcript,
        metadata: { segmentCount: activity.transcriptSegments.length },
      });
    }
    const file = activity.activityContent?.file;
    if (file && !file.deletedAt) {
      try {
        const rawText = await this.extractor.fromFile(file);
        if (rawText) {
          documents.push({
            sourceType: "FILE",
            title: file.originalFilename,
            rawText,
            fileId: file.id,
            metadata: { mimeType: file.mimeType },
          });
        }
      } catch (error) {
        documents.push({
          sourceType: "FILE",
          title: file.originalFilename,
          rawText: "",
          fileId: file.id,
          metadata: {
            extractionError:
              error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    let chunkCount = 0;
    for (const document of documents) {
      chunkCount += await this.persistDocument({
        organizationId,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        activityId,
        ...document,
      });
    }
    return { activityId, documents: documents.length, chunks: chunkCount };
  }

  async courseStatus(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const grouped = await this.prisma.aiDocument.groupBy({
      by: ["status"],
      where: { organizationId: organization.id, courseId, deletedAt: null },
      _count: { _all: true },
    });
    return {
      courseId,
      documents: grouped.reduce((sum, item) => sum + item._count._all, 0),
      statuses: Object.fromEntries(
        grouped.map((item) => [item.status, item._count._all]),
      ),
      chunks: await this.prisma.aiDocumentChunk.count({
        where: { organizationId: organization.id, courseId, status: "READY" },
      }),
    };
  }

  private async persistDocument(
    input: {
      organizationId: string;
      courseId: string;
      lessonId: string;
      activityId: string;
    } & IndexableDocument,
  ): Promise<number> {
    const contentHash = createHash("sha256")
      .update(input.rawText)
      .digest("hex");
    const existing = await this.prisma.aiDocument.findFirst({
      where: {
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        activityId: input.activityId,
        fileId: input.fileId ?? null,
        deletedAt: null,
      },
    });
    const document = existing
      ? await this.prisma.aiDocument.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            rawText: input.rawText,
            contentHash,
            status: "INDEXING",
            error: null,
            metadata: (input.metadata ?? {}) as Prisma.InputJsonObject,
          },
        })
      : await this.prisma.aiDocument.create({
          data: {
            organizationId: input.organizationId,
            courseId: input.courseId,
            lessonId: input.lessonId,
            activityId: input.activityId,
            fileId: input.fileId,
            title: input.title,
            sourceType: input.sourceType,
            rawText: input.rawText,
            contentHash,
            status: "INDEXING",
            metadata: (input.metadata ?? {}) as Prisma.InputJsonObject,
          },
        });

    if (!input.rawText) {
      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          error: String(input.metadata?.extractionError ?? "No text extracted"),
        },
      });
      return 0;
    }
    if (existing?.contentHash === contentHash && existing.status === "READY") {
      const readyChunks = await this.prisma.aiDocumentChunk.count({
        where: {
          organizationId: input.organizationId,
          sourceDocumentId: document.id,
          status: "READY",
        },
      });
      if (readyChunks > 0) {
        await this.prisma.aiDocument.update({
          where: { id: document.id },
          data: { status: "READY", indexedAt: new Date(), error: null },
        });
        return readyChunks;
      }
    }

    try {
      const chunks = this.chunker.chunk(input.rawText);
      const provider = this.embeddingFactory.create();
      const vectors = await provider.embedBatch(
        chunks.map((chunk) => chunk.content),
      );
      const model = provider.capabilities.model ?? "unknown";
      await this.prisma.$transaction([
        this.prisma.aiDocumentChunk.deleteMany({
          where: {
            organizationId: input.organizationId,
            sourceDocumentId: document.id,
          },
        }),
        this.prisma.aiDocumentChunk.createMany({
          data: chunks.map((chunk, index) => ({
            organizationId: input.organizationId,
            sourceDocumentId: document.id,
            courseId: input.courseId,
            lessonId: input.lessonId,
            activityId: input.activityId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding: (vectors[index] ?? []) as Prisma.InputJsonArray,
            embeddingProvider: provider.capabilities.providerName,
            embeddingModel: model,
            embeddingRevision:
              (provider as Partial<LocalEmbeddingProvider>).revision ?? null,
            embeddingDimensions: vectors[index]?.length ?? 0,
            status: "READY",
            metadata: {},
          })),
        }),
        this.prisma.aiDocument.update({
          where: { id: document.id },
          data: { status: "READY", indexedAt: new Date(), error: null },
        }),
      ]);
      return chunks.length;
    } catch (error) {
      await this.prisma.aiDocument.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return 0;
    }
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: organization.id, deletedAt: null },
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
    });
    if (!instructor)
      throw new ForbiddenException("Insufficient course permissions");
    return course;
  }
}
