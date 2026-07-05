import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
import {
  CreateAssignmentDto,
  CreateRubricDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  SaveSubmissionDto,
  UpdateAssignmentDto,
  UpdateRubricDto,
} from "./dto/assignment.dto";
import { AssignmentsService } from "./assignments.service";

@Controller("instructor")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorAssignmentsController {
  constructor(@Inject(AssignmentsService) private readonly service: AssignmentsService) {}

  @Get("courses/:courseId/assignments")
  @Permissions(PERMISSIONS.assignmentsManage)
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("courseId") courseId: string) {
    return this.service.listAssignments(org, user.id, courseId);
  }

  @Post("courses/:courseId/assignments")
  @Permissions(PERMISSIONS.assignmentsManage)
  create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("courseId") courseId: string, @Body() dto: CreateAssignmentDto) {
    return this.service.createAssignment(org, user.id, courseId, dto);
  }

  @Get("assignments/:assignmentId")
  @Permissions(PERMISSIONS.assignmentsManage)
  get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string) {
    return this.service.getInstructorAssignment(org, user.id, assignmentId);
  }

  @Patch("assignments/:assignmentId")
  @Permissions(PERMISSIONS.assignmentsManage)
  update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string, @Body() dto: UpdateAssignmentDto) {
    return this.service.updateAssignment(org, user.id, assignmentId, dto);
  }

  @Delete("assignments/:assignmentId")
  @Permissions(PERMISSIONS.assignmentsManage)
  delete(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string) {
    return this.service.deleteAssignment(org, user.id, assignmentId);
  }

  @Post("assignments/:assignmentId/publish")
  @Permissions(PERMISSIONS.assignmentsManage)
  publish(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string) {
    return this.service.publishAssignment(org, user.id, assignmentId);
  }

  @Get("rubrics")
  @Permissions(PERMISSIONS.assignmentsManage)
  rubrics(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listRubrics(org, user.id);
  }

  @Post("rubrics")
  @Permissions(PERMISSIONS.assignmentsManage)
  createRubric(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRubricDto) {
    return this.service.createRubric(org, user.id, dto);
  }

  @Get("rubrics/:rubricId")
  @Permissions(PERMISSIONS.assignmentsManage)
  rubric(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("rubricId") rubricId: string) {
    return this.service.getRubric(org, user.id, rubricId);
  }

  @Patch("rubrics/:rubricId")
  @Permissions(PERMISSIONS.assignmentsManage)
  updateRubric(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("rubricId") rubricId: string, @Body() dto: UpdateRubricDto) {
    return this.service.updateRubric(org, user.id, rubricId, dto);
  }

  @Delete("rubrics/:rubricId")
  @Permissions(PERMISSIONS.assignmentsManage)
  deleteRubric(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("rubricId") rubricId: string) {
    return this.service.deleteRubric(org, user.id, rubricId);
  }

  @Get("assignments/:assignmentId/submissions")
  @Permissions(PERMISSIONS.assignmentsGrade)
  submissions(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string) {
    return this.service.listSubmissions(org, user.id, assignmentId);
  }

  @Get("submissions/:submissionId")
  @Permissions(PERMISSIONS.assignmentsGrade)
  submission(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string) {
    return this.service.getSubmission(org, user.id, submissionId);
  }

  @Patch("submissions/:submissionId/grade")
  @Permissions(PERMISSIONS.assignmentsGrade)
  grade(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: GradeSubmissionDto) {
    return this.service.gradeSubmission(org, user.id, submissionId, dto);
  }

  @Patch("submissions/:submissionId/return")
  @Permissions(PERMISSIONS.assignmentsGrade)
  returnSubmission(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: ReturnSubmissionDto) {
    return this.service.returnSubmission(org, user.id, submissionId, dto);
  }
}

@Controller("learn")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerAssignmentsController {
  constructor(@Inject(AssignmentsService) private readonly service: AssignmentsService) {}

  @Get("assignments/:assignmentId")
  get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string) {
    return this.service.getLearnerAssignment(org.id, user.id, assignmentId);
  }

  @Post("assignments/:assignmentId/submissions")
  create(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("assignmentId") assignmentId: string, @Body() dto: SaveSubmissionDto) {
    return this.service.createSubmission(org.id, user.id, assignmentId, dto);
  }

  @Patch("submissions/:submissionId")
  update(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: SaveSubmissionDto) {
    return this.service.updateSubmission(org.id, user.id, submissionId, dto);
  }

  @Post("submissions/:submissionId/submit")
  submit(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string) {
    return this.service.submitSubmission(org.id, user.id, submissionId);
  }

  @Get("submissions/:submissionId/result")
  result(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string) {
    return this.service.submissionResult(org.id, user.id, submissionId);
  }
}
