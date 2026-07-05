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
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CodeRunnerService } from "./code-runner.service";
import {
  ExecuteCodeDto,
  JudgeCodeDto,
} from "./dto/code-runner.dto";

@Controller("code-runner")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class CodeRunnerController {
  constructor(
    @Inject(CodeRunnerService) private readonly service: CodeRunnerService,
  ) {}

  @Post("execute")
  @Permissions(PERMISSIONS.assignmentsManage)
  execute(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExecuteCodeDto,
  ) {
    return this.service.execute(organization, user.id, dto);
  }

  @Post("judge")
  @Permissions(PERMISSIONS.assignmentsManage)
  judge(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: JudgeCodeDto & { assignmentId: string },
  ) {
    const { assignmentId, ...dto } = body;
    return this.service.judge(organization, user.id, assignmentId, dto);
  }

  @Get("submissions")
  @Permissions(PERMISSIONS.assignmentsManage)
  listSubmissions(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("assignmentId") assignmentId?: string,
    @Query("userId") userId?: string,
  ) {
    return this.service.listSubmissions(organization.id, {
      assignmentId,
      userId,
    });
  }

  @Get("executions/:id")
  @Permissions(PERMISSIONS.assignmentsManage)
  getExecution(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getExecution(organization.id, id);
  }
}
