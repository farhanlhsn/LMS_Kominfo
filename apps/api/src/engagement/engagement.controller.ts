import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, OrganizationContext } from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import {
  CalendarQueryDto, CreateLiveClassDto, CreateReplyDto, CreateThreadDto, DiscussionQueryDto,
  LiveClassQueryDto, ModerateReplyDto, ModerateThreadDto, NotificationQueryDto,
  UpdateDiscussionDto, UpdateLiveClassDto, UpdateNotificationPreferencesDto,
  ReportDiscussionDto, ResolveDiscussionReportDto,
  CreateCalendarEventDto, UpdateCalendarEventDto,
} from "./dto/engagement.dto";
import { EngagementService } from "./engagement.service";
import { NotificationService } from "./notification.service";
import { LiveClassProviderService } from "./live-class-provider.service";

@Controller("discussions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class DiscussionsController {
  constructor(@Inject(EngagementService) private readonly service: EngagementService) {}
  @Get() list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query() query: DiscussionQueryDto) { return this.service.listThreads(org, user.id, query); }
  @Post() create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateThreadDto) { return this.service.createThread(org, user.id, dto); }
  @Get(":id") get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.getThread(org, user.id, id); }
  @Patch(":id") update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateDiscussionDto) { return this.service.updateThread(org, user.id, id, dto); }
  @Delete(":id") delete(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.deleteThread(org, user.id, id); }
  @Post(":id/replies") reply(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateReplyDto) { return this.service.createReply(org, user.id, id, dto); }
  @Patch("replies/:id") updateReply(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateDiscussionDto) { return this.service.updateReply(org, user.id, id, dto); }
  @Delete("replies/:id") deleteReply(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.deleteReply(org, user.id, id); }
  @Patch(":id/moderation") moderate(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ModerateThreadDto) { return this.service.moderateThread(org, user.id, id, dto); }
  @Patch("replies/:id/moderation") moderateReply(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ModerateReplyDto) { return this.service.moderateReply(org, user.id, id, dto); }
  @Post(":id/report") reportThread(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReportDiscussionDto) { return this.service.reportThread(org, user.id, id, dto); }
  @Post("replies/:id/report") reportReply(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReportDiscussionDto) { return this.service.reportReply(org, user.id, id, dto); }
  @Get("moderation/reports") reports(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query("courseId") courseId?: string) { return this.service.listDiscussionReports(org, user.id, courseId); }
  @Patch("moderation/reports/:id") resolveReport(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ResolveDiscussionReportDto) { return this.service.resolveDiscussionReport(org, user.id, id, dto); }
}

@Controller("live-classes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LiveClassesController {
  constructor(@Inject(EngagementService) private readonly service: EngagementService, @Inject(LiveClassProviderService) private readonly providers: LiveClassProviderService) {}
  @Get("providers") providerCapabilities() { return this.providers.capabilities(); }
  @Get() list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query() query: LiveClassQueryDto) { return this.service.listLiveClasses(org, user.id, query); }
  @Post() create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLiveClassDto) { return this.service.createLiveClass(org, user.id, dto); }
  @Get(":id") get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.getLiveClass(org, user.id, id); }
  @Patch(":id") update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateLiveClassDto) { return this.service.updateLiveClass(org, user.id, id, dto); }
  @Post(":id/cancel") cancel(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.cancelLiveClass(org, user.id, id); }
  @Post(":id/join") join(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.joinLiveClass(org, user.id, id); }
}

@Controller("notifications")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class NotificationsController {
  constructor(@Inject(NotificationService) private readonly service: NotificationService) {}
  @Get() list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) { return this.service.list(org.id, user.id, query.unreadOnly); }
  @Get("unread-count") unread(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) { return this.service.unreadCount(org.id, user.id); }
  @Patch(":id/read") read(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.markRead(org.id, user.id, id); }
  @Post("read-all") readAll(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) { return this.service.markAllRead(org.id, user.id); }
  @Get("preferences") preferences(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) { return this.service.preferences(org.id, user.id); }
  @Patch("preferences") updatePreferences(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferencesDto) { return this.service.updatePreferences(org.id, user.id, dto); }
}

@Controller("calendar")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CalendarController {
  constructor(@Inject(EngagementService) private readonly service: EngagementService) {}
  @Get("events") events(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query() query: CalendarQueryDto) { return this.service.calendar(org, user.id, query); }
  @Post("events") create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCalendarEventDto) { return this.service.createCalendarEvent(org, user.id, dto); }
  @Patch("events/:id") update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCalendarEventDto) { return this.service.updateCalendarEvent(org, user.id, id, dto); }
  @Delete("events/:id") delete(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.deleteCalendarEvent(org, user.id, id); }
}
