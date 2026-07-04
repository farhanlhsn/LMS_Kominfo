import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
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
import {
  AddQuizQuestionDto,
  AttachQuizDto,
  CreateQuestionBankDto,
  CreateQuestionDto,
  CreateQuizDto,
  ManualGradeAnswerDto,
  ReorderQuizQuestionsDto,
  SaveQuizAnswerDto,
  UpdateQuestionBankDto,
  UpdateQuestionDto,
  UpdateQuizDto,
} from "./dto/quiz.dto";
import { QuizService } from "./quiz.service";

@Controller("instructor")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorQuizController {
  constructor(@Inject(QuizService) private readonly quiz: QuizService) {}

  @Get("question-banks")
  @Permissions(PERMISSIONS.quizManage)
  listQuestionBanks(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quiz.listQuestionBanks(organization, user.id);
  }

  @Post("question-banks")
  @Permissions(PERMISSIONS.quizManage)
  createQuestionBank(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionBankDto,
  ) {
    return this.quiz.createQuestionBank(organization, user.id, dto);
  }

  @Patch("question-banks/:bankId")
  @Permissions(PERMISSIONS.quizManage)
  updateQuestionBank(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bankId") bankId: string,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return this.quiz.updateQuestionBank(organization, user.id, bankId, dto);
  }

  @Delete("question-banks/:bankId")
  @Permissions(PERMISSIONS.quizManage)
  deleteQuestionBank(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bankId") bankId: string,
  ) {
    return this.quiz.deleteQuestionBank(organization, user.id, bankId);
  }

  @Get("questions")
  @Permissions(PERMISSIONS.quizManage)
  listQuestions(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("bankId") bankId?: string,
  ) {
    return this.quiz.listQuestions(organization, user.id, bankId);
  }

  @Post("questions")
  @Permissions(PERMISSIONS.quizManage)
  createQuestion(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quiz.createQuestion(organization, user.id, dto);
  }

  @Patch("questions/:questionId")
  @Permissions(PERMISSIONS.quizManage)
  updateQuestion(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quiz.updateQuestion(organization, user.id, questionId, dto);
  }

  @Delete("questions/:questionId")
  @Permissions(PERMISSIONS.quizManage)
  deleteQuestion(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("questionId") questionId: string,
  ) {
    return this.quiz.deleteQuestion(organization, user.id, questionId);
  }

  @Get("quizzes")
  @Permissions(PERMISSIONS.quizManage)
  listQuizzes(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quiz.listQuizzes(organization, user.id);
  }

  @Post("quizzes")
  @Permissions(PERMISSIONS.quizManage)
  createQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quiz.createQuiz(organization, user.id, dto);
  }

  @Get("quizzes/:quizId")
  @Permissions(PERMISSIONS.quizManage)
  getQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
  ) {
    return this.quiz.getInstructorQuiz(organization, user.id, quizId);
  }

  @Patch("quizzes/:quizId")
  @Permissions(PERMISSIONS.quizManage)
  updateQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quiz.updateQuiz(organization, user.id, quizId, dto);
  }

  @Post("quizzes/:quizId/publish")
  @Permissions(PERMISSIONS.quizManage)
  publishQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
  ) {
    return this.quiz.publishQuiz(organization, user.id, quizId);
  }

  @Post("quizzes/:quizId/questions")
  @Permissions(PERMISSIONS.quizManage)
  addQuestion(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
    @Body() dto: AddQuizQuestionDto,
  ) {
    return this.quiz.addQuestion(organization, user.id, quizId, dto);
  }

  @Delete("quizzes/:quizId/questions/:questionId")
  @Permissions(PERMISSIONS.quizManage)
  removeQuestion(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string,
  ) {
    return this.quiz.removeQuestion(organization, user.id, quizId, questionId);
  }

  @Patch("quizzes/:quizId/questions/reorder")
  @Permissions(PERMISSIONS.quizManage)
  reorderQuestions(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
    @Body() dto: ReorderQuizQuestionsDto,
  ) {
    return this.quiz.reorderQuestions(organization, user.id, quizId, dto);
  }

  @Post("activities/:activityId/quiz")
  @Permissions(PERMISSIONS.quizManage)
  attachQuizToActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: AttachQuizDto,
  ) {
    return this.quiz.attachQuizToActivity(organization, user.id, activityId, dto);
  }

  @Get("quizzes/:quizId/attempts")
  @Permissions(PERMISSIONS.quizGrade)
  listAttempts(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("quizId") quizId: string,
  ) {
    return this.quiz.listAttempts(organization, user.id, quizId);
  }

  @Get("quiz-attempts/:attemptId")
  @Permissions(PERMISSIONS.quizGrade)
  attemptDetail(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.quiz.attemptDetail(organization, user.id, attemptId);
  }

  @Patch("quiz-answers/:answerId/grade")
  @Permissions(PERMISSIONS.quizGrade)
  manualGrade(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("answerId") answerId: string,
    @Body() dto: ManualGradeAnswerDto,
  ) {
    return this.quiz.manualGradeAnswer(organization, user.id, answerId, dto);
  }
}

@Controller("learn")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerQuizController {
  constructor(@Inject(QuizService) private readonly quiz: QuizService) {}

  @Get("activities/:activityId/quiz")
  getQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.quiz.getLearnerQuiz(organization.id, user.id, activityId);
  }

  @Post("activities/:activityId/quiz/attempts")
  startAttempt(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.quiz.startAttempt(organization.id, user.id, activityId);
  }

  @Patch("quiz-attempts/:attemptId/answers")
  saveAnswer(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: SaveQuizAnswerDto,
  ) {
    return this.quiz.saveAnswer(organization.id, user.id, attemptId, dto);
  }

  @Post("quiz-attempts/:attemptId/submit")
  submitAttempt(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.quiz.submitAttempt(organization.id, user.id, attemptId);
  }

  @Get("quiz-attempts/:attemptId/result")
  result(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.quiz.result(organization.id, user.id, attemptId);
  }
}
