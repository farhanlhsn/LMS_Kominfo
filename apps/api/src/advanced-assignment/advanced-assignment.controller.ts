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
  AddGroupMemberDto,
  CreateAssignmentGroupDto,
  CreatePeerReviewConfigDto,
  CreatePortfolioDto,
  CreatePortfolioEntryDto,
  CreateProjectShowcaseDto,
  CreateSubmissionAnnotationDto,
  RunPlagiarismCheckDto,
  SubmitPeerReviewDto,
  UpdateAssignmentCollaborationDto,
  UpdateAssignmentGroupDto,
  UpdatePeerReviewConfigDto,
  UpdatePortfolioDto,
  UpdatePortfolioEntryDto,
  UpdateProjectShowcaseDto,
  UpdateSubmissionAnnotationDto,
} from "./dto/advanced-assignment.dto";
import { AdvancedAssignmentService } from "./advanced-assignment.service";

@Controller("instructor/assignments/:assignmentId")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorAssignmentAdvancedController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  // --- Group assignment ---
  @Get("groups")
  @Permissions(PERMISSIONS.coursesRead)
  listGroups(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.service.listGroups(org, user.id, assignmentId);
  }

  @Post("groups")
  @Permissions(PERMISSIONS.coursesUpdate)
  createGroup(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: CreateAssignmentGroupDto,
  ) {
    return this.service.createGroup(org, user.id, assignmentId, dto);
  }

  @Patch("groups/:groupId")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateGroup(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") _assignmentId: string,
    @Param("groupId") groupId: string,
    @Body() dto: UpdateAssignmentGroupDto,
  ) {
    return this.service.updateGroup(org, user.id, groupId, dto);
  }

  @Delete("groups/:groupId")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteGroup(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") _assignmentId: string,
    @Param("groupId") groupId: string,
  ) {
    return this.service.deleteGroup(org, user.id, groupId);
  }

  @Post("groups/:groupId/members")
  @Permissions(PERMISSIONS.coursesUpdate)
  addMember(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") _assignmentId: string,
    @Param("groupId") groupId: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.service.addGroupMember(org, user.id, groupId, dto.userId, dto.role);
  }

  @Delete("groups/:groupId/members/:userId")
  @Permissions(PERMISSIONS.coursesUpdate)
  removeMember(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") _assignmentId: string,
    @Param("groupId") groupId: string,
    @Param("userId") userId: string,
  ) {
    return this.service.removeGroupMember(org, user.id, groupId, userId);
  }

  // --- Peer review ---
  @Get("peer-review/config")
  @Permissions(PERMISSIONS.coursesRead)
  getPeerReviewConfig(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.service.getPeerReviewConfig(org, user.id, assignmentId);
  }

  @Post("peer-review/config")
  @Permissions(PERMISSIONS.coursesUpdate)
  createPeerReviewConfig(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: CreatePeerReviewConfigDto,
  ) {
    return this.service.upsertPeerReviewConfig(org, user.id, assignmentId, dto);
  }

  @Patch("peer-review/config")
  @Permissions(PERMISSIONS.coursesUpdate)
  updatePeerReviewConfig(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: UpdatePeerReviewConfigDto,
  ) {
    return this.service.upsertPeerReviewConfig(org, user.id, assignmentId, dto);
  }

  @Post("peer-review/generate-matches")
  @Permissions(PERMISSIONS.coursesUpdate)
  generatePeerReviewMatches(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.service.generatePeerReviewMatches(org, user.id, assignmentId);
  }

  @Get("peer-review/matches")
  @Permissions(PERMISSIONS.coursesRead)
  listPeerReviewMatches(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.service.listPeerReviewMatchesForInstructor(org, user.id, assignmentId);
  }

  // --- Assignment collaboration settings ---
  @Patch("collaboration")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateCollaboration(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: UpdateAssignmentCollaborationDto,
  ) {
    return this.service.updateAssignmentCollaboration(org, user.id, assignmentId, dto);
  }
}

@Controller("instructor/submissions/:submissionId")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorSubmissionAdvancedController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  // --- Annotations ---
  @Get("annotations")
  @Permissions(PERMISSIONS.assignmentsGrade)
  listAnnotations(
    @ActiveOrganization() org: OrganizationContext,
    @Param("submissionId") submissionId: string,
  ) {
    return this.service.listAnnotations(org.id, submissionId);
  }

  @Post("annotations")
  @Permissions(PERMISSIONS.assignmentsGrade)
  createAnnotation(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
    @Body() dto: CreateSubmissionAnnotationDto,
  ) {
    return this.service.createAnnotation(org, user.id, submissionId, dto);
  }

  @Patch("annotations/:annotationId")
  @Permissions(PERMISSIONS.assignmentsGrade)
  updateAnnotation(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") _submissionId: string,
    @Param("annotationId") annotationId: string,
    @Body() dto: UpdateSubmissionAnnotationDto,
  ) {
    return this.service.updateAnnotation(org, user.id, annotationId, dto);
  }

  @Delete("annotations/:annotationId")
  @Permissions(PERMISSIONS.assignmentsGrade)
  deleteAnnotation(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") _submissionId: string,
    @Param("annotationId") annotationId: string,
  ) {
    return this.service.deleteAnnotation(org, user.id, annotationId);
  }

  // --- Plagiarism ---
  @Get("plagiarism-checks")
  @Permissions(PERMISSIONS.assignmentsGrade)
  listPlagiarism(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
  ) {
    return this.service.listPlagiarismChecks(org, user.id, submissionId);
  }

  @Post("plagiarism-checks")
  @Permissions(PERMISSIONS.assignmentsGrade)
  runPlagiarism(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
    @Body() dto: RunPlagiarismCheckDto,
  ) {
    return this.service.runPlagiarismCheck(org, user.id, submissionId, dto);
  }
}

@Controller("instructor/courses/:courseId/showcases")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorShowcaseController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.coursesRead)
  list(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.service.listShowcases(org, user.id, courseId);
  }

  @Post()
  @Permissions(PERMISSIONS.coursesUpdate)
  create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
    @Body() dto: CreateProjectShowcaseDto & { submissionId: string },
  ) {
    return this.service.createShowcase(org, user.id, courseId, dto.submissionId, dto);
  }
}

@Controller("instructor/showcases/:showcaseId")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorShowcaseItemController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Patch()
  @Permissions(PERMISSIONS.coursesUpdate)
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("showcaseId") showcaseId: string,
    @Body() dto: UpdateProjectShowcaseDto,
  ) {
    return this.service.updateShowcase(org, user.id, showcaseId, dto);
  }

  @Delete()
  @Permissions(PERMISSIONS.coursesUpdate)
  delete(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("showcaseId") showcaseId: string,
  ) {
    return this.service.deleteShowcase(org, user.id, showcaseId);
  }
}

@Controller("learn/peer-reviews")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerPeerReviewController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get()
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listPeerReviewsForLearner(org.id, user.id);
  }

  @Post("matches/:matchId/submit")
  submit(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("matchId") matchId: string,
    @Body() dto: SubmitPeerReviewDto,
  ) {
    return this.service.submitPeerReview(org, user.id, matchId, dto);
  }
}

@Controller("learn/submissions/:submissionId/annotations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerSubmissionAnnotationController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get()
  list(
    @ActiveOrganization() org: OrganizationContext,
    @Param("submissionId") submissionId: string,
  ) {
    return this.service.listAnnotations(org.id, submissionId);
  }
}

@Controller("learn/portfolio")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerPortfolioController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get()
  get(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getMyPortfolio(org.id, user.id);
  }

  @Post()
  create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() _dto: CreatePortfolioDto,
  ) {
    return this.service.getMyPortfolio(org.id, user.id);
  }

  @Patch()
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.service.updateMyPortfolio(org.id, user.id, dto);
  }

  @Post("entries")
  addEntry(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePortfolioEntryDto,
  ) {
    return this.service.addPortfolioEntry(org.id, user.id, dto);
  }

  @Patch("entries/:entryId")
  updateEntry(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("entryId") entryId: string,
    @Body() dto: UpdatePortfolioEntryDto,
  ) {
    return this.service.updatePortfolioEntry(org.id, user.id, entryId, dto);
  }

  @Delete("entries/:entryId")
  removeEntry(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("entryId") entryId: string,
  ) {
    return this.service.removePortfolioEntry(org.id, user.id, entryId);
  }
}

@Controller("public/portfolios")
export class PublicPortfolioController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get(":shareToken")
  getPublic(@Param("shareToken") shareToken: string) {
    return this.service.getPublicPortfolio(shareToken);
  }
}

@Controller("public/courses/:courseId/showcases")
export class PublicShowcaseController {
  constructor(
    @Inject(AdvancedAssignmentService)
    private readonly service: AdvancedAssignmentService,
  ) {}

  @Get()
  list(@Param("courseId") courseId: string, @ActiveOrganization() org: OrganizationContext) {
    return this.service.listPublicShowcases(org.id, courseId);
  }

  @Post(":showcaseId/view")
  recordView(
    @Param("courseId") _courseId: string,
    @Param("showcaseId") showcaseId: string,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.recordShowcaseView(org.id, showcaseId);
  }
}
