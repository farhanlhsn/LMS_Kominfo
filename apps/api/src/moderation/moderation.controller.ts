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
import { ModerationService } from "./moderation.service";
import {
  CreateActionDto,
  CreateReportDto,
  ListReportsQueryDto,
  UpdateReportDto,
} from "./dto/moderation.dto";

@Controller("moderation")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ModerationController {
  constructor(
    @Inject(ModerationService) private readonly service: ModerationService,
  ) {}

  @Post("reports")
  report(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.service.createReport(org, user, dto);
  }
}

@Controller("admin/moderation")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class ModerationAdminController {
  constructor(
    @Inject(ModerationService) private readonly service: ModerationService,
  ) {}

  @Get("reports")
  @Permissions(PERMISSIONS.auditRead)
  listReports(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: ListReportsQueryDto,
  ) {
    return this.service.listReports(org, query);
  }

  @Patch("reports/:id")
  @Permissions(PERMISSIONS.auditRead)
  updateReport(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.service.updateReport(org, user, id, dto);
  }

  @Get("actions")
  @Permissions(PERMISSIONS.auditRead)
  listActions(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listActions(org);
  }

  @Post("actions")
  @Permissions(PERMISSIONS.organizationsManage)
  createAction(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActionDto,
  ) {
    return this.service.createAction(org, user, dto);
  }

  @Get("flags")
  @Permissions(PERMISSIONS.auditRead)
  listFlags(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listFlags(org);
  }
}
