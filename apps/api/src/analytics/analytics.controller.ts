import { Controller, Get, Post, Body, Query, Param, Inject, UseGuards, Req } from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { AnalyticsService } from "./analytics.service";
import type { AnalyticsQueryDto, EventQueryDto, AuditLogQueryDto, ReportExportDto } from "./dto/analytics.dto";

@Controller("api/v1/analytics")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService
  ) {}

  // ── Events ──────────────────────────────────────────

  @Post("events")
  @Permissions(PERMISSIONS.analyticsView)
  async recordEvent(@Req() req: AuthenticatedRequest, @Body() body: { eventType: string; metadata?: Record<string, unknown>; courseId?: string; lessonId?: string; activityId?: string }) {
    const org = req.organization!;
    const event = await this.analytics.recordEvent(org.id, req.user.id, body.eventType, body.metadata, body.courseId, body.lessonId, body.activityId);
    return { data: event };
  }

  @Get("events")
  @Permissions(PERMISSIONS.analyticsView)
  async listEvents(@Req() req: AuthenticatedRequest, @Query() query: EventQueryDto) {
    return this.analytics.listEvents(req.organization!, req.user.id, query);
  }

  // ── Learner ─────────────────────────────────────────

  @Get("learner/dashboard")
  async getLearnerDashboard(@Req() req: AuthenticatedRequest) {
    return { data: await this.analytics.getLearnerDashboard(req.organization!, req.user.id) };
  }

  @Get("learner/progress/:courseId")
  async getLearnerCourseProgress(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string) {
    return { data: await this.analytics.getLearnerCourseProgress(req.organization!, req.user.id, courseId) };
  }

  // ── Instructor ──────────────────────────────────────

  @Get("instructor/dashboard")
  async getInstructorDashboard(@Req() req: AuthenticatedRequest) {
    return { data: await this.analytics.getInstructorDashboard(req.organization!, req.user.id) };
  }

  @Get("instructor/course/:courseId/roster")
  async getInstructorCourseRoster(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string, @Query() query: AnalyticsQueryDto) {
    return this.analytics.getInstructorCourseRoster(req.organization!, req.user.id, courseId, query);
  }

  @Get("instructor/course/:courseId/engagement")
  async getInstructorCourseEngagement(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string, @Query() query: AnalyticsQueryDto) {
    return { data: await this.analytics.getInstructorCourseEngagement(req.organization!, req.user.id, courseId, query) };
  }

  // ── Admin ───────────────────────────────────────────

  @Get("admin/overview")
  @Permissions(PERMISSIONS.analyticsView)
  async getAdminOverview(@Req() req: AuthenticatedRequest) {
    return { data: await this.analytics.getAdminOverview(req.organization!) };
  }

  @Get("admin/courses")
  @Permissions(PERMISSIONS.analyticsView)
  async getAdminCourseMetrics(@Req() req: AuthenticatedRequest, @Query() query: AnalyticsQueryDto) {
    return this.analytics.getAdminCourseMetrics(req.organization!, query);
  }

  @Get("admin/trends")
  @Permissions(PERMISSIONS.analyticsView)
  async getAdminTrends(@Req() req: AuthenticatedRequest, @Query() query: AnalyticsQueryDto) {
    return { data: await this.analytics.getAdminTrends(req.organization!, query) };
  }

  // ── Audit Logs ─────────────────────────────────────

  @Get("audit-logs")
  @Permissions(PERMISSIONS.auditRead)
  async getAuditLogs(@Req() req: AuthenticatedRequest, @Query() query: AuditLogQueryDto) {
    return this.analytics.getAuditLogs(req.organization!, query);
  }

  // ── Daily aggregation trigger (admin only) ─────────

  @Post("aggregate")
  @Permissions(PERMISSIONS.analyticsView)
  async triggerAggregation(@Req() req: AuthenticatedRequest) {
    return { data: await this.analytics.runDailyAggregation(req.organization!.id) };
  }

  // ── Report export trigger ──────────────────────────

  @Post("reports/export")
  @Permissions(PERMISSIONS.analyticsExport)
  async requestExport(@Req() req: AuthenticatedRequest, @Body() dto: ReportExportDto) {
    // Placeholder: actual queue-based export to be implemented in report module
    return { data: { message: "Export request received. Report generation is queued.", reportType: dto.reportType, format: dto.format } };
  }
}
