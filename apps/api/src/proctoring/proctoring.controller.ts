import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import {
  BatchIngestProctoringEventsDto,
  IngestProctoringEventDto,
  ReviewProctoringFlagDto,
} from "./dto/proctoring.dto";
import { ProctoringService } from "./proctoring.service";

class StartSessionDto {
  attemptId!: string;
  attemptType?: string;
  metadata?: Record<string, unknown>;
}

@Controller("proctoring/sessions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class ProctoringSessionController {
  constructor(
    @Inject(ProctoringService) private readonly service: ProctoringService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.quizManage)
  start(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartSessionDto,
  ) {
    return this.service.startSession(org, user, dto);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.quizManage)
  get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getSession(org.id, id);
  }

  @Post(":id/events")
  @Permissions(PERMISSIONS.quizManage)
  ingest(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: IngestProctoringEventDto,
  ) {
    return this.service.ingestEvent(org, user, id, dto);
  }

  @Post(":id/events/batch")
  @Permissions(PERMISSIONS.assessmentsTake)
  ingestBatch(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: BatchIngestProctoringEventsDto,
  ) {
    return this.service.ingestBatch(org, user, id, dto);
  }

  @Post(":id/sample")
  @Permissions(PERMISSIONS.quizManage)
  sample(@Param("id") _id: string) {
    return this.service.sampleProviderEvent();
  }

  @Post(":id/end")
  @Permissions(PERMISSIONS.quizManage)
  end(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.endSession(org.id, id, user.id);
  }
}

@Controller("admin/proctoring")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminProctoringController {
  constructor(
    @Inject(ProctoringService) private readonly service: ProctoringService,
  ) {}

  @Get("sessions")
  @Permissions(PERMISSIONS.quizGrade)
  listSessions(
    @ActiveOrganization() org: OrganizationContext,
    @Query("userId") userId?: string,
    @Query("status") status?: "ACTIVE" | "COMPLETED" | "FLAGGED" | "REVIEWED",
  ) {
    return this.service.listSessions(org.id, {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    });
  }

  @Get("flags")
  @Permissions(PERMISSIONS.quizGrade)
  listFlags(
    @ActiveOrganization() org: OrganizationContext,
    @Query("status") status?: "OPEN" | "DISMISSED" | "UPHELD",
    @Query("sessionId") sessionId?: string,
  ) {
    return this.service.listFlags(org.id, {
      ...(status ? { status } : {}),
      ...(sessionId ? { sessionId } : {}),
    });
  }

  @Patch("flags/:id")
  @Permissions(PERMISSIONS.quizGrade)
  reviewFlag(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewProctoringFlagDto,
  ) {
    return this.service.reviewFlag(org, user, id, dto);
  }
}
