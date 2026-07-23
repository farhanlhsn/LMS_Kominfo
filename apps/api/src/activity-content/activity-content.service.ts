import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { htmlToPlainText, sanitizeRichTextHtml } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { FileAccessPolicyService } from "../files/file-access-policy.service";
import { FilesService } from "../files/files.service";
import { ContentProcessingService } from "../content-processing/content-processing.service";
import { PluginRegistry } from "../plugins/plugin-registry.service";
import { AiIndexingService } from "../ai/ai-indexing.service";
import type {
  AttachFileDto,
  AttachLibraryItemDto,
  ReprocessContentDto,
  UpdateActivityContentDto,
  VideoProgressDto,
} from "./dto/activity-content.dto";

@Injectable()
export class ActivityContentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FileAccessPolicyService)
    private readonly fileAccessPolicy: FileAccessPolicyService,
    @Inject(FilesService) private readonly filesService: FilesService,
    @Inject(ContentProcessingService)
    private readonly contentProcessing: ContentProcessingService,
    @Inject(PluginRegistry)
    private readonly pluginRegistry: PluginRegistry,
    @Inject(AiIndexingService)
    private readonly aiIndexing: AiIndexingService,
  ) {}

  async updateActivityContent(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: UpdateActivityContentDto,
  ) {
    const activity = await this.getActivity(organization.id, activityId);
    await this.fileAccessPolicy.ensureInstructorCanManageCourse(
      organization,
      userId,
      activity.courseId,
    );

    if (dto.fileId) {
      await this.fileAccessPolicy.ensureCanReadFile(
        organization,
        userId,
        dto.fileId,
      );
    }

    const contentPayload = this.normalizeContentPayload(
      activity.activityTypeKey,
      dto,
    );
    const metadata = (dto.metadata ?? {}) as Prisma.InputJsonObject;
    const activityContent = await this.prisma.activityContent.upsert({
      where: { activityId },
      update: {
        body: contentPayload,
        content: contentPayload,
        textContent: dto.textContent,
        externalUrl: dto.externalUrl,
        fileId: dto.fileId,
        metadata,
      },
      create: {
        organizationId: organization.id,
        activityId,
        body: contentPayload,
        content: contentPayload,
        textContent: dto.textContent,
        externalUrl: dto.externalUrl,
        fileId: dto.fileId,
        metadata,
      },
      include: { file: true },
    });

    await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        content: {
          ...contentPayload,
          textContent:
            dto.textContent ?? htmlToPlainTextFromPayload(contentPayload),
          externalUrl: dto.externalUrl,
          fileId: dto.fileId,
        } as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "activity.content.updated",
      activityId,
    );
    await this.contentProcessing.enqueue("CONTENT_UPDATED", {
      organizationId: organization.id,
      activityId,
    });
    if (dto.fileId) {
      await this.contentProcessing.enqueue("AI_INDEXING_REQUESTED", {
        organizationId: organization.id,
        activityId,
        fileId: dto.fileId,
      });
    }
    await this.aiIndexing.requestActivityReindex(organization.id, activityId);

    return activityContent;
  }

  async attachFile(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: AttachFileDto,
  ) {
    return this.updateActivityContent(organization, userId, activityId, {
      fileId: dto.fileId,
      content: { fileId: dto.fileId },
    });
  }

  async attachLibraryItem(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: AttachLibraryItemDto,
  ) {
    const item = await this.prisma.contentLibraryItem.findFirst({
      where: {
        id: dto.libraryItemId,
        organizationId: organization.id,
        deletedAt: null,
      },
      include: { file: true },
    });
    if (!item) {
      throw new NotFoundException("Content library item not found");
    }
    const itemMetadata =
      typeof item.metadata === "object" &&
      item.metadata !== null &&
      !Array.isArray(item.metadata)
        ? (item.metadata as Record<string, unknown>)
        : {};
    return this.updateActivityContent(organization, userId, activityId, {
      fileId: item.fileId ?? undefined,
      textContent:
        typeof itemMetadata.textContent === "string"
          ? itemMetadata.textContent
          : undefined,
      content: {
        libraryItemId: item.id,
        title: item.title,
        type: item.type,
        metadata: item.metadata,
      },
    });
  }

  async getLearningContent(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId: organization.id },
      include: {
        activityContent: { include: { file: true } },
        course: true,
      },
    });
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    await this.ensureEnrollmentOrPublic(
      organization.id,
      userId,
      activity.courseId,
    );
    const content = activity.activityContent;
    let fileAccess: { url: string; expiresInSeconds: number } | null = null;
    if (content?.fileId) {
      fileAccess = await this.filesService.signedUrl(
        organization,
        userId,
        content.fileId,
        { expiresInSeconds: 300 },
        activity.courseId,
      );
    }
    const plugin = await this.resolvePluginAvailability(
      organization.id,
      activity,
    );
    return {
      activity: {
        id: activity.id,
        title: activity.title,
        activityTypeKey: activity.activityTypeKey,
        completionRule: activity.completionRule,
      },
      plugin,
      content,
      fileAccess,
    };
  }

  async updateVideoProgress(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: VideoProgressDto,
  ) {
    const activity = await this.getActivity(organization.id, activityId);
    const enrollment = await this.ensureEnrollmentOrPublic(
      organization.id,
      userId,
      activity.courseId,
    );
    const watchedPercent =
      dto.watchedPercent ??
      (dto.durationSeconds > 0
        ? Math.min(
            Math.round((dto.currentTimeSeconds / dto.durationSeconds) * 100),
            100,
          )
        : 0);
    const completedByWatchRule = watchedPercent >= 80;
    const now = new Date();
    const existingProgress = await this.prisma.activityProgress.findUnique({
      where: {
        organizationId_userId_activityId: {
          organizationId: organization.id,
          userId,
          activityId,
        },
      },
    });

    let progress;
    if (existingProgress) {
      const isAlreadyCompleted = existingProgress.status === "COMPLETED";
      const newStatus =
        isAlreadyCompleted || completedByWatchRule
          ? "COMPLETED"
          : "IN_PROGRESS";

      progress = await this.prisma.activityProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: newStatus,
          progressPercent: Math.max(
            watchedPercent,
            existingProgress.progressPercent,
          ),
          completedAt: isAlreadyCompleted
            ? existingProgress.completedAt
            : completedByWatchRule
              ? now
              : null,
          lastAccessedAt: now,
          metadata: {
            ...((existingProgress.metadata as object) || {}),
            currentTimeSeconds: dto.currentTimeSeconds,
            durationSeconds: dto.durationSeconds,
            watchedPercent: Math.max(
              watchedPercent,
              existingProgress.metadata
                ? (existingProgress.metadata as any).watchedPercent || 0
                : 0,
            ),
            lastWatchedAt: now.toISOString(),
            completedByWatchRule: isAlreadyCompleted || completedByWatchRule,
          },
        },
      });
    } else {
      progress = await this.prisma.activityProgress.create({
        data: {
          organizationId: organization.id,
          userId,
          courseId: activity.courseId,
          lessonId: activity.lessonId,
          activityId,
          enrollmentId: enrollment.id,
          status: completedByWatchRule ? "COMPLETED" : "IN_PROGRESS",
          progressPercent: watchedPercent,
          startedAt: now,
          completedAt: completedByWatchRule ? now : null,
          lastAccessedAt: now,
          metadata: {
            currentTimeSeconds: dto.currentTimeSeconds,
            durationSeconds: dto.durationSeconds,
            watchedPercent,
            lastWatchedAt: now.toISOString(),
            completedByWatchRule,
          },
        },
      });
    }
    return progress;
  }

  async reprocessContent(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: ReprocessContentDto,
  ) {
    const activity = await this.getActivity(organization.id, activityId);
    await this.fileAccessPolicy.ensureInstructorCanManageCourse(
      organization,
      userId,
      activity.courseId,
    );
    return this.contentProcessing.enqueue("CONTENT_UPDATED", {
      organizationId: organization.id,
      activityId,
      reason: dto.reason ?? "manual",
    });
  }

  private async getActivity(organizationId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    return activity;
  }

  private async ensureEnrollmentOrPublic(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId,
          courseId,
          userId,
        },
      },
    });
    if (enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED") {
      return enrollment;
    }
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
    });
    if (!course) {
      throw new ForbiddenException("Course enrollment is required");
    }
    return { id: null };
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
        entityType: "Activity",
        entityId,
      },
    });
  }

  private async resolvePluginAvailability(
    organizationId: string,
    activity: {
      activityTypeKey: string;
      pluginKey?: string | null;
      pluginVersion?: string | null;
    },
  ) {
    const pluginKey = activity.pluginKey ?? activity.activityTypeKey;
    try {
      const manifest = this.pluginRegistry.getPlugin(pluginKey);
      const enabled = await this.pluginRegistry.isEnabledForOrganization(
        organizationId,
        pluginKey,
      );
      const placeholder = Boolean(manifest.placeholder);
      return {
        key: manifest.key,
        name: manifest.name,
        version: activity.pluginVersion ?? manifest.version,
        enabled: enabled && !placeholder,
        available: !placeholder,
        placeholder,
        reason: placeholder ? "placeholder" : enabled ? "enabled" : "disabled",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          key: pluginKey,
          version: activity.pluginVersion ?? null,
          enabled: false,
          available: false,
          placeholder: false,
          reason: "missing",
        };
      }
      throw error;
    }
  }

  private normalizeContentPayload(
    activityTypeKey: string,
    dto: UpdateActivityContentDto,
  ) {
    const input = dto.content ?? {};
    const html =
      typeof input.html === "string"
        ? input.html
        : typeof input.body === "string" && input.format === "rich_text_html"
          ? input.body
          : null;

    if (activityTypeKey === "core.text" && html) {
      const safeHtml = sanitizeRichTextHtml(html);
      const textContent = htmlToPlainText(safeHtml);
      dto.textContent = dto.textContent ?? textContent;
      return {
        ...input,
        format: "rich_text_html",
        html: safeHtml,
        body: safeHtml,
        textContent,
      } as Prisma.InputJsonObject;
    }

    return input as Prisma.InputJsonObject;
  }
}

function htmlToPlainTextFromPayload(payload: Prisma.InputJsonObject) {
  const textContent = payload.textContent;
  if (typeof textContent === "string") return textContent;
  if (typeof payload.html === "string") return htmlToPlainText(payload.html);
  if (typeof payload.body === "string") return payload.body;
  return undefined;
}
