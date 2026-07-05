import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
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
  AddCohortMemberDto,
  BatchCreateCohortScheduleDto,
  COHORT_STATUSES,
  CohortStatus,
  CreateCohortDto,
  CreateCohortScheduleDto,
  UpdateCohortDto,
  UpdateUserTimezoneDto,
} from "./dto/scheduling.dto";
import { SchedulingService } from "./scheduling.service";

@Controller("admin/cohorts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminCohortController {
  constructor(
    @Inject(SchedulingService) private readonly service: SchedulingService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.coursesRead)
  list(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("courseId") courseId?: string,
    @Query("status") status?: CohortStatus,
  ) {
    return this.service.listCohorts(org, user.id, {
      ...(courseId ? { courseId } : {}),
      ...(status && (COHORT_STATUSES as readonly string[]).includes(status)
        ? { status }
        : {}),
    });
  }

  @Post()
  @Permissions(PERMISSIONS.coursesUpdate)
  create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCohortDto,
  ) {
    return this.service.createCohort(org, user.id, dto);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.coursesRead)
  get(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.getCohort(org, user.id, id);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.coursesUpdate)
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCohortDto,
  ) {
    return this.service.updateCohort(org, user.id, id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.coursesUpdate)
  remove(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.deleteCohort(org, user.id, id);
  }

  @Post(":id/members")
  @Permissions(PERMISSIONS.coursesUpdate)
  addMember(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddCohortMemberDto,
  ) {
    return this.service.addMember(org, user.id, id, dto);
  }

  @Delete(":id/members/:userId")
  @Permissions(PERMISSIONS.coursesUpdate)
  removeMember(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") memberUserId: string,
  ) {
    return this.service.removeMember(org, user.id, id, memberUserId);
  }

  @Get(":id/schedule")
  @Permissions(PERMISSIONS.coursesRead)
  listSchedule(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.listSchedule(org, id);
  }

  @Post(":id/schedule")
  @Permissions(PERMISSIONS.coursesUpdate)
  addSchedule(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateCohortScheduleDto,
  ) {
    return this.service.addSchedule(org, user.id, id, dto);
  }

  @Post(":id/schedule/bulk")
  @Permissions(PERMISSIONS.coursesUpdate)
  bulkAddSchedule(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: BatchCreateCohortScheduleDto,
  ) {
    return this.service.batchAddSchedule(org, user.id, id, dto);
  }
}

@Controller("learn/cohorts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerCohortController {
  constructor(
    @Inject(SchedulingService) private readonly service: SchedulingService,
  ) {}

  @Get()
  listMine(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listMyCohorts(org.id, user.id);
  }
}

@Controller("me/timezone")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class MeTimezoneController {
  constructor(
    @Inject(SchedulingService) private readonly service: SchedulingService,
  ) {}

  @Get()
  get(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getMyTimezone(org.id, user.id);
  }

  @Put()
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserTimezoneDto,
  ) {
    return this.service.updateMyTimezone(org.id, user.id, dto);
  }
}
