import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { RequiresPlugin } from "../plugins/decorators/requires-plugin.decorator";
import { PluginEntitlementGuard } from "../plugins/guards/plugin-entitlement.guard";
import {
  CommitScormAttemptDto,
  CourseFeedbackQueryDto,
  CreateH5PContentDto,
  CreatePollDto,
  CreateScormPackageDto,
  CreateSurveyDto,
  CreateSurveyQuestionDto,
  PollQueryDto,
  PostXapiStatementsDto,
  PutXapiStateDto,
  StartScormAttemptDto,
  SubmitCourseFeedbackDto,
  SubmitH5PResultDto,
  SubmitSurveyResponseDto,
  SurveyQueryDto,
  UpdateH5PContentDto,
  UpdatePollDto,
  UpdateScormPackageDto,
  UpdateSurveyDto,
  VotePollDto,
} from "./dto/experiences.dto";
import { ExperiencesService } from "./experiences.service";

// ── SCORM ─────────────────────────────────────────
@Controller("scorm/packages")
@RequiresPlugin("plugin.scorm")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PluginEntitlementGuard)
export class ScormController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Query("courseId") courseId?: string,
  ) {
    return this.service.listScormPackages(org, courseId);
  }
  @Post() create(
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: CreateScormPackageDto,
  ) {
    return this.service.createScormPackage(org, dto);
  }
  @Get(":id") get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getScormPackage(org, id);
  }
  @Patch(":id") update(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdateScormPackageDto,
  ) {
    return this.service.updateScormPackage(org, id, dto);
  }
  @Delete(":id") delete(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.deleteScormPackage(org, id);
  }
}

@Controller("scorm/packages/:packageId/attempts")
@RequiresPlugin("plugin.scorm")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PluginEntitlementGuard)
export class ScormAttemptController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Param("packageId") packageId: string,
  ) {
    return this.service.listScormAttempts(org, packageId);
  }
  @Post() start(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("packageId") packageId: string,
    @Body() dto: StartScormAttemptDto,
  ) {
    return this.service.startScormAttempt(org, user.id, packageId, dto);
  }
  @Patch(":attemptId") commit(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("packageId") _packageId: string,
    @Param("attemptId") attemptId: string,
    @Body() dto: CommitScormAttemptDto,
  ) {
    return this.service.commitScormAttempt(org, user.id, attemptId, dto);
  }
}

// ── H5P ──────────────────────────────────────────
@Controller("h5p/contents")
@RequiresPlugin("plugin.h5p")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PluginEntitlementGuard)
export class H5PController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Query("courseId") courseId?: string,
  ) {
    return this.service.listH5PContent(org, courseId);
  }
  @Post() create(
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: CreateH5PContentDto,
  ) {
    return this.service.createH5PContent(org, dto);
  }
  @Get(":id") get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getH5PContent(org, id);
  }
  @Patch(":id") update(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdateH5PContentDto,
  ) {
    return this.service.updateH5PContent(org, id, dto);
  }
  @Delete(":id") delete(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.deleteH5PContent(org, id);
  }
}

@Controller("h5p/contents/:contentId/results")
@RequiresPlugin("plugin.h5p")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PluginEntitlementGuard)
export class H5PResultController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Param("contentId") contentId: string,
  ) {
    return this.service.listH5PResults(org, contentId);
  }
  @Post() submit(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("contentId") contentId: string,
    @Body() dto: SubmitH5PResultDto,
  ) {
    return this.service.submitH5PResult(org, user.id, contentId, dto);
  }
}

// ── xAPI ─────────────────────────────────────────
@Controller("xapi")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class XapiController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get("statements") list(
    @ActiveOrganization() org: OrganizationContext,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.service.listXapiStatements(org, parsed);
  }

  @Post("statements") post(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PostXapiStatementsDto,
  ) {
    return this.service.postXapiStatements(org, user.id, dto.statements);
  }

  @Get("state") getState(
    @ActiveOrganization() org: OrganizationContext,
    @Query("activityId") activityId: string,
    @Query("stateId") stateId: string,
    @Query("agent") agent?: string,
  ) {
    return this.service.getXapiState(
      org,
      activityId,
      stateId,
      parseAgent(agent),
    );
  }

  @Put("state") putState(
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: PutXapiStateDto,
  ) {
    return this.service.putXapiState(org, dto);
  }

  @Delete("state") deleteState(
    @ActiveOrganization() org: OrganizationContext,
    @Query("activityId") activityId: string,
    @Query("stateId") stateId: string,
    @Query("agent") agent?: string,
  ) {
    return this.service.deleteXapiState(
      org,
      activityId,
      stateId,
      parseAgent(agent),
    );
  }
}

function parseAgent(raw?: string): Record<string, unknown> {
  if (!raw) return { anonymous: true };
  try {
    return JSON.parse(raw);
  } catch {
    return { mbox: `mailto:${raw}` };
  }
}

// ── Survey ───────────────────────────────────────
@Controller("surveys")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SurveyController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: SurveyQueryDto,
  ) {
    return this.service.listSurveys(org, query.courseId, query.status);
  }
  @Post() create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSurveyDto,
  ) {
    return this.service.createSurvey(org, user.id, dto);
  }
  @Get(":id") get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getSurvey(org, id);
  }
  @Patch(":id") update(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdateSurveyDto,
  ) {
    return this.service.updateSurvey(org, id, dto);
  }
  @Delete(":id") delete(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.deleteSurvey(org, id);
  }
  @Post(":id/questions") addQuestion(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: CreateSurveyQuestionDto,
  ) {
    return this.service.addSurveyQuestion(org, id, dto);
  }
  @Delete(":id/questions/:questionId") removeQuestion(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
  ) {
    return this.service.removeSurveyQuestion(org, id, questionId);
  }
  @Post(":id/responses") respond(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SubmitSurveyResponseDto,
  ) {
    return this.service.submitSurveyResponse(org, user.id, id, dto);
  }
  @Get(":id/responses") listResponses(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.listSurveyResponses(org, id);
  }
  @Get(":id/responses/export")
  @Header("content-type", "text/csv; charset=utf-8")
  async exportResponses(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportSurveyResponsesCsv(org, id);
    res.setHeader(
      "content-disposition",
      `attachment; filename="survey-${id}.csv"`,
    );
    res.send(csv);
  }
}

// ── Poll ─────────────────────────────────────────
@Controller("polls")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PollController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: PollQueryDto,
  ) {
    return this.service.listPolls(org, query.courseId, query.status);
  }
  @Post() create(
    @ActiveOrganization() org: OrganizationContext,
    @Body() dto: CreatePollDto,
  ) {
    return this.service.createPoll(org, dto);
  }
  @Get(":id") get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getPoll(org, id);
  }
  @Patch(":id") update(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdatePollDto,
  ) {
    return this.service.updatePoll(org, id, dto);
  }
  @Delete(":id") delete(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.deletePoll(org, id);
  }
  @Post(":id/votes") vote(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: VotePollDto,
  ) {
    return this.service.votePoll(org, user.id, id, dto);
  }
  @Get(":id/results") results(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.pollResults(org, id);
  }
}

// ── Course Feedback ──────────────────────────────
@Controller("course-feedback")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CourseFeedbackController {
  constructor(
    @Inject(ExperiencesService) private readonly service: ExperiencesService,
  ) {}

  @Get() list(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: CourseFeedbackQueryDto,
  ) {
    return this.service.listCourseFeedback(org, query.courseId);
  }
  @Post() submit(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitCourseFeedbackDto,
  ) {
    return this.service.submitCourseFeedback(org, user.id, dto);
  }
  @Get("export")
  @Header("content-type", "text/csv; charset=utf-8")
  async exportCsv(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: CourseFeedbackQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCourseFeedbackCsv(org, query.courseId);
    res.setHeader(
      "content-disposition",
      `attachment; filename="feedback-${query.courseId}.csv"`,
    );
    res.send(csv);
  }
}
