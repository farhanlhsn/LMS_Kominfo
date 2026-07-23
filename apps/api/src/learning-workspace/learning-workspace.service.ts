import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import { ensureEnrollment } from "../common/enrollment/ensure-enrollment";
import { AiIndexingService } from "../ai/ai-indexing.service";
import { PluginRegistry } from "../plugins/plugin-registry.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  CreateCaptionCueDto,
  CreateCaptionTrackDto,
  CreateLearnerBookmarkDto,
  CreateLearnerNoteDto,
  ListWorkspaceItemsDto,
  ReorderCaptionCuesDto,
  TranscriptQueryDto,
  UpdateCaptionCueDto,
  UpdateCaptionTrackDto,
  UpdateLearnerBookmarkDto,
  UpdateLearnerNoteDto,
  UpdateTranscriptSegmentDto,
  UpdateWorkspacePreferencesDto,
  UpdateWorkspaceStateDto,
  UpsertTranscriptDto,
  WorkspaceStateQueryDto,
} from "./dto/learning-workspace.dto";
import {
  cuesToTranscriptSegments,
  normalizeCaptionCues,
  parseCaptionContent,
} from "./video-caption.util";

const defaultPolicy = {
  allowPopout: true,
  allowDualWindow: true,
  allowAIAssistant: true,
  allowNotes: true,
  allowTranscript: true,
  requireFocusMode: false,
  detectTabSwitch: false,
};

@Injectable()
export class LearningWorkspaceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiIndexingService) private readonly aiIndexing: AiIndexingService,
    @Optional()
    @Inject(PluginRegistry)
    private readonly pluginRegistry?: PluginRegistry,
  ) {}

  getPreferences(organizationId: string, userId: string) {
    return this.prisma.learningWorkspacePreference.upsert({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      update: {},
      create: {
        organizationId,
        userId,
        preferredLayout: "standard",
        rightPanelMode: "notes",
      },
    });
  }

  async updatePreferences(
    organizationId: string,
    userId: string,
    dto: UpdateWorkspacePreferencesDto,
  ) {
    return this.prisma.learningWorkspacePreference.upsert({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      update: {
        preferredLayout: dto.preferredLayout,
        rightPanelMode: dto.rightPanelMode,
        sidebarCollapsed: dto.sidebarCollapsed,
        rightPanelCollapsed: dto.rightPanelCollapsed,
        playbackSpeed: dto.playbackSpeed,
        captionsEnabled: dto.captionsEnabled,
        transcriptEnabled: dto.transcriptEnabled,
        notesPanelOpen: dto.notesPanelOpen,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
      create: {
        organizationId,
        userId,
        preferredLayout: dto.preferredLayout ?? "standard",
        rightPanelMode: dto.rightPanelMode ?? "notes",
        sidebarCollapsed: dto.sidebarCollapsed ?? false,
        rightPanelCollapsed: dto.rightPanelCollapsed ?? false,
        playbackSpeed: dto.playbackSpeed,
        captionsEnabled: dto.captionsEnabled ?? false,
        transcriptEnabled: dto.transcriptEnabled ?? true,
        notesPanelOpen: dto.notesPanelOpen ?? false,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async getState(
    organizationId: string,
    userId: string,
    query: WorkspaceStateQueryDto,
  ) {
    const scope = await this.resolveScope(organizationId, userId, query);
    const state = await this.prisma.lessonWorkspaceState.findFirst({
      where: this.stateWhere(organizationId, userId, scope),
      orderBy: { lastOpenedAt: "desc" },
    });
    return state ?? { ...scope, layout: "standard", rightPanelMode: "notes" };
  }

  async updateState(
    organizationId: string,
    userId: string,
    dto: UpdateWorkspaceStateDto,
  ) {
    const scope = await this.resolveScope(organizationId, userId, dto);
    const existing = await this.prisma.lessonWorkspaceState.findFirst({
      where: this.stateWhere(organizationId, userId, scope),
    });
    const data = {
      layout: dto.layout ?? "standard",
      rightPanelMode: dto.rightPanelMode,
      sidebarCollapsed: dto.sidebarCollapsed ?? false,
      rightPanelCollapsed: dto.rightPanelCollapsed ?? false,
      lastVideoTimeSeconds: dto.lastVideoTimeSeconds,
      lastOpenedAt: new Date(),
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
    };

    if (existing) {
      return this.prisma.lessonWorkspaceState.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.lessonWorkspaceState.create({
      data: {
        organizationId,
        userId,
        courseId: scope.courseId,
        lessonId: scope.lessonId,
        activityId: scope.activityId,
        ...data,
      },
    });
  }

  async listNotes(
    organizationId: string,
    userId: string,
    query: ListWorkspaceItemsDto,
  ) {
    const scope = await this.resolveScope(organizationId, userId, query);
    return this.prisma.learnerNote.findMany({
      where: {
        organizationId,
        userId,
        deletedAt: null,
        courseId: scope.courseId,
        lessonId: scope.lessonId,
        activityId: scope.activityId,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createNote(
    organizationId: string,
    userId: string,
    dto: CreateLearnerNoteDto,
  ) {
    const scope = await this.resolveScope(organizationId, userId, dto);
    const note = await this.prisma.learnerNote.create({
      data: {
        organizationId,
        userId,
        courseId: scope.courseId,
        lessonId: scope.lessonId,
        activityId: scope.activityId,
        videoTimeSeconds: dto.videoTimeSeconds,
        selectedText: dto.selectedText,
        content: dto.content,
        visibility: "PRIVATE",
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    await this.audit(organizationId, userId, "learner_note.created", note.id);
    return note;
  }

  async updateNote(
    organizationId: string,
    userId: string,
    noteId: string,
    dto: UpdateLearnerNoteDto,
  ) {
    await this.getOwnNote(organizationId, userId, noteId);
    return this.prisma.learnerNote.update({
      where: { id: noteId },
      data: {
        content: dto.content,
        selectedText: dto.selectedText,
        videoTimeSeconds: dto.videoTimeSeconds,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async deleteNote(organizationId: string, userId: string, noteId: string) {
    await this.getOwnNote(organizationId, userId, noteId);
    const note = await this.prisma.learnerNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
    await this.audit(organizationId, userId, "learner_note.deleted", noteId);
    return note;
  }

  async listBookmarks(
    organizationId: string,
    userId: string,
    query: ListWorkspaceItemsDto,
  ) {
    const hasScope = query.courseId || query.lessonId || query.activityId;
    const scope = hasScope ? await this.resolveScope(organizationId, userId, query) : null;
    return this.prisma.learnerBookmark.findMany({
      where: {
        organizationId,
        userId,
        deletedAt: null,
        ...(scope ? { courseId: scope.courseId, lessonId: scope.lessonId, activityId: scope.activityId } : {}),
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        lesson: { select: { id: true, title: true } },
        activity: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createBookmark(
    organizationId: string,
    userId: string,
    dto: CreateLearnerBookmarkDto,
  ) {
    const scope = await this.resolveScope(organizationId, userId, dto);
    const bookmark = await this.prisma.learnerBookmark.create({
      data: {
        organizationId,
        userId,
        courseId: scope.courseId,
        lessonId: scope.lessonId,
        activityId: scope.activityId,
        videoTimeSeconds: dto.videoTimeSeconds,
        title: dto.title,
        note: dto.note,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organizationId,
      userId,
      "learner_bookmark.created",
      bookmark.id,
    );
    return bookmark;
  }

  async updateBookmark(
    organizationId: string,
    userId: string,
    bookmarkId: string,
    dto: UpdateLearnerBookmarkDto,
  ) {
    await this.getOwnBookmark(organizationId, userId, bookmarkId);
    return this.prisma.learnerBookmark.update({
      where: { id: bookmarkId },
      data: {
        title: dto.title,
        note: dto.note,
        videoTimeSeconds: dto.videoTimeSeconds,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async deleteBookmark(
    organizationId: string,
    userId: string,
    bookmarkId: string,
  ) {
    await this.getOwnBookmark(organizationId, userId, bookmarkId);
    const bookmark = await this.prisma.learnerBookmark.update({
      where: { id: bookmarkId },
      data: { deletedAt: new Date() },
    });
    await this.audit(
      organizationId,
      userId,
      "learner_bookmark.deleted",
      bookmarkId,
    );
    return bookmark;
  }

  async getTranscript(
    organizationId: string,
    userId: string,
    activityId: string,
    query: TranscriptQueryDto = {},
  ) {
    const activity = await this.getActivity(organizationId, activityId);
    await this.ensureEnrollment(organizationId, userId, activity.courseId);
    return this.prisma.transcriptSegment.findMany({
      where: {
        organizationId,
        activityId,
        language: query.language,
        text: query.search
          ? {
              contains: query.search,
              mode: "insensitive",
            }
          : undefined,
      },
      orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
    });
  }

  async getCaptionTracks(
    organizationId: string,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.getActivity(organizationId, activityId);
    await this.ensureEnrollment(organizationId, userId, activity.courseId);
    this.ensureVideoActivity(activity);
    return this.prisma.videoCaptionTrack.findMany({
      where: { organizationId, activityId },
      orderBy: [{ isDefault: "desc" }, { language: "asc" }, { label: "asc" }],
    });
  }

  async getWorkspaceContext(
    organizationId: string,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
      include: {
        course: { select: { id: true, title: true, subtitle: true } },
        lesson: { select: { id: true, title: true, summary: true } },
        progress: { where: { organizationId, userId }, take: 1 },
        transcriptSegments: { select: { id: true }, take: 1 },
        videoCaptionTracks: {
          select: { language: true, isDefault: true },
          take: 20,
        },
      },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    await this.ensureEnrollment(organizationId, userId, activity.courseId);
    const [notesCount, bookmarksCount, aiTutorEnabled] = await Promise.all([
      this.prisma.learnerNote.count({
        where: { organizationId, userId, activityId, deletedAt: null },
      }),
      this.prisma.learnerBookmark.count({
        where: { organizationId, userId, activityId, deletedAt: null },
      }),
      this.pluginRegistry
        ? this.pluginRegistry.isEnabledForOrganization(
            organizationId,
            "plugin.ai_tutor",
          )
        : Promise.resolve(true),
    ]);
    const assessmentDisplayPolicy = this.assessmentPolicy(
      activity.assessmentDisplayPolicy,
    );
    const captionLanguages = Array.from(
      new Set(
        activity.videoCaptionTracks
          .map((track) => track.language)
          .filter((language): language is string => Boolean(language)),
      ),
    );
    const defaultCaptionLanguage =
      activity.videoCaptionTracks.find((track) => track.isDefault)?.language ??
      captionLanguages[0] ??
      null;
    const availablePanels = [
      assessmentDisplayPolicy.allowNotes ? "notes" : null,
      assessmentDisplayPolicy.allowTranscript ? "transcript" : null,
      "resources",
      assessmentDisplayPolicy.allowAIAssistant && aiTutorEnabled ? "ai" : null,
      "bookmarks",
      "discussion",
      "upcoming",
      "activity_info",
    ].filter(Boolean);
    return {
      organizationId,
      course: activity.course,
      lesson: activity.lesson,
      activity: {
        id: activity.id,
        title: activity.title,
        activityTypeKey: activity.activityTypeKey,
        pluginKey: activity.pluginKey,
      },
      progress: activity.progress[0] ?? null,
      availablePanels,
      assessmentDisplayPolicy,
      transcriptAvailable: activity.transcriptSegments.length > 0,
      captionLanguages,
      defaultCaptionLanguage,
      notesCount,
      bookmarksCount,
    };
  }

  async getActivityFlashcards(
    organizationId: string,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.getActivity(organizationId, activityId);
    await this.ensureEnrollment(organizationId, userId, activity.courseId);
    const items = await this.prisma.aiGeneratedItem.findMany({
      where: { organizationId, activityId, type: "FLASHCARD", status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
    return items.map((item) => {
      const output = item.output as Record<string, unknown>;
      const cards = Array.isArray(output.cards) ? output.cards : [{ front: output.front ?? "?", back: output.back ?? "" }];
      return { id: item.id, title: item.title, cards };
    });
  }

  async instructorTranscript(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    await this.ensureCanManageActivity(organization, userId, activityId);
    return this.prisma.transcriptSegment.findMany({
      where: { organizationId: organization.id, activityId },
      orderBy: [{ orderIndex: "asc" }, { startSeconds: "asc" }],
    });
  }

  async instructorCaptionTracks(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      activityId,
    );
    this.ensureVideoActivity(activity);
    return this.prisma.videoCaptionTrack.findMany({
      where: { organizationId: organization.id, activityId },
      orderBy: [{ isDefault: "desc" }, { language: "asc" }, { label: "asc" }],
    });
  }

  async createCaptionTrack(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: CreateCaptionTrackDto,
  ) {
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      activityId,
    );
    this.ensureVideoActivity(activity);
    const payload = this.captionTrackPayload(dto);
    const result = await this.prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.videoCaptionTrack.updateMany({
          where: { organizationId: organization.id, activityId },
          data: { isDefault: false },
        });
      }
      const created = await tx.videoCaptionTrack.create({
        data: {
          organizationId: organization.id,
          courseId: activity.courseId,
          lessonId: activity.lessonId,
          activityId,
          label: payload.label,
          language: payload.language,
          kind: payload.kind,
          source: payload.source,
          isDefault: payload.isDefault,
          cues: payload.cues as Prisma.InputJsonArray,
          rawContent: payload.rawContent,
          metadata: payload.metadata as Prisma.InputJsonObject,
        },
      });
      if (dto.syncTranscript) {
        await this.syncTranscriptFromCaptionTrackTx(
          tx,
          organization.id,
          activity,
          payload.language,
          payload.cues,
        );
      }
      return created;
    });
    await this.audit(organization.id, userId, "caption_track.created", result.id);
    if (dto.syncTranscript) {
      await this.aiIndexing
        .indexActivity(organization.id, activityId)
        .catch(() => undefined);
    }
    return result;
  }

  async updateCaptionTrack(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
    dto: UpdateCaptionTrackDto,
  ) {
    const track = await this.getCaptionTrack(organization.id, trackId);
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      track.activityId,
    );
    this.ensureVideoActivity(activity);
    const payload = this.captionTrackPayload(dto, track);
    const result = await this.prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.videoCaptionTrack.updateMany({
          where: { organizationId: organization.id, activityId: track.activityId },
          data: { isDefault: false },
        });
      }
      const updated = await tx.videoCaptionTrack.update({
        where: { id: trackId },
        data: {
          label: payload.label,
          language: payload.language,
          kind: payload.kind,
          source: payload.source,
          isDefault: payload.isDefault,
          cues: payload.cues as Prisma.InputJsonArray,
          rawContent: payload.rawContent,
          metadata: payload.metadata as Prisma.InputJsonObject,
        },
      });
      if (dto.syncTranscript) {
        await this.syncTranscriptFromCaptionTrackTx(
          tx,
          organization.id,
          activity,
          payload.language,
          payload.cues,
        );
      }
      return updated;
    });
    await this.audit(organization.id, userId, "caption_track.updated", trackId);
    if (dto.syncTranscript) {
      await this.aiIndexing
        .indexActivity(organization.id, track.activityId)
        .catch(() => undefined);
    }
    return result;
  }

  async deleteCaptionTrack(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
  ) {
    const track = await this.getCaptionTrack(organization.id, trackId);
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    const deleted = await this.prisma.videoCaptionTrack.delete({
      where: { id: trackId },
    });
    await this.audit(organization.id, userId, "caption_track.deleted", trackId);
    return deleted;
  }

  async listCaptionCues(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
  ) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId: organization.id },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    return Array.isArray(track.cues) ? (track.cues as unknown[]) : [];
  }

  async createCaptionCue(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
    dto: CreateCaptionCueDto,
  ) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId: organization.id },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    const cues = Array.isArray(track.cues)
      ? (track.cues as Array<Record<string, unknown>>)
      : [];
    cues.push({
      startSeconds: dto.startSeconds,
      endSeconds: dto.endSeconds,
      text: dto.text,
    });
    const normalized = normalizeCaptionCues(
      cues.map((cue) => ({
        startSeconds: Number(cue.startSeconds),
        endSeconds: Number(cue.endSeconds),
        text: String(cue.text ?? ""),
      })),
    );
    const updated = await this.prisma.videoCaptionTrack.update({
      where: { id: track.id },
      data: { cues: normalized as unknown as Prisma.InputJsonValue },
    });
    await this.audit(organization.id, userId, "caption_cue.created", trackId);
    return updated;
  }

  async updateCaptionCue(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
    cueIndex: number,
    dto: UpdateCaptionCueDto,
  ) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId: organization.id },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    const cues = Array.isArray(track.cues)
      ? (track.cues as Array<Record<string, unknown>>)
      : [];
    if (cueIndex < 0 || cueIndex >= cues.length) {
      throw new NotFoundException("Caption cue not found");
    }
    const existing = cues[cueIndex]!;
    cues[cueIndex] = {
      startSeconds: dto.startSeconds ?? Number(existing.startSeconds ?? 0),
      endSeconds: dto.endSeconds ?? Number(existing.endSeconds ?? 0),
      text: dto.text ?? String(existing.text ?? ""),
    };
    const normalized = normalizeCaptionCues(
      cues.map((cue) => ({
        startSeconds: Number(cue.startSeconds),
        endSeconds: Number(cue.endSeconds),
        text: String(cue.text ?? ""),
      })),
    );
    const updated = await this.prisma.videoCaptionTrack.update({
      where: { id: track.id },
      data: { cues: normalized as unknown as Prisma.InputJsonValue },
    });
    await this.audit(organization.id, userId, "caption_cue.updated", trackId);
    return updated;
  }

  async deleteCaptionCue(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
    cueIndex: number,
  ) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId: organization.id },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    const cues = Array.isArray(track.cues)
      ? (track.cues as Array<Record<string, unknown>>)
      : [];
    if (cueIndex < 0 || cueIndex >= cues.length) {
      throw new NotFoundException("Caption cue not found");
    }
    cues.splice(cueIndex, 1);
    const normalized = normalizeCaptionCues(
      cues.map((cue) => ({
        startSeconds: Number(cue.startSeconds),
        endSeconds: Number(cue.endSeconds),
        text: String(cue.text ?? ""),
      })),
    );
    const updated = await this.prisma.videoCaptionTrack.update({
      where: { id: track.id },
      data: { cues: normalized as unknown as Prisma.InputJsonValue },
    });
    await this.audit(organization.id, userId, "caption_cue.deleted", trackId);
    return updated;
  }

  async reorderCaptionCues(
    organization: OrganizationContext,
    userId: string,
    trackId: string,
    dto: ReorderCaptionCuesDto,
  ) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId: organization.id },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    await this.ensureCanManageActivity(organization, userId, track.activityId);
    const cues = Array.isArray(track.cues)
      ? (track.cues as Array<Record<string, unknown>>)
      : [];
    if (
      dto.orderedIndices.length !== cues.length ||
      new Set(dto.orderedIndices).size !== cues.length
    ) {
      throw new BadRequestException(
        "orderedIndices must contain every existing cue index exactly once",
      );
    }
    const reordered = dto.orderedIndices
      .map((index) => cues[index])
      .filter((cue): cue is Record<string, unknown> => Boolean(cue));
    const normalized = normalizeCaptionCues(
      reordered.map((cue) => ({
        startSeconds: Number(cue.startSeconds),
        endSeconds: Number(cue.endSeconds),
        text: String(cue.text ?? ""),
      })),
    );
    const updated = await this.prisma.videoCaptionTrack.update({
      where: { id: track.id },
      data: { cues: normalized as unknown as Prisma.InputJsonValue },
    });
    await this.audit(organization.id, userId, "caption_cue.reordered", trackId);
    return updated;
  }

  async upsertInstructorTranscript(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: UpsertTranscriptDto,
  ) {
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      activityId,
    );
    await this.prisma.$transaction([
      this.prisma.transcriptSegment.deleteMany({
        where: { organizationId: organization.id, activityId },
      }),
      ...dto.segments.map((segment, index) =>
        this.prisma.transcriptSegment.create({
          data: {
            organizationId: organization.id,
            courseId: activity.courseId,
            lessonId: activity.lessonId,
            activityId,
            startSeconds: segment.startSeconds,
            endSeconds: segment.endSeconds,
            text: segment.text,
            speaker: segment.speaker,
            language: segment.language,
            orderIndex: segment.orderIndex ?? index,
            metadata: (segment.metadata ?? {}) as Prisma.InputJsonObject,
          },
        }),
      ),
    ]);
    await this.audit(
      organization.id,
      userId,
      "transcript.upserted",
      activityId,
    );
    await this.aiIndexing
      .indexActivity(organization.id, activityId)
      .catch(() => undefined);
    return this.instructorTranscript(organization, userId, activityId);
  }

  async updateTranscriptSegment(
    organization: OrganizationContext,
    userId: string,
    segmentId: string,
    dto: UpdateTranscriptSegmentDto,
  ) {
    const segment = await this.getTranscriptSegment(organization.id, segmentId);
    await this.ensureCanManageActivity(
      organization,
      userId,
      segment.activityId,
    );
    const updated = await this.prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: {
        startSeconds: dto.startSeconds,
        endSeconds: dto.endSeconds,
        text: dto.text,
        speaker: dto.speaker,
        language: dto.language,
        orderIndex: dto.orderIndex,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
    await this.aiIndexing
      .indexActivity(organization.id, segment.activityId)
      .catch(() => undefined);
    return updated;
  }

  async deleteTranscriptSegment(
    organization: OrganizationContext,
    userId: string,
    segmentId: string,
  ) {
    const segment = await this.getTranscriptSegment(organization.id, segmentId);
    await this.ensureCanManageActivity(
      organization,
      userId,
      segment.activityId,
    );
    const deleted = await this.prisma.transcriptSegment.delete({
      where: { id: segmentId },
    });
    await this.aiIndexing
      .indexActivity(organization.id, segment.activityId)
      .catch(() => undefined);
    return deleted;
  }

  private async resolveScope(
    organizationId: string,
    userId: string,
    query: WorkspaceStateQueryDto,
  ) {
    if (query.activityId) {
      const activity = await this.getActivity(organizationId, query.activityId);
      await this.ensureEnrollment(organizationId, userId, activity.courseId);
      return {
        courseId: activity.courseId,
        lessonId: query.lessonId ?? activity.lessonId,
        activityId: activity.id,
      };
    }
    if (query.lessonId) {
      const lesson = await this.prisma.lesson.findFirst({
        where: { id: query.lessonId, organizationId },
      });
      if (!lesson) throw new NotFoundException("Lesson not found");
      await this.ensureEnrollment(organizationId, userId, lesson.courseId);
      return {
        courseId: query.courseId ?? lesson.courseId,
        lessonId: lesson.id,
        activityId: undefined,
      };
    }
    if (!query.courseId) {
      throw new NotFoundException("Workspace scope is required");
    }
    await this.ensureEnrollment(organizationId, userId, query.courseId);
    return {
      courseId: query.courseId,
      lessonId: undefined,
      activityId: undefined,
    };
  }

  private stateWhere(
    organizationId: string,
    userId: string,
    scope: { courseId: string; lessonId?: string; activityId?: string },
  ): Prisma.LessonWorkspaceStateWhereInput {
    return {
      organizationId,
      userId,
      courseId: scope.courseId,
      lessonId: scope.lessonId ?? null,
      activityId: scope.activityId ?? null,
    };
  }

  private async getActivity(organizationId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    return activity;
  }

  private ensureEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    return ensureEnrollment(this.prisma, organizationId, userId, courseId);
  }

  private async ensureCanManageActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.getActivity(organization.id, activityId);
    if (organization.isPlatformAdmin) return activity;
    const canUpdate = organization.permissionKeys.includes("courses:update");
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: {
        organizationId: organization.id,
        courseId: activity.courseId,
        userId,
      },
    });
    if (!canUpdate && !instructor) {
      throw new ForbiddenException("Insufficient course permissions");
    }
    return activity;
  }

  private async getOwnNote(
    organizationId: string,
    userId: string,
    noteId: string,
  ) {
    const note = await this.prisma.learnerNote.findFirst({
      where: { id: noteId, organizationId, userId, deletedAt: null },
    });
    if (!note) throw new NotFoundException("Note not found");
    return note;
  }

  private async getOwnBookmark(
    organizationId: string,
    userId: string,
    bookmarkId: string,
  ) {
    const bookmark = await this.prisma.learnerBookmark.findFirst({
      where: { id: bookmarkId, organizationId, userId, deletedAt: null },
    });
    if (!bookmark) throw new NotFoundException("Bookmark not found");
    return bookmark;
  }

  private async getTranscriptSegment(
    organizationId: string,
    segmentId: string,
  ) {
    const segment = await this.prisma.transcriptSegment.findFirst({
      where: { id: segmentId, organizationId },
    });
    if (!segment) throw new NotFoundException("Transcript segment not found");
    return segment;
  }

  private async getCaptionTrack(organizationId: string, trackId: string) {
    const track = await this.prisma.videoCaptionTrack.findFirst({
      where: { id: trackId, organizationId },
    });
    if (!track) throw new NotFoundException("Caption track not found");
    return track;
  }

  private ensureVideoActivity(activity: {
    activityTypeKey: string;
    id: string;
  }) {
    if (activity.activityTypeKey !== "core.video") {
      throw new BadRequestException(
        "Caption tracks are only available for video activities",
      );
    }
  }

  private captionTrackPayload(
    dto: CreateCaptionTrackDto | UpdateCaptionTrackDto,
    existing?: {
      label: string;
      language: string;
      kind: "CAPTION" | "SUBTITLE";
      source: "MANUAL" | "UPLOAD" | "TRANSCRIPT";
      isDefault: boolean;
      cues: unknown;
      rawContent: string | null;
      metadata: unknown;
    },
  ) {
    const rawContent =
      dto.rawContent !== undefined ? dto.rawContent : existing?.rawContent ?? null;
    const cues =
      dto.rawContent && dto.rawContent.trim().length > 0
        ? parseCaptionContent(dto.rawContent)
        : dto.cues?.length
          ? normalizeCaptionCues(dto.cues)
          : Array.isArray(existing?.cues)
            ? normalizeCaptionCues(existing.cues as never)
            : [];
    if (!cues.length) {
      throw new BadRequestException(
        "Caption content must include at least one valid cue",
      );
    }
    return {
      label: dto.label ?? existing?.label ?? "Default captions",
      language: dto.language ?? existing?.language ?? "en",
      kind: dto.kind ?? existing?.kind ?? "CAPTION",
      source: dto.source ?? existing?.source ?? "MANUAL",
      isDefault: dto.isDefault ?? existing?.isDefault ?? false,
      cues,
      rawContent,
      metadata:
        (dto.metadata ?? existing?.metadata ?? {}) as Record<string, unknown>,
    };
  }

  private async syncTranscriptFromCaptionTrackTx(
    tx: Prisma.TransactionClient,
    organizationId: string,
    activity: { id: string; courseId: string; lessonId: string | null },
    language: string,
    cues: Array<{ startSeconds: number; endSeconds: number; text: string }>,
  ) {
    const segments = cuesToTranscriptSegments(cues, language);
    await tx.transcriptSegment.deleteMany({
      where: { organizationId, activityId: activity.id, language },
    });
    for (const segment of segments) {
      await tx.transcriptSegment.create({
        data: {
          organizationId,
          courseId: activity.courseId,
          lessonId: activity.lessonId,
          activityId: activity.id,
          startSeconds: segment.startSeconds,
          endSeconds: segment.endSeconds,
          text: segment.text,
          language: segment.language,
          orderIndex: segment.orderIndex,
          metadata: {},
        },
      });
    }
  }

  private assessmentPolicy(value: unknown) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return defaultPolicy;
    }
    return { ...defaultPolicy, ...(value as Record<string, boolean>) };
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
        entityType: "LearningWorkspace",
        entityId,
        metadata: {},
      },
    });
  }
}
