import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { RequiresPlugin } from "../plugins/decorators/requires-plugin.decorator";
import { PluginEntitlementGuard } from "../plugins/guards/plugin-entitlement.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CodeRunnerService } from "./code-runner.service";
import { ExecuteCodeDto, JudgeCodeDto } from "./dto/code-runner.dto";

@Controller("code-runner")
@RequiresPlugin("plugin.code_runner")
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PluginEntitlementGuard,
  PermissionsGuard,
)
export class CodeRunnerController {
  constructor(
    @Inject(CodeRunnerService) private readonly service: CodeRunnerService,
  ) {}

  @Post("execute")
  @Permissions(PERMISSIONS.coursesRead)
  execute(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExecuteCodeDto,
  ) {
    return this.service.execute(organization, user.id, dto);
  }

  @Post("judge")
  @Permissions(PERMISSIONS.coursesRead)
  judge(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: JudgeCodeDto & { assignmentId: string },
  ) {
    const { assignmentId, ...dto } = body;
    return this.service.judge(organization, user.id, assignmentId, dto);
  }

  @Get("submissions")
  @Permissions(PERMISSIONS.coursesRead)
  listSubmissions(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("assignmentId") assignmentId?: string,
    @Query("userId") userId?: string,
  ) {
    // Learners can only see their own submissions
    const resolvedUserId = organization.roleKeys.some((r) =>
      [
        "org_admin",
        "course_manager",
        "instructor",
        "assistant_instructor",
      ].includes(r),
    )
      ? userId
      : user.id;
    return this.service.listSubmissions(organization.id, {
      assignmentId,
      userId: resolvedUserId,
    });
  }

  @Get("executions/:id")
  @Permissions(PERMISSIONS.coursesRead)
  getExecution(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getExecution(organization.id, id);
  }
}
