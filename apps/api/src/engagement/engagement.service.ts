import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CalendarQueryDto,
  CreateCalendarEventDto,
  CreateLiveClassDto,
  CreateReplyDto,
  CreateThreadDto,
  DiscussionQueryDto,
  LiveClassQueryDto,
  ModerateReplyDto,
  ModerateThreadDto,
  ReportDiscussionDto,
  ResolveDiscussionReportDto,
  UpdateDiscussionDto,
  UpdateLiveClassDto,
  UpdateCalendarEventDto,
} from "./dto/engagement.dto";
import { NotificationService } from "./notification.service";
import { LiveClassProviderService } from "./live-class-provider.service";

const ADMIN_ROLES = new Set(["org_admin", "course_manager"]);

@Injectable()
export class EngagementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
    @Inject(LiveClassProviderService) private readonly liveClassProviders: LiveClassProviderService,
  ) {}

  async listThreads(org: OrganizationContext, userId: string, query: DiscussionQueryDto) {
    await this.ensureCourseAccess(org, userId, query.courseId);
    await this.validateContext(org.id, query.courseId, query.lessonId, query.activityId);
    const moderator = await this.canManageCourse(org, userId, query.courseId);
    return this.prisma.discussionThread.findMany({
      where: {
        organizationId: org.id,
        courseId: query.courseId,
        lessonId: query.lessonId,
        activityId: query.activityId,
        deletedAt: null,
        status: moderator ? undefined : "VISIBLE",
      },
      include: { author: { select: { id: true, name: true } }, _count: { select: { replies: true } } },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
  }

  async createThread(org: OrganizationContext, userId: string, dto: CreateThreadDto) {
    await this.ensureCourseAccess(org, userId, dto.courseId);
    await this.validateContext(org.id, dto.courseId, dto.lessonId, dto.activityId);
    const thread = await this.prisma.discussionThread.create({
      data: { organizationId: org.id, authorId: userId, courseId: dto.courseId, lessonId: dto.lessonId, activityId: dto.activityId, title: dto.title.trim(), body: dto.body.trim() },
      include: { author: { select: { id: true, name: true } }, _count: { select: { replies: true } } },
    });
    const mentionIds = (dto.mentionedUserIds ?? []).filter((id) => id !== userId);
    if (mentionIds.length) {
      await Promise.all(mentionIds.map((recipientId) => this.notifications.createForUser({
        organizationId: org.id, userId: recipientId, type: "discussion_mention", title: `${thread.author.name ?? "Someone"} mentioned you`,
        body: `You were mentioned in "${thread.title}".`, actionUrl: `/learn/courses/${dto.courseId}/discussions/${thread.id}`,
        entityType: "discussion_thread", entityId: thread.id, metadata: { courseId: dto.courseId, threadId: thread.id },
      })));
    }
    return thread;
  }

  async getThread(org: OrganizationContext, userId: string, id: string) {
    const thread = await this.thread(org.id, id);
    await this.ensureCourseAccess(org, userId, thread.courseId!);
    const moderator = await this.canManageCourse(org, userId, thread.courseId!);
    if (thread.status !== "VISIBLE" && !moderator && thread.authorId !== userId) throw new NotFoundException("Discussion thread not found");
    return this.prisma.discussionThread.findFirst({
      where: { id, organizationId: org.id, deletedAt: null },
      include: {
        author: { select: { id: true, name: true } },
        replies: {
          where: { deletedAt: null, status: moderator ? undefined : "VISIBLE" },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async updateThread(org: OrganizationContext, userId: string, id: string, dto: UpdateDiscussionDto) {
    const thread = await this.thread(org.id, id);
    if (thread.authorId !== userId && !(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("You cannot edit this thread");
    return this.prisma.discussionThread.update({ where: { id }, data: { title: dto.title?.trim(), body: dto.body?.trim() } });
  }

  async deleteThread(org: OrganizationContext, userId: string, id: string) {
    const thread = await this.thread(org.id, id);
    if (thread.authorId !== userId && !(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("You cannot delete this thread");
    await this.prisma.discussionThread.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    await this.audit(org.id, userId, "discussion.thread.deleted", id);
    return { deleted: true };
  }

  async createReply(org: OrganizationContext, userId: string, threadId: string, dto: CreateReplyDto) {
    const thread = await this.thread(org.id, threadId);
    await this.ensureCourseAccess(org, userId, thread.courseId!);
    if (thread.locked) throw new ForbiddenException("This discussion is locked");
    if (dto.parentReplyId) {
      const parent = await this.prisma.discussionReply.findFirst({ where: { id: dto.parentReplyId, organizationId: org.id, threadId, deletedAt: null } });
      if (!parent) throw new BadRequestException("Parent reply does not belong to this thread");
    }
    const reply = await this.prisma.discussionReply.create({
      data: { organizationId: org.id, threadId, parentReplyId: dto.parentReplyId, authorId: userId, body: dto.body.trim() },
      include: { author: { select: { id: true, name: true } } },
    });
    const participantIds = new Set<string>([thread.authorId]);
    const participants = await this.prisma.discussionReply.findMany({ where: { organizationId: org.id, threadId, deletedAt: null }, select: { authorId: true } });
    participants.forEach(({ authorId }) => participantIds.add(authorId));
    participantIds.delete(userId);
    // mention notifications (before removing poster from participant set so mentions always fire)
    const mentionIds = (dto.mentionedUserIds ?? []).filter((id) => id !== userId);
    await Promise.all([
      ...[...participantIds].map((recipientId) => this.notifications.createForUser({
        organizationId: org.id, userId: recipientId, type: "discussion_reply", title: `New reply: ${thread.title}`,
        body: "A discussion you participate in has a new reply.", actionUrl: `/learn/courses/${thread.courseId}/discussions/${threadId}`,
        entityType: "discussion_reply", entityId: reply.id, metadata: { courseId: thread.courseId, threadId },
      })),
      ...mentionIds.map((recipientId) => this.notifications.createForUser({
        organizationId: org.id, userId: recipientId, type: "discussion_mention", title: `${reply.author.name ?? "Someone"} mentioned you`,
        body: `You were mentioned in a reply on "${thread.title}".`, actionUrl: `/learn/courses/${thread.courseId}/discussions/${threadId}`,
        entityType: "discussion_reply", entityId: reply.id, metadata: { courseId: thread.courseId, threadId },
      })),
    ]);
    return reply;
  }

  async updateReply(org: OrganizationContext, userId: string, id: string, dto: UpdateDiscussionDto) {
    const reply = await this.reply(org.id, id);
    const thread = await this.thread(org.id, reply.threadId);
    if (reply.authorId !== userId && !(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("You cannot edit this reply");
    return this.prisma.discussionReply.update({ where: { id }, data: { body: dto.body?.trim() } });
  }

  async deleteReply(org: OrganizationContext, userId: string, id: string) {
    const reply = await this.reply(org.id, id);
    const thread = await this.thread(org.id, reply.threadId);
    if (reply.authorId !== userId && !(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("You cannot delete this reply");
    await this.prisma.discussionReply.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    await this.audit(org.id, userId, "discussion.reply.deleted", id);
    return { deleted: true };
  }

  async moderateThread(org: OrganizationContext, userId: string, id: string, dto: ModerateThreadDto) {
    const thread = await this.thread(org.id, id);
    if (!(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("Discussion moderation is not allowed");
    const result = await this.prisma.discussionThread.update({ where: { id }, data: dto });
    if (dto.pinned === true && !thread.pinned) {
      await this.notifications.createForCourseParticipants({
        organizationId: org.id,
        type: "course_announcement",
        title: thread.title,
        body: "A course discussion was pinned as an announcement.",
        actionUrl: `/learn/courses/${thread.courseId}/discussions/${thread.id}`,
        entityType: "discussion_thread",
        entityId: thread.id,
        metadata: { courseId: thread.courseId, sourceType: "discussion" },
      });
    }
    await this.audit(org.id, userId, "discussion.thread.moderated", id);
    return result;
  }

  async moderateReply(org: OrganizationContext, userId: string, id: string, dto: ModerateReplyDto) {
    const reply = await this.reply(org.id, id);
    const thread = await this.thread(org.id, reply.threadId);
    if (!(await this.canManageCourse(org, userId, thread.courseId!))) throw new ForbiddenException("Discussion moderation is not allowed");
    const result = await this.prisma.discussionReply.update({ where: { id }, data: dto });
    await this.audit(org.id, userId, "discussion.reply.moderated", id);
    return result;
  }

  async reportThread(org: OrganizationContext, userId: string, id: string, dto: ReportDiscussionDto) {
    const thread = await this.thread(org.id, id);
    await this.ensureCourseAccess(org, userId, thread.courseId!);
    if (thread.authorId === userId) throw new BadRequestException("You cannot report your own thread");
    return this.prisma.discussionReport.upsert({
      where: { organizationId_threadId_reporterId: { organizationId: org.id, threadId: id, reporterId: userId } },
      create: { organizationId: org.id, threadId: id, reporterId: userId, reason: dto.reason, details: dto.details },
      update: { reason: dto.reason, details: dto.details, status: "OPEN", resolvedAt: null, resolvedById: null },
    });
  }

  async reportReply(org: OrganizationContext, userId: string, id: string, dto: ReportDiscussionDto) {
    const reply = await this.reply(org.id, id); const thread = await this.thread(org.id, reply.threadId);
    await this.ensureCourseAccess(org, userId, thread.courseId!);
    if (reply.authorId === userId) throw new BadRequestException("You cannot report your own reply");
    return this.prisma.discussionReport.upsert({
      where: { organizationId_replyId_reporterId: { organizationId: org.id, replyId: id, reporterId: userId } },
      create: { organizationId: org.id, replyId: id, reporterId: userId, reason: dto.reason, details: dto.details },
      update: { reason: dto.reason, details: dto.details, status: "OPEN", resolvedAt: null, resolvedById: null },
    });
  }

  async listDiscussionReports(org: OrganizationContext, userId: string, courseId?: string) {
    const courseIds = await this.managedCourseIds(org, userId, courseId);
    return this.prisma.discussionReport.findMany({
      where: { organizationId: org.id, OR: [{ thread: { courseId: { in: courseIds } } }, { reply: { thread: { courseId: { in: courseIds } } } }] },
      include: { reporter: { select: { id: true, name: true } }, thread: { select: { id: true, title: true, courseId: true, status: true } }, reply: { select: { id: true, body: true, status: true, thread: { select: { id: true, title: true, courseId: true } } } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async resolveDiscussionReport(org: OrganizationContext, userId: string, id: string, dto: ResolveDiscussionReportDto) {
    const report = await this.prisma.discussionReport.findFirst({ where: { id, organizationId: org.id }, include: { thread: true, reply: { include: { thread: true } } } });
    if (!report) throw new NotFoundException("Discussion report not found");
    const courseId = report.thread?.courseId ?? report.reply?.thread.courseId;
    if (!courseId || !(await this.canManageCourse(org, userId, courseId))) throw new ForbiddenException("Discussion moderation is not allowed");
    if (dto.hideContent) {
      if (report.threadId) await this.prisma.discussionThread.update({ where: { id: report.threadId }, data: { status: "HIDDEN" } });
      if (report.replyId) await this.prisma.discussionReply.update({ where: { id: report.replyId }, data: { status: "HIDDEN" } });
    }
    const result = await this.prisma.discussionReport.update({ where: { id }, data: { status: dto.status, resolvedAt: new Date(), resolvedById: userId } });
    await this.audit(org.id, userId, "discussion.report.resolved", id); return result;
  }

  async listLiveClasses(org: OrganizationContext, userId: string, query: LiveClassQueryDto) {
    await this.syncLiveClassStatuses(org.id);
    const courseIds = await this.accessibleCourseIds(org, userId, query.courseId);
    const sessions = await this.prisma.liveClass.findMany({
      where: { organizationId: org.id, courseId: { in: courseIds }, startAt: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } },
      include: { course: { select: { id: true, title: true } } }, orderBy: { startAt: "asc" },
      take: 100,
    });
    await Promise.all(sessions.filter((session) => session.status === "SCHEDULED" && session.startAt.getTime() > Date.now() && session.startAt.getTime() - Date.now() <= 30 * 60_000).map((session) => this.notifications.createForUser({ organizationId: org.id, userId, type: "live_class_reminder", title: `${session.title} starts soon`, body: "Your live class starts within 30 minutes.", actionUrl: `/learn/courses/${session.courseId}/live-classes`, entityType: "live_class", entityId: session.id, metadata: { courseId: session.courseId, startAt: session.startAt.toISOString() } })));
    return sessions;
  }

  async getLiveClass(org: OrganizationContext, userId: string, id: string, includeMeetingUrl = true) {
    const session = await this.prisma.liveClass.findFirst({ where: { id, organizationId: org.id }, include: { course: { select: { id: true, title: true } } } });
    if (!session) throw new NotFoundException("Live class not found");
    await this.ensureCourseAccess(org, userId, session.courseId);
    return includeMeetingUrl ? session : { ...session, meetingUrl: undefined };
  }

  async createLiveClass(org: OrganizationContext, userId: string, dto: CreateLiveClassDto) {
    await this.ensureCourseManager(org, userId, dto.courseId);
    this.assertSchedule(dto.startAt, dto.endAt);
    const prepared = this.liveClassProviders.prepare(dto.provider, dto.meetingUrl);
    const session = await this.prisma.liveClass.create({ data: { ...dto, meetingUrl: prepared.meetingUrl, organizationId: org.id, createdById: userId, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt), metadata: { ...(dto.metadata ?? {}), integrationMode: prepared.integrationMode } as Prisma.InputJsonObject } });
    await this.notifications.createForCourseParticipants({ organizationId: org.id, type: "live_class_scheduled", title: dto.title, body: `A live class is scheduled for ${new Date(dto.startAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC.`, actionUrl: `/learn/courses/${dto.courseId}/live-classes`, entityType: "live_class", entityId: session.id, metadata: { courseId: dto.courseId } });
    await this.audit(org.id, userId, "live_class.created", session.id);
    return session;
  }

  async updateLiveClass(org: OrganizationContext, userId: string, id: string, dto: UpdateLiveClassDto) {
    const current = await this.getLiveClass(org, userId, id);
    await this.ensureCourseManager(org, userId, current.courseId);
    const start = dto.startAt ?? current.startAt.toISOString();
    const end = dto.endAt ?? current.endAt.toISOString();
    this.assertSchedule(start, end);
    const provider = dto.provider ?? current.provider;
    const prepared = this.liveClassProviders.prepare(provider, dto.meetingUrl ?? current.meetingUrl);
    const data = { ...dto, meetingUrl: prepared.meetingUrl, metadata: dto.metadata ? { ...dto.metadata, integrationMode: prepared.integrationMode } as Prisma.InputJsonObject : undefined, startAt: dto.startAt ? new Date(dto.startAt) : undefined, endAt: dto.endAt ? new Date(dto.endAt) : undefined };
    const result = await this.prisma.liveClass.update({ where: { id }, data });
    await this.audit(org.id, userId, "live_class.updated", id);
    return result;
  }

  async cancelLiveClass(org: OrganizationContext, userId: string, id: string) {
    const session = await this.getLiveClass(org, userId, id);
    await this.ensureCourseManager(org, userId, session.courseId);
    const result = await this.prisma.liveClass.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.notifications.createForCourseParticipants({ organizationId: org.id, type: "live_class_cancelled", title: `${session.title} cancelled`, body: "This live class has been cancelled.", actionUrl: `/learn/courses/${session.courseId}/live-classes`, entityType: "live_class", entityId: id, metadata: { courseId: session.courseId } });
    await this.audit(org.id, userId, "live_class.cancelled", id);
    return result;
  }

  async joinLiveClass(org: OrganizationContext, userId: string, id: string) {
    const session = await this.getLiveClass(org, userId, id);
    if (session.status === "CANCELLED" || session.status === "ENDED") throw new ForbiddenException("This live class is not joinable");
    if (!session.meetingUrl) throw new NotFoundException("The meeting link is not available yet");
    return { meetingUrl: session.meetingUrl, provider: session.provider, status: session.status };
  }

  async calendar(org: OrganizationContext, userId: string, query: CalendarQueryDto) {
    const from = new Date(query.from); const to = new Date(query.to);
    if (from >= to) throw new BadRequestException("The calendar range is invalid");
    if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new BadRequestException("Calendar range cannot exceed 366 days");
    const courseIds = await this.accessibleCourseIds(org, userId, query.courseId);
    const [live, assignments, quizzes, announcements, customEvents] = await Promise.all([
      this.prisma.liveClass.findMany({ where: { organizationId: org.id, courseId: { in: courseIds }, startAt: { gte: from, lte: to } }, include: { course: { select: { title: true } } } }),
      this.prisma.assignment.findMany({ where: { organizationId: org.id, courseId: { in: courseIds }, status: "PUBLISHED", deletedAt: null, dueAt: { gte: from, lte: to } }, include: { course: { select: { title: true } } } }),
      this.prisma.quiz.findMany({ where: { organizationId: org.id, courseId: { in: courseIds }, status: "PUBLISHED", deletedAt: null, OR: [{ availableFrom: { gte: from, lte: to } }, { dueAt: { gte: from, lte: to } }] }, include: { course: { select: { title: true } }, activity: { select: { lessonId: true } } } }),
      this.prisma.discussionThread.findMany({ where: { organizationId: org.id, courseId: { in: courseIds }, pinned: true, status: "VISIBLE", deletedAt: null, createdAt: { gte: from, lte: to } }, include: { course: { select: { title: true } } } }),
      this.prisma.calendarEvent.findMany({ where: { organizationId: org.id, startsAt: { gte: from, lte: to }, OR: [{ courseId: { in: courseIds }, visibility: "course" }, { createdById: userId, visibility: "personal", courseId: query.courseId ?? undefined }] }, include: { course: { select: { title: true } } } }),
    ]);
    const events = [
      ...live.map((item) => ({ organizationId: org.id, courseId: item.courseId, title: item.title, description: item.description, type: "live_class", startsAt: item.startAt, endsAt: item.endAt, timezone: item.timezone, sourceType: "live_class", sourceId: item.id, visibility: "course", actionUrl: `/learn/courses/${item.courseId}/live-classes`, metadata: { status: item.status, courseTitle: item.course.title } })),
      ...assignments.map((item) => ({ organizationId: org.id, courseId: item.courseId, title: `${item.title} due`, description: item.description, type: "assignment_due", startsAt: item.dueAt!, endsAt: null, timezone: null, sourceType: "assignment", sourceId: item.id, visibility: "course", actionUrl: `/learn/assignments/${item.id}`, metadata: { courseTitle: item.course.title } })),
      ...quizzes.flatMap((item) => [{ organizationId: org.id, courseId: item.courseId, title: `${item.title} available`, description: item.description, type: "quiz_available", startsAt: item.availableFrom, endsAt: null, timezone: null, sourceType: "quiz", sourceId: item.id, visibility: "course", actionUrl: item.activity?.lessonId ? `/learn/lessons/${item.activity.lessonId}?activityId=${item.activityId}` : null, metadata: { courseTitle: item.course?.title } }, { organizationId: org.id, courseId: item.courseId, title: `${item.title} due`, description: item.description, type: "quiz_due", startsAt: item.dueAt, endsAt: null, timezone: null, sourceType: "quiz", sourceId: item.id, visibility: "course", actionUrl: item.activity?.lessonId ? `/learn/lessons/${item.activity.lessonId}?activityId=${item.activityId}` : null, metadata: { courseTitle: item.course?.title } }].filter((event) => event.startsAt)),
      ...announcements.map((item) => ({ organizationId: org.id, courseId: item.courseId, title: item.title, description: item.body, type: "course_announcement", startsAt: item.createdAt, endsAt: null, timezone: null, sourceType: "discussion", sourceId: item.id, visibility: "course", actionUrl: `/learn/courses/${item.courseId}/discussions/${item.id}`, metadata: { courseTitle: item.course?.title } })),
      ...customEvents.map((item) => ({ organizationId: org.id, courseId: item.courseId, title: item.title, description: item.description, type: item.type.toLowerCase(), startsAt: item.startsAt, endsAt: item.endsAt, timezone: item.timezone, sourceType: item.sourceType, sourceId: item.id, visibility: item.visibility, actionUrl: item.actionUrl ?? (item.courseId ? `/learn/courses/${item.courseId}/calendar` : null), metadata: { ...(item.metadata as Record<string, unknown>), courseTitle: item.course?.title, editable: item.createdById === userId } })),
    ].filter((event) => !query.type || event.type === query.type);
    return events.sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
  }

  async createCalendarEvent(org: OrganizationContext, userId: string, dto: CreateCalendarEventDto) {
    const visibility = dto.visibility ?? (dto.courseId ? "course" : "personal");
    if (visibility === "course") {
      if (!dto.courseId) throw new BadRequestException("A course is required for course events");
      await this.ensureCourseManager(org, userId, dto.courseId); await this.validateContext(org.id, dto.courseId, dto.lessonId, dto.activityId);
    } else if (dto.courseId) {
      await this.ensureCourseAccess(org, userId, dto.courseId);
    }
    if (dto.endsAt && new Date(dto.startsAt) >= new Date(dto.endsAt)) throw new BadRequestException("Event end time must be after its start time");
    if (dto.actionUrl && !dto.actionUrl.startsWith("/")) throw new BadRequestException("Calendar action URL must be an internal path");
    const event = await this.prisma.calendarEvent.create({ data: { ...dto, organizationId: org.id, createdById: userId, startsAt: new Date(dto.startsAt), endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined, sourceType: "custom", visibility, metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject } });
    if (visibility === "course" && dto.courseId) await this.notifications.createForCourseParticipants({ organizationId: org.id, type: "course_event", title: dto.title, body: `A course event is scheduled for ${new Date(dto.startsAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC.`, actionUrl: dto.actionUrl ?? `/learn/courses/${dto.courseId}/calendar`, entityType: "calendar_event", entityId: event.id, metadata: { courseId: dto.courseId } });
    await this.audit(org.id, userId, "calendar.event.created", event.id); return event;
  }

  async updateCalendarEvent(org: OrganizationContext, userId: string, id: string, dto: UpdateCalendarEventDto) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, organizationId: org.id } }); if (!event) throw new NotFoundException("Calendar event not found");
    if (event.visibility === "personal") { if (event.createdById !== userId) throw new ForbiddenException("You cannot edit this personal event"); } else await this.ensureCourseManager(org, userId, event.courseId!); const startAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt; const endAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
    if (endAt && startAt >= endAt) throw new BadRequestException("Event end time must be after its start time");
    if (dto.actionUrl && !dto.actionUrl.startsWith("/")) throw new BadRequestException("Calendar action URL must be an internal path");
    const result = await this.prisma.calendarEvent.update({ where: { id }, data: { ...dto, startsAt: dto.startsAt ? startAt : undefined, endsAt: dto.endsAt ? endAt : undefined, metadata: dto.metadata as Prisma.InputJsonObject | undefined } }); await this.audit(org.id, userId, "calendar.event.updated", id); return result;
  }

  async deleteCalendarEvent(org: OrganizationContext, userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, organizationId: org.id } }); if (!event) throw new NotFoundException("Calendar event not found");
    if (event.visibility === "personal") { if (event.createdById !== userId) throw new ForbiddenException("You cannot delete this personal event"); } else await this.ensureCourseManager(org, userId, event.courseId!); await this.prisma.calendarEvent.delete({ where: { id } }); await this.audit(org.id, userId, "calendar.event.deleted", id); return { deleted: true };
  }

  private async thread(organizationId: string, id: string) {
    const thread = await this.prisma.discussionThread.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!thread) throw new NotFoundException("Discussion thread not found");
    return thread;
  }
  private async reply(organizationId: string, id: string) {
    const reply = await this.prisma.discussionReply.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!reply) throw new NotFoundException("Discussion reply not found");
    return reply;
  }
  private async validateContext(organizationId: string, courseId: string, lessonId?: string, activityId?: string) {
    if (lessonId && !(await this.prisma.lesson.findFirst({ where: { id: lessonId, organizationId, courseId } }))) throw new BadRequestException("Lesson does not belong to this course");
    if (activityId && !(await this.prisma.activity.findFirst({ where: { id: activityId, organizationId, courseId, lessonId: lessonId ?? undefined } }))) throw new BadRequestException("Activity does not belong to this course context");
  }
  private async canManageCourse(org: OrganizationContext, userId: string, courseId: string) {
    if (org.isPlatformAdmin || org.roleKeys.some((role) => ADMIN_ROLES.has(role))) return true;
    return Boolean(await this.prisma.courseInstructor.findFirst({ where: { organizationId: org.id, courseId, userId } }));
  }
  private async ensureCourseManager(org: OrganizationContext, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new NotFoundException("Course not found");
    if (!(await this.canManageCourse(org, userId, courseId))) throw new ForbiddenException("Course management access is required");
  }
  private async ensureCourseAccess(org: OrganizationContext, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new NotFoundException("Course not found");
    if (await this.canManageCourse(org, userId, courseId)) return;
    const enrollment = await this.prisma.enrollment.findUnique({ where: { organizationId_courseId_userId: { organizationId: org.id, courseId, userId } } });
    if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) throw new ForbiddenException("Course enrollment is required");
  }
  private async accessibleCourseIds(org: OrganizationContext, userId: string, courseId?: string) {
    if (courseId) { await this.ensureCourseAccess(org, userId, courseId); return [courseId]; }
    if (org.isPlatformAdmin || org.roleKeys.some((role) => ADMIN_ROLES.has(role))) return (await this.prisma.course.findMany({ where: { organizationId: org.id, deletedAt: null }, select: { id: true } })).map(({ id }) => id);
    const [enrollments, instructed] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { organizationId: org.id, userId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } }),
      this.prisma.courseInstructor.findMany({ where: { organizationId: org.id, userId }, select: { courseId: true } }),
    ]);
    return [...new Set([...enrollments, ...instructed].map(({ courseId: id }) => id))];
  }
  private async managedCourseIds(org: OrganizationContext, userId: string, courseId?: string) {
    if (courseId) { await this.ensureCourseManager(org, userId, courseId); return [courseId]; }
    if (org.isPlatformAdmin || org.roleKeys.some((role) => ADMIN_ROLES.has(role))) return (await this.prisma.course.findMany({ where: { organizationId: org.id, deletedAt: null }, select: { id: true } })).map(({ id }) => id);
    return (await this.prisma.courseInstructor.findMany({ where: { organizationId: org.id, userId }, select: { courseId: true } })).map(({ courseId: id }) => id);
  }
  private assertSchedule(startAt: string, endAt: string) {
    if (new Date(startAt) >= new Date(endAt)) throw new BadRequestException("Live class end time must be after its start time");
  }
  private async syncLiveClassStatuses(organizationId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.liveClass.updateMany({ where: { organizationId, status: { in: ["SCHEDULED", "LIVE"] }, endAt: { lte: now } }, data: { status: "ENDED" } }),
      this.prisma.liveClass.updateMany({ where: { organizationId, status: "SCHEDULED", startAt: { lte: now }, endAt: { gt: now } }, data: { status: "LIVE" } }),
    ]);
  }
  private audit(organizationId: string, userId: string, action: string, entityId: string) {
    return this.prisma.auditLog.create({ data: { organizationId, userId, action, entityType: action.split(".")[0], entityId, metadata: {} } });
  }
}
