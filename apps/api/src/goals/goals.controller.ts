import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CreateLearningGoalDto, UpdateLearningGoalDto } from "./dto/goal.dto";
import { GoalsService } from "./goals.service";

@Controller("learn/goals")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class GoalsController {
  constructor(@Inject(GoalsService) private readonly service: GoalsService) {}

  @Get()
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(org.id, user.id);
  }

  @Post()
  create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLearningGoalDto) {
    return this.service.create(org.id, user.id, dto);
  }

  @Patch(":goalId")
  update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("goalId") goalId: string, @Body() dto: UpdateLearningGoalDto) {
    return this.service.update(org.id, user.id, goalId, dto);
  }

  @Delete(":goalId")
  delete(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("goalId") goalId: string) {
    return this.service.delete(org.id, user.id, goalId);
  }

  @Post(":goalId/complete")
  complete(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("goalId") goalId: string) {
    return this.service.complete(org.id, user.id, goalId);
  }
}

@Controller("learn/study-sessions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class StudySessionController {
  constructor(@Inject(GoalsService) private readonly service: GoalsService) {}

  @Post()
  start(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() body: { courseId?: string; goalId?: string; targetSeconds?: number }) {
    return this.service.startStudySession(org.id, user.id, body);
  }

  @Get()
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Query("status") status?: string, @Query("from") from?: string, @Query("to") to?: string, @Query("limit") limit?: number) {
    return this.service.listStudySessions(org.id, user.id, { status, from, to, limit });
  }

  @Get(":id")
  get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.getStudySession(org.id, user.id, id);
  }

  @Patch(":id")
  update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: { status?: string; elapsedSeconds?: number }) {
    return this.service.updateStudySession(org.id, user.id, id, body);
  }

  @Delete(":id")
  cancel(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.cancelStudySession(org.id, user.id, id);
  }
}
