import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
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
