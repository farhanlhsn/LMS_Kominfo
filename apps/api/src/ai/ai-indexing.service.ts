import { createHash } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { AiChunkerService } from "./ai-chunker.service";
import { AiEmbeddingProviderFactory } from "./ai-provider.factories";
import type { LocalEmbeddingProvider } from "./ai-provider.types";
import { AiTextExtractorService } from "./ai-text-extractor.service";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

interface IndexableDocument {
  sourceType: string;
  title: string;
  rawText: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
}

type IndexedActivity = Prisma.ActivityGetPayload<{
  include: {
    lesson: { select: { id: true; title: true } };
    activityContent: { include: { file: true } };
    transcriptSegments: true;
  };
}>;

type ExistingIndexedDocument = {
  id: string;
  activityId: string;
  sourceType: string;
  fileId: string | null;
  contentHash: string;
  status: string;
};

type ActivityIndexJob = {
  organizationId: string;
  courseId: string;
  activityId: string;
  rerun: boolean;
};

@Injectable()
export class AiIndexingService {
  private readonly activityJobs = new Map<string, ActivityIndexJob>();
  private readonly courseJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: AiTextExtractorService,
    private readonly chunker: AiChunkerService,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
    @Optional()
    private readonly tenantRuntime?: AiTenantRuntimeService,
  ) {}

  async indexCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const activities = await this.prisma.activity.findMany({
      where: { organizationId: organization.id, courseId, isPublished: true },
      include: {
        lesson: { select: { id: true, title: true } },
        activityContent: { include: { file: true } },
        transcriptSegments: {
          orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
        },
      },
      orderBy: { orderIndex: "asc" },
    });
    const indexedActivityIds = activities
      .filter(
        (activity) => !this.isAssessmentActivity(activity.activityTypeKey),
      )
      .map((activity) => activity.id);
    await this.prisma.aiDocument.deleteMany({
      where: {
        organizationId: organization.id,
        courseId,
        deletedAt: null,
        ...(indexedActivityIds.length
          ? { activityId: { notIn: indexedActivityIds } }
          : {}),
      },
    });
    const existingDocuments = activities.length
      ? await this.prisma.aiDocument.findMany({
          where: {
            organizationId: organization.id,
            courseId,
            activityId: { in: activities.map((activity) => activity.id) },
            deletedAt: null,
          },
          select: {
            id: true,
            activityId: true,
            sourceType: true,
            fileId: true,
            contentHash: true,
            status: true,
          },
        })
      : [];
    const existingDocumentMap =
      this.buildExistingDocumentMap(existingDocuments);
    const results = [];
    for (const activity of activities) {
      results.push(
        await this.indexResolvedActivity(activity, existingDocumentMap),
      );
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
    const activity = await this.findActivityForIndexing(
      organizationId,
      activityId,
    );
    if (!activity) throw new NotFoundException("Activity not found");
    const existingDocuments = await this.prisma.aiDocument.findMany({
      where: {
        organizationId,
        activityId,
        deletedAt: null,
      },
      select: {
        id: true,
        activityId: true,
        sourceType: true,
        fileId: true,
        contentHash: true,
        status: true,
      },
    });
    const existingDocumentMap =
      this.buildExistingDocumentMap(existingDocuments);
    return this.indexResolvedActivity(activity, existingDocumentMap);
  }

  async requestActivityReindex(organizationId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
      select: {
        id: true,
        courseId: true,
        isPublished: true,
        activityTypeKey: true,
      },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    if (
      !activity.isPublished ||
      this.isAssessmentActivity(activity.activityTypeKey)
    ) {
      await this.removeActivityIndex(
        organizationId,
        activity.courseId,
        activityId,
      );
      return {
        queued: false,
        courseId: activity.courseId,
        activityId,
        reason: "not_indexable",
      };
    }

    await this.markActivityNeedsReindex(organizationId, activityId);
    const key = this.activityJobKey(organizationId, activityId);
    const existing = this.activityJobs.get(key);
    if (existing) {
      existing.rerun = true;
      return {
        queued: true,
        courseId: activity.courseId,
        activityId,
        deduplicated: true,
      };
    }

    const job: ActivityIndexJob = {
      organizationId,
      courseId: activity.courseId,
      activityId,
      rerun: false,
    };
    this.activityJobs.set(key, job);
    void this.runActivityIndexJob(key, job);
    return {
      queued: true,
      courseId: activity.courseId,
      activityId,
      deduplicated: false,
    };
  }

  async requestCourseReindex(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const key = this.courseJobKey(organization.id, courseId);
    if (this.courseJobs.has(key)) {
      return { queued: true, courseId, deduplicated: true };
    }
    await this.prisma.aiDocument.updateMany({
      where: {
        organizationId: organization.id,
        courseId,
        deletedAt: null,
      },
      data: { status: "NEEDS_REINDEX", error: null },
    });
    await this.prisma.aiDocumentChunk.updateMany({
      where: { organizationId: organization.id, courseId },
      data: { status: "NEEDS_REINDEX" },
    });
    const promise = this.indexCourse(organization, userId, courseId)
      .then(() => undefined)
      .catch(async (error: unknown) => {
        await this.prisma.aiDocument.updateMany({
          where: {
            organizationId: organization.id,
            courseId,
            deletedAt: null,
          },
          data: {
            status: "FAILED",
            error:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Course indexing failed",
          },
        });
      })
      .finally(() => {
        this.courseJobs.delete(key);
      });
    this.courseJobs.set(key, promise);
    void promise;
    return { queued: true, courseId, deduplicated: false };
  }

  async removeActivityIndex(
    organizationId: string,
    courseId: string,
    activityId: string,
  ) {
    await this.prisma.aiDocument.deleteMany({
      where: { organizationId, courseId, activityId },
    });
  }

  async removeLessonIndexes(
    organizationId: string,
    courseId: string,
    lessonIds: string[],
  ) {
    if (!lessonIds.length) return;
    await this.prisma.aiDocument.deleteMany({
      where: {
        organizationId,
        courseId,
        lessonId: { in: lessonIds },
      },
    });
  }

  private async indexResolvedActivity(
    activity: IndexedActivity,
    existingDocuments: Map<string, ExistingIndexedDocument>,
  ) {
    const organizationId = activity.organizationId;
    const activityId = activity.id;
    if (this.isAssessmentActivity(activity.activityTypeKey)) {
      await this.removeActivityIndex(
        organizationId,
        activity.courseId,
        activityId,
      );
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

    const activeDocumentKeys = new Set(
      documents.map((document) =>
        this.documentKey(
          activity.id,
          document.sourceType,
          document.fileId ?? null,
        ),
      ),
    );
    const staleDocumentIds = [...existingDocuments.values()]
      .filter(
        (document) =>
          document.activityId === activity.id &&
          !activeDocumentKeys.has(
            this.documentKey(
              document.activityId,
              document.sourceType,
              document.fileId,
            ),
          ),
      )
      .map((document) => document.id);
    if (staleDocumentIds.length) {
      await this.prisma.aiDocument.deleteMany({
        where: {
          organizationId,
          id: { in: staleDocumentIds },
        },
      });
    }

    let chunkCount = 0;
    for (const document of documents) {
      chunkCount += await this.persistDocument({
        organizationId,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        activityId,
        existingDocument:
          existingDocuments.get(
            this.documentKey(
              activity.id,
              document.sourceType,
              document.fileId ?? null,
            ),
          ) ?? null,
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
    const statuses = Object.fromEntries(
      grouped.map((item) => [item.status, item._count._all]),
    );
    const documents = grouped.reduce((sum, item) => sum + item._count._all, 0);
    const chunks = await this.prisma.aiDocumentChunk.count({
      where: { organizationId: organization.id, courseId, status: "READY" },
    });
    const isIndexing = this.isCourseIndexing(organization.id, courseId);
    const hasPendingDocuments =
      (statuses.PENDING ?? 0) > 0 ||
      (statuses.INDEXING ?? 0) > 0 ||
      (statuses.NEEDS_REINDEX ?? 0) > 0;
    const hasFailures = (statuses.FAILED ?? 0) > 0;
    const state =
      isIndexing || hasPendingDocuments
        ? "INDEXING"
        : documents === 0 || chunks === 0
          ? "EMPTY"
          : hasFailures
            ? "FAILED"
            : "READY";
    return {
      courseId,
      state,
      ready: state === "READY",
      isIndexing: state === "INDEXING",
      needsReindex: hasPendingDocuments,
      documents,
      statuses,
      chunks,
    };
  }

  async assertCourseReady(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const status = await this.courseStatus(organization, userId, courseId);
    if (status.isIndexing) {
      throw new BadRequestException(
        "Course material is still being indexed. Generate questions after indexing completes.",
      );
    }
    if (!status.ready) {
      throw new BadRequestException(
        status.state === "FAILED"
          ? "Course material indexing failed. Retry indexing before generating questions."
          : "Course has no ready indexed material. Add or index material before generating questions.",
      );
    }
    return status;
  }

  async courseSources(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const sources = await this.prisma.aiDocument.findMany({
      where: {
        organizationId: organization.id,
        courseId,
        status: "READY",
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        lessonId: true,
        activityId: true,
        fileId: true,
        indexedAt: true,
        _count: { select: { chunks: true } },
      },
      orderBy: [{ lessonId: "asc" }, { activityId: "asc" }, { title: "asc" }],
    });
    return sources.map(({ _count, ...source }) => ({
      ...source,
      chunkCount: _count.chunks,
    }));
  }

  private async persistDocument(
    input: {
      organizationId: string;
      courseId: string;
      lessonId: string;
      activityId: string;
      existingDocument?: ExistingIndexedDocument | null;
    } & IndexableDocument,
  ): Promise<number> {
    const contentHash = createHash("sha256")
      .update(input.rawText)
      .digest("hex");
    const existing = input.existingDocument ?? null;
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
      const tenantConfig = await this.tenantRuntime?.assertReady(
        input.organizationId,
      );
      const provider = this.embeddingFactory.create(tenantConfig);
      const vectors = await provider.embedBatch(
        chunks.map((chunk) => chunk.content),
      );
      this.assertValidEmbeddings(
        vectors,
        chunks.length,
        provider.capabilities.embeddingDimensions,
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

  private async markActivityNeedsReindex(
    organizationId: string,
    activityId: string,
  ) {
    await this.prisma.aiDocument.updateMany({
      where: { organizationId, activityId, deletedAt: null },
      data: { status: "NEEDS_REINDEX", error: null },
    });
    await this.prisma.aiDocumentChunk.updateMany({
      where: { organizationId, activityId },
      data: { status: "NEEDS_REINDEX" },
    });
  }

  private async runActivityIndexJob(key: string, job: ActivityIndexJob) {
    try {
      do {
        job.rerun = false;
        await this.indexActivity(job.organizationId, job.activityId);
      } while (job.rerun);
    } catch {
      await this.prisma.aiDocument.updateMany({
        where: {
          organizationId: job.organizationId,
          activityId: job.activityId,
          deletedAt: null,
        },
        data: {
          status: "FAILED",
          error: "Automatic indexing failed",
        },
      });
    } finally {
      this.activityJobs.delete(key);
    }
  }

  private isCourseIndexing(organizationId: string, courseId: string) {
    if (this.courseJobs.has(this.courseJobKey(organizationId, courseId))) {
      return true;
    }
    return [...this.activityJobs.values()].some(
      (job) =>
        job.organizationId === organizationId && job.courseId === courseId,
    );
  }

  private activityJobKey(organizationId: string, activityId: string) {
    return `${organizationId}:${activityId}`;
  }

  private courseJobKey(organizationId: string, courseId: string) {
    return `${organizationId}:${courseId}`;
  }

  private isAssessmentActivity(activityTypeKey: string) {
    return (
      activityTypeKey === "core.quiz" || activityTypeKey === "core.assignment"
    );
  }

  private assertValidEmbeddings(
    vectors: number[][],
    expectedCount: number,
    expectedDimensions?: number,
  ) {
    if (vectors.length !== expectedCount) {
      throw new Error("Embedding provider returned an unexpected vector count");
    }
    const dimensions = vectors[0]?.length ?? 0;
    if (
      !dimensions ||
      (expectedDimensions !== undefined && dimensions !== expectedDimensions) ||
      vectors.some(
        (vector) =>
          vector.length !== dimensions ||
          vector.some((value) => !Number.isFinite(value)),
      )
    ) {
      throw new Error("Embedding provider returned invalid vectors");
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

  private documentKey(
    activityId: string,
    sourceType: string,
    fileId: string | null,
  ) {
    return `${activityId}:${sourceType}:${fileId ?? "null"}`;
  }

  private buildExistingDocumentMap(
    documents: Array<{
      id: string;
      activityId: string | null;
      sourceType: string;
      fileId: string | null;
      contentHash: string;
      status: string;
    }>,
  ) {
    const mapped = new Map<string, ExistingIndexedDocument>();
    for (const document of documents) {
      if (!document.activityId) {
        continue;
      }
      mapped.set(
        this.documentKey(
          document.activityId,
          document.sourceType,
          document.fileId ?? null,
        ),
        {
          ...document,
          activityId: document.activityId,
        },
      );
    }
    return mapped;
  }

  private findActivityForIndexing(organizationId: string, activityId: string) {
    return this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        lesson: { select: { id: true, title: true } },
        activityContent: { include: { file: true } },
        transcriptSegments: {
          orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
        },
      },
    });
  }
}
