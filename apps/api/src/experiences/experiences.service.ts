import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { normalizePageLimit, pageMeta } from "@lms/shared";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CommitScormAttemptDto,
  CreateH5PContentDto,
  CreatePollDto,
  CreateScormPackageDto,
  CreateSurveyDto,
  CreateSurveyQuestionDto,
  PutXapiStateDto,
  StartScormAttemptDto,
  SubmitCourseFeedbackDto,
  SubmitH5PResultDto,
  SubmitSurveyResponseDto,
  UpdateH5PContentDto,
  UpdatePollDto,
  UpdateScormPackageDto,
  UpdateSurveyDto,
  VotePollDto,
} from "./dto/experiences.dto";

const ADMIN_ROLES = new Set(["org_admin", "course_manager"]);

@Injectable()
export class ExperiencesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}



  private async canManage(org: OrganizationContext, courseId?: string | null) {
    if (org.isPlatformAdmin || org.roleKeys.some((r) => ADMIN_ROLES.has(r))) return true;
    if (!courseId) return false;
    return !!(await this.prisma.courseInstructor.findFirst({
      where: { organizationId: org.id, courseId, userId: org.memberId },
    }));
  }

  private async ensureCourse(org: OrganizationContext, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: org.id, deletedAt: null },
    });
    if (!course) throw new NotFoundException("Course not found");
    return course;
  }

  private async ensureEnrolled(org: OrganizationContext, userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId: org.id, courseId, userId } },
    });
    if (!enrollment) throw new ForbiddenException("You must be enrolled in the course");
  }

  // ── SCORM ─────────────────────────────────────────
  async listScormPackages(org: OrganizationContext, courseId?: string) {
    return this.prisma.scormPackage.findMany({
      where: { organizationId: org.id, courseId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getScormPackage(org: OrganizationContext, id: string) {
    const pkg = await this.prisma.scormPackage.findFirst({ where: { id, organizationId: org.id } });
    if (!pkg) throw new NotFoundException("SCORM package not found");
    return pkg;
  }

  async createScormPackage(org: OrganizationContext, dto: CreateScormPackageDto) {
    await this.ensureCourse(org, dto.courseId);
    if (!(await this.canManage(org, dto.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.scormPackage.create({
      data: {
        organizationId: org.id,
        courseId: dto.courseId,
        activityId: dto.activityId,
        title: dto.title,
        version: dto.version ?? "1.2",
        entryUrl: dto.entryUrl,
        fileId: dto.fileId,
        manifest: (dto.manifest ?? {}) as any,
      },
    });
  }

  async updateScormPackage(org: OrganizationContext, id: string, dto: UpdateScormPackageDto) {
    const pkg = await this.getScormPackage(org, id);
    if (!(await this.canManage(org, pkg.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.scormPackage.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        entryUrl: dto.entryUrl,
        manifest: dto.manifest as any,
      },
    });
  }

  async deleteScormPackage(org: OrganizationContext, id: string) {
    const pkg = await this.getScormPackage(org, id);
    if (!(await this.canManage(org, pkg.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.scormPackage.delete({ where: { id } });
    return { deleted: true };
  }

  async startScormAttempt(org: OrganizationContext, userId: string, packageId: string, dto: StartScormAttemptDto) {
    const pkg = await this.getScormPackage(org, packageId);
    await this.ensureEnrolled(org, userId, pkg.courseId);
    const sessionId = dto.sessionId ?? `sess_${Date.now()}`;
    return this.prisma.scormAttempt.upsert({
      where: {
        organizationId_packageId_userId_sessionId: {
          organizationId: org.id,
          packageId,
          userId,
          sessionId,
        },
      },
      create: { organizationId: org.id, packageId, userId, sessionId, status: "IN_PROGRESS" },
      update: { status: "IN_PROGRESS" },
    });
  }

  async commitScormAttempt(org: OrganizationContext, userId: string, attemptId: string, dto: CommitScormAttemptDto) {
    const attempt = await this.prisma.scormAttempt.findFirst({
      where: { id: attemptId, organizationId: org.id, userId },
    });
    if (!attempt) throw new NotFoundException("SCORM attempt not found");
    return this.prisma.scormAttempt.update({
      where: { id: attemptId },
      data: {
        status: dto.status,
        completion: dto.completion,
        success: dto.success,
        scoreRaw: dto.scoreRaw,
        scoreMin: dto.scoreMin,
        scoreMax: dto.scoreMax,
        cmiData: (dto.cmiData ?? attempt.cmiData) as any,
        finishedAt: dto.finalize ? new Date() : attempt.finishedAt,
      },
    });
  }

  async listScormAttempts(org: OrganizationContext, packageId: string) {
    if (!(await this.canManage(org))) throw new ForbiddenException("Not allowed");
    return this.prisma.scormAttempt.findMany({
      where: { organizationId: org.id, packageId },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
  }

  // ── H5P ──────────────────────────────────────────
  async listH5PContent(org: OrganizationContext, courseId?: string) {
    return this.prisma.h5PContent.findMany({
      where: { organizationId: org.id, courseId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getH5PContent(org: OrganizationContext, id: string) {
    const content = await this.prisma.h5PContent.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!content) throw new NotFoundException("H5P content not found");
    return content;
  }

  async createH5PContent(org: OrganizationContext, dto: CreateH5PContentDto) {
    await this.ensureCourse(org, dto.courseId);
    if (!(await this.canManage(org, dto.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.h5PContent.create({
      data: {
        organizationId: org.id,
        courseId: dto.courseId,
        activityId: dto.activityId,
        library: dto.library,
        title: dto.title,
        params: (dto.params ?? {}) as any,
        metadata: (dto.metadata ?? {}) as any,
        fileId: dto.fileId,
      },
    });
  }

  async updateH5PContent(org: OrganizationContext, id: string, dto: UpdateH5PContentDto) {
    const content = await this.getH5PContent(org, id);
    if (!(await this.canManage(org, content.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.h5PContent.update({
      where: { id },
      data: {
        title: dto.title,
        params: dto.params as any,
        metadata: dto.metadata as any,
        status: dto.status,
      },
    });
  }

  async deleteH5PContent(org: OrganizationContext, id: string) {
    const content = await this.getH5PContent(org, id);
    if (!(await this.canManage(org, content.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.h5PContent.delete({ where: { id } });
    return { deleted: true };
  }

  async submitH5PResult(org: OrganizationContext, userId: string, contentId: string, dto: SubmitH5PResultDto) {
    const content = await this.getH5PContent(org, contentId);
    await this.ensureEnrolled(org, userId, content.courseId);
    return this.prisma.h5PResult.create({
      data: {
        organizationId: org.id,
        contentId,
        userId,
        score: dto.score,
        maxScore: dto.maxScore,
        completion: dto.completion ?? "INCOMPLETE",
        success: dto.success ?? "UNKNOWN",
        raw: (dto.raw ?? {}) as any,
      },
    });
  }

  async listH5PResults(org: OrganizationContext, contentId: string) {
    const content = await this.getH5PContent(org, contentId);
    if (!(await this.canManage(org, content.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.h5PResult.findMany({
      where: { organizationId: org.id, contentId },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });
  }

  // ── xAPI ─────────────────────────────────────────
  async postXapiStatements(org: OrganizationContext, userId: string, statements: Array<Record<string, unknown>>) {
    if (!Array.isArray(statements) || statements.length === 0) {
      throw new BadRequestException("statements must be a non-empty array");
    }
    const stored = await Promise.all(
      statements.map((stmt) =>
        this.prisma.xapiStatement.create({
          data: {
            organizationId: org.id,
            actor: (stmt.actor ?? { userId }) as any,
            verb: (stmt.verb ?? { id: "http://adlnet.gov/expapi/verbs/experienced" }) as any,
            object: (stmt.object ?? {}) as any,
            result: stmt.result as any,
            context: stmt.context as any,
            authority: stmt.authority as any,
            timestamp: stmt.timestamp ? new Date(String(stmt.timestamp)) : null,
          },
        }),
      ),
    );
    return { stored: stored.length, ids: stored.map((s) => s.id) };
  }

  async listXapiStatements(org: OrganizationContext, limit = 50) {
    if (!(await this.canManage(org))) throw new ForbiddenException("Not allowed");
    return this.prisma.xapiStatement.findMany({
      where: { organizationId: org.id },
      orderBy: { stored: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async getXapiState(org: OrganizationContext, activityId: string, stateId: string, agent: Record<string, unknown>) {
    const state = await this.prisma.xapiActivityState.findUnique({
      where: {
        organizationId_activityId_agent_stateId: {
          organizationId: org.id,
          activityId,
          agent: agent as any,
          stateId,
        },
      },
    });
    return state ? state.state : null;
  }

  async putXapiState(org: OrganizationContext, dto: PutXapiStateDto) {
    return this.prisma.xapiActivityState.upsert({
      where: {
        organizationId_activityId_agent_stateId: {
          organizationId: org.id,
          activityId: dto.activityId,
          agent: dto.agent as any,
          stateId: dto.stateId,
        },
      },
      create: {
        organizationId: org.id,
        activityId: dto.activityId,
        agent: dto.agent as any,
        stateId: dto.stateId,
        state: dto.state as any,
      },
      update: { state: dto.state as any },
    });
  }

  async deleteXapiState(org: OrganizationContext, activityId: string, stateId: string, agent: Record<string, unknown>) {
    await this.prisma.xapiActivityState.deleteMany({
      where: { organizationId: org.id, activityId, stateId, agent: agent as any },
    });
    return { deleted: true };
  }

  // ── Survey ───────────────────────────────────────
  async listSurveys(org: OrganizationContext, courseId?: string, status?: string) {
    return this.prisma.survey.findMany({
      where: { organizationId: org.id, courseId, status },
      include: { _count: { select: { questions: true, responses: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getSurvey(org: OrganizationContext, id: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id, organizationId: org.id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!survey) throw new NotFoundException("Survey not found");
    return survey;
  }

  async createSurvey(org: OrganizationContext, userId: string, dto: CreateSurveyDto) {
    if (!(await this.canManage(org, dto.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.survey.create({
      data: {
        organizationId: org.id,
        courseId: dto.courseId,
        activityId: dto.activityId,
        title: dto.title,
        description: dto.description,
        anonymous: dto.anonymous ?? false,
        allowMultipleSubmissions: dto.allowMultipleSubmissions ?? false,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        questions: dto.questions
          ? { create: dto.questions.map((q, idx) => this.normalizeQuestion(q, idx)) }
          : undefined,
      },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
  }

  private normalizeQuestion(q: Partial<CreateSurveyQuestionDto>, idx: number) {
    return {
      type: q.type ?? "SHORT_TEXT",
      prompt: q.prompt ?? "",
      helpText: q.helpText,
      required: q.required ?? false,
      orderIndex: q.orderIndex ?? idx,
      options: (q.options ?? []) as any,
      scale: q.scale as any,
    };
  }

  async updateSurvey(org: OrganizationContext, id: string, dto: UpdateSurveyDto) {
    const survey = await this.getSurvey(org, id);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.survey.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        anonymous: dto.anonymous,
        allowMultipleSubmissions: dto.allowMultipleSubmissions,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
      },
    });
  }

  async deleteSurvey(org: OrganizationContext, id: string) {
    const survey = await this.getSurvey(org, id);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.survey.delete({ where: { id } });
    return { deleted: true };
  }

  async addSurveyQuestion(org: OrganizationContext, surveyId: string, dto: CreateSurveyQuestionDto) {
    const survey = await this.getSurvey(org, surveyId);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    const last = await this.prisma.surveyQuestion.findFirst({
      where: { surveyId },
      orderBy: { orderIndex: "desc" },
    });
    return this.prisma.surveyQuestion.create({
      data: {
        ...this.normalizeQuestion(dto, (last?.orderIndex ?? -1) + 1),
        surveyId,
      },
    });
  }

  async removeSurveyQuestion(org: OrganizationContext, surveyId: string, questionId: string) {
    const survey = await this.getSurvey(org, surveyId);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.surveyAnswer.deleteMany({ where: { questionId } });
    await this.prisma.surveyQuestion.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  async submitSurveyResponse(
    org: OrganizationContext,
    userId: string | null,
    surveyId: string,
    dto: SubmitSurveyResponseDto,
  ) {
    const survey = await this.getSurvey(org, surveyId);
    if (survey.status !== "PUBLISHED") {
      throw new BadRequestException("Survey is not accepting responses");
    }
    const userKey = survey.anonymous ? null : userId;
    if (!survey.allowMultipleSubmissions && !survey.anonymous && userId) {
      const existing = await this.prisma.surveyResponse.findFirst({
        where: { organizationId: org.id, surveyId, userId },
      });
      if (existing) throw new BadRequestException("You have already responded to this survey");
    }
    const validQuestionIds = new Set(survey.questions.map((q) => q.id));
    for (const answer of dto.answers) {
      if (!validQuestionIds.has(answer.questionId)) {
        throw new BadRequestException(`Invalid questionId: ${answer.questionId}`);
      }
    }
    const response = await this.prisma.surveyResponse.create({
      data: {
        organizationId: org.id,
        surveyId,
        userId: userKey,
        metadata: (dto.metadata ?? {}) as any,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            value: a.value as any,
            textValue: typeof a.value === "string" ? a.value : a.textValue,
          })),
        },
      },
      include: { answers: true },
    });
    return response;
  }

  async listSurveyResponses(org: OrganizationContext, surveyId: string) {
    const survey = await this.getSurvey(org, surveyId);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.surveyResponse.findMany({
      where: { organizationId: org.id, surveyId },
      include: { answers: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { submittedAt: "desc" },
      take: 500,
    });
  }

  async exportSurveyResponsesCsv(org: OrganizationContext, surveyId: string) {
    const survey = await this.getSurvey(org, surveyId);
    if (!(await this.canManage(org, survey.courseId))) throw new ForbiddenException("Not allowed");
    const responses = await this.prisma.surveyResponse.findMany({
      where: { organizationId: org.id, surveyId },
      include: { answers: true, user: { select: { id: true, name: true, email: true } } },
    });
    const header = ["response_id", "submitted_at", "user_email", ...survey.questions.map((q) => q.prompt)];
    const rows = responses.map((response) => {
      const answerMap = new Map(response.answers.map((a) => [a.questionId, a]));
      return [
        response.id,
        response.submittedAt.toISOString(),
        response.user?.email ?? "",
        ...survey.questions.map((q) => {
          const a = answerMap.get(q.id);
          if (!a) return "";
          if (typeof a.value === "string") return a.value;
          return JSON.stringify(a.value);
        }),
      ].map((cell) => csvEscape(String(cell ?? "")));
    });
    return [header.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  // ── Poll ─────────────────────────────────────────
  async listPolls(org: OrganizationContext, courseId?: string, status?: string) {
    return this.prisma.poll.findMany({
      where: { organizationId: org.id, courseId, status },
      include: { _count: { select: { votes: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getPoll(org: OrganizationContext, id: string) {
    const poll = await this.prisma.poll.findFirst({ where: { id, organizationId: org.id } });
    if (!poll) throw new NotFoundException("Poll not found");
    return poll;
  }

  async createPoll(org: OrganizationContext, dto: CreatePollDto) {
    if (dto.courseId) await this.ensureCourse(org, dto.courseId);
    if (!(await this.canManage(org, dto.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.poll.create({
      data: {
        organizationId: org.id,
        courseId: dto.courseId,
        activityId: dto.activityId,
        question: dto.question,
        options: dto.options as any,
        allowMultiple: dto.allowMultiple ?? false,
        anonymous: dto.anonymous ?? false,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
      },
    });
  }

  async updatePoll(org: OrganizationContext, id: string, dto: UpdatePollDto) {
    const poll = await this.getPoll(org, id);
    if (!(await this.canManage(org, poll.courseId))) throw new ForbiddenException("Not allowed");
    return this.prisma.poll.update({
      where: { id },
      data: {
        question: dto.question,
        options: dto.options as any,
        allowMultiple: dto.allowMultiple,
        status: dto.status,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
      },
    });
  }

  async deletePoll(org: OrganizationContext, id: string) {
    const poll = await this.getPoll(org, id);
    if (!(await this.canManage(org, poll.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.poll.delete({ where: { id } });
    return { deleted: true };
  }

  async votePoll(org: OrganizationContext, userId: string | null, pollId: string, dto: VotePollDto) {
    const poll = await this.getPoll(org, pollId);
    if (poll.status !== "ACTIVE") throw new BadRequestException("Poll is not active");
    const userKey = poll.anonymous ? null : userId;
    return this.prisma.pollVote.upsert({
      where: {
        organizationId_pollId_userId: { organizationId: org.id, pollId, userId: userKey ?? "__anon__" },
      },
      create: {
        organizationId: org.id,
        pollId,
        userId: userKey,
        selected: dto.selected as any,
      },
      update: { selected: dto.selected as any, votedAt: new Date() },
    });
  }

  async pollResults(org: OrganizationContext, pollId: string) {
    const poll = await this.getPoll(org, pollId);
    const votes = await this.prisma.pollVote.findMany({
      where: { organizationId: org.id, pollId },
    });
    const options = (poll.options as Array<{ id: string; label: string }>) ?? [];
    const counts: Record<string, number> = {};
    for (const opt of options) counts[opt.id] = 0;
    for (const vote of votes) {
      const selected = Array.isArray(vote.selected) ? (vote.selected as string[]) : [];
      for (const optId of selected) {
        if (optId in counts) {
          counts[optId] = (counts[optId] ?? 0) + 1;
        }
      }
    }
    return {
      poll,
      totalVotes: votes.length,
      options: options.map((opt) => ({ id: opt.id, label: opt.label, votes: counts[opt.id] ?? 0 })),
    };
  }

  // ── Course Feedback ──────────────────────────────
  async submitCourseFeedback(org: OrganizationContext, userId: string | null, dto: SubmitCourseFeedbackDto) {
    await this.ensureCourse(org, dto.courseId);
    return this.prisma.courseFeedback.create({
      data: {
        organizationId: org.id,
        courseId: dto.courseId,
        userId,
        rating: dto.rating,
        comment: dto.comment,
        metadata: (dto.metadata ?? {}) as any,
      },
    });
  }

  async listCourseFeedback(
    org: OrganizationContext,
    courseId: string,
    query: { page?: number; limit?: number } = {},
  ) {
    if (!(await this.canManage(org, courseId))) throw new ForbiddenException("Not allowed");
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const where = { organizationId: org.id, courseId };
    const [data, total, aggregate] = await Promise.all([
      this.prisma.courseFeedback.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.courseFeedback.count({ where }),
      this.prisma.courseFeedback.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);
    return {
      data,
      meta: pageMeta(page, limit, total),
      average: aggregate._avg.rating ?? 0,
      totalFeedback: aggregate._count.rating,
    };
  }

  async exportCourseFeedbackCsv(org: OrganizationContext, courseId: string) {
    if (!(await this.canManage(org, courseId))) throw new ForbiddenException("Not allowed");
    const rows = await this.prisma.courseFeedback.findMany({
      where: { organizationId: org.id, courseId },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 5000,
      orderBy: { submittedAt: "desc" },
    });
    const header = ["feedback_id", "submitted_at", "user_email", "rating", "comment"];
    const data = rows.map((row) => [
      row.id,
      row.submittedAt.toISOString(),
      row.user?.email ?? "",
      String(row.rating),
      row.comment ?? "",
    ]);
    return [header.map(csvEscape).join(","), ...data.map((r) => r.map(csvEscape).join(","))].join("\n");
  }
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
