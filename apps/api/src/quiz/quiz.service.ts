import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import { ensureEnrollment } from "../common/enrollment/ensure-enrollment";
import { recalculateEnrollment } from "../common/enrollment/course-progress";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
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

type QuestionWithOptions = Prisma.QuestionGetPayload<{
  include: { options: true };
}>;

type QuizForGrading = Prisma.QuizGetPayload<{
  include: {
    questions: { include: { question: { include: { options: true } } } };
  };
}>;

@Injectable()
export class QuizService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listQuestionBanks(organization: OrganizationContext, userId: string) {
    return this.prisma.questionBank.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        ...(organization.isPlatformAdmin
          ? {}
          : {
              OR: [
                { ownerId: userId },
                { courseId: null },
                {
                  course: {
                    instructors: { some: { organizationId: organization.id, userId } },
                  },
                },
              ],
            }),
      },
      include: { course: true, _count: { select: { questions: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createQuestionBank(
    organization: OrganizationContext,
    userId: string,
    dto: CreateQuestionBankDto,
  ) {
    if (dto.courseId) {
      await this.ensureCanManageCourse(organization, userId, dto.courseId);
    }
    return this.prisma.questionBank.create({
      data: {
        organizationId: organization.id,
        ownerId: userId,
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async updateQuestionBank(
    organization: OrganizationContext,
    userId: string,
    bankId: string,
    dto: UpdateQuestionBankDto,
  ) {
    await this.ensureCanManageQuestionBank(organization, userId, bankId);
    if (dto.courseId) {
      await this.ensureCanManageCourse(organization, userId, dto.courseId);
    }
    return this.prisma.questionBank.update({
      where: { id: bankId },
      data: {
        title: dto.title,
        description: dto.description,
        courseId: dto.courseId,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async deleteQuestionBank(
    organization: OrganizationContext,
    userId: string,
    bankId: string,
  ) {
    await this.ensureCanManageQuestionBank(organization, userId, bankId);
    return this.prisma.questionBank.update({
      where: { id: bankId },
      data: { deletedAt: new Date() },
    });
  }

  async listQuestions(
    organization: OrganizationContext,
    userId: string,
    bankId?: string,
  ) {
    if (bankId) {
      await this.ensureCanManageQuestionBank(organization, userId, bankId);
    }
    return this.prisma.question.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        questionBankId: bankId,
      },
      include: { options: { orderBy: { orderIndex: "asc" } }, bank: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createQuestion(
    organization: OrganizationContext,
    userId: string,
    dto: CreateQuestionDto,
  ) {
    await this.ensureCanManageQuestionBank(
      organization,
      userId,
      dto.questionBankId,
    );
    this.validateQuestionPayload(dto);
    return this.prisma.question.create({
      data: {
        organizationId: organization.id,
        questionBankId: dto.questionBankId,
        createdById: userId,
        type: dto.type,
        prompt: dto.prompt,
        explanation: dto.explanation,
        points: dto.points ?? 1,
        acceptedAnswers: (dto.acceptedAnswers ?? []) as Prisma.InputJsonArray,
        numericTolerance: dto.numericTolerance,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
        options: dto.options?.length
          ? {
              create: dto.options.map((option, index) => ({
                text: option.text,
                isCorrect: option.isCorrect ?? false,
                orderIndex: option.orderIndex ?? index,
                feedback: option.feedback,
              })),
            }
          : undefined,
      },
      include: { options: { orderBy: { orderIndex: "asc" } } },
    });
  }

  async updateQuestion(
    organization: OrganizationContext,
    userId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    const question = await this.getQuestion(organization.id, questionId);
    await this.ensureCanManageQuestionBank(
      organization,
      userId,
      question.questionBankId,
    );
    const nextType = dto.type ?? question.type;
    this.validateQuestionPayload({
      ...dto,
      type: nextType,
      prompt: dto.prompt ?? question.prompt,
      options: dto.options ?? question.options,
    });

    // ponytail: fork when used in published quiz so live attempts keep old stem
    if (await this.isQuestionLockedInPublishedQuiz(organization.id, questionId)) {
      if (dto.questionBankId && dto.questionBankId !== question.questionBankId) {
        throw new BadRequestException(
          "Cannot move a question that is used in a published quiz; edit creates a copy instead",
        );
      }
      const forked = await this.prisma.question.create({
        data: {
          organizationId: organization.id,
          questionBankId: question.questionBankId,
          createdById: userId,
          type: nextType,
          prompt: dto.prompt ?? question.prompt,
          explanation:
            dto.explanation !== undefined ? dto.explanation : question.explanation,
          points: dto.points ?? question.points,
          acceptedAnswers: (dto.acceptedAnswers ??
            (question.acceptedAnswers as string[])) as Prisma.InputJsonArray,
          numericTolerance:
            dto.numericTolerance !== undefined
              ? dto.numericTolerance
              : question.numericTolerance,
          metadata: {
            ...((question.metadata ?? {}) as Record<string, unknown>),
            ...((dto.metadata ?? {}) as Record<string, unknown>),
            forkedFrom: questionId,
            forkedAt: new Date().toISOString(),
          } as Prisma.InputJsonObject,
          options: {
            create: (
              dto.options ??
              question.options.map((o) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                orderIndex: o.orderIndex,
                feedback: o.feedback ?? undefined,
              }))
            ).map((option, index) => ({
              text: option.text,
              isCorrect: option.isCorrect ?? false,
              orderIndex: option.orderIndex ?? index,
              feedback: option.feedback,
            })),
          },
        },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      });
      return { ...forked, forkedFrom: questionId };
    }

    if (dto.options) {
      await this.prisma.questionOption.deleteMany({ where: { questionId } });
    }
    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        questionBankId: dto.questionBankId,
        type: dto.type,
        prompt: dto.prompt,
        explanation: dto.explanation,
        points: dto.points,
        acceptedAnswers: dto.acceptedAnswers as Prisma.InputJsonArray | undefined,
        numericTolerance: dto.numericTolerance,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
        options: dto.options?.length
          ? {
              create: dto.options.map((option, index) => ({
                text: option.text,
                isCorrect: option.isCorrect ?? false,
                orderIndex: option.orderIndex ?? index,
                feedback: option.feedback,
              })),
            }
          : undefined,
      },
      include: { options: { orderBy: { orderIndex: "asc" } } },
    });
  }

  async deleteQuestion(
    organization: OrganizationContext,
    userId: string,
    questionId: string,
  ) {
    const question = await this.getQuestion(organization.id, questionId);
    await this.ensureCanManageQuestionBank(
      organization,
      userId,
      question.questionBankId,
    );
    if (await this.isQuestionLockedInPublishedQuiz(organization.id, questionId)) {
      throw new BadRequestException(
        "Cannot delete a question used in a published quiz",
      );
    }
    return this.prisma.question.update({
      where: { id: questionId },
      data: { deletedAt: new Date() },
    });
  }

  listQuizzes(organization: OrganizationContext, userId: string) {
    return this.prisma.quiz.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        ...(organization.isPlatformAdmin
          ? {}
          : {
              OR: [
                { createdById: userId },
                {
                  course: {
                    instructors: { some: { organizationId: organization.id, userId } },
                  },
                },
              ],
            }),
      },
      include: {
        activity: true,
        course: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getInstructorQuiz(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
  ) {
    const quiz = await this.getQuiz(organization.id, quizId);
    await this.ensureCanManageQuiz(organization, userId, quiz.id);
    return this.prisma.quiz.findFirstOrThrow({
      where: { id: quizId, organizationId: organization.id },
      include: {
        activity: true,
        course: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: { include: { options: { orderBy: { orderIndex: "asc" } } } },
          },
        },
      },
    });
  }

  async createQuiz(
    organization: OrganizationContext,
    userId: string,
    dto: CreateQuizDto,
  ) {
    if (dto.courseId) {
      await this.ensureCanManageCourse(organization, userId, dto.courseId);
    }
    const activity = dto.activityId
      ? await this.ensureCanManageActivity(organization, userId, dto.activityId)
      : null;
    const quiz = await this.prisma.quiz.create({
      data: {
        organizationId: organization.id,
        createdById: userId,
        courseId: dto.courseId ?? activity?.courseId,
        activityId: dto.activityId,
        title: dto.title,
        description: dto.description,
        passingScorePercent: dto.passingScorePercent ?? 70,
        attemptLimit: dto.attemptLimit ?? 1,
        timeLimitMinutes: dto.timeLimitMinutes,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        showCorrectAnswers: dto.showCorrectAnswers ?? false,
        showFeedback: dto.showFeedback ?? true,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    if (activity) {
      await this.attachQuizToActivity(organization, userId, activity.id, {
        quizId: quiz.id,
      });
    }
    return quiz;
  }

  async updateQuiz(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
    dto: UpdateQuizDto,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    if (dto.courseId) {
      await this.ensureCanManageCourse(organization, userId, dto.courseId);
    }
    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: dto.title,
        description: dto.description,
        courseId: dto.courseId,
        status: dto.status,
        passingScorePercent: dto.passingScorePercent,
        attemptLimit: dto.attemptLimit,
        timeLimitMinutes: dto.timeLimitMinutes,
        shuffleQuestions: dto.shuffleQuestions,
        showCorrectAnswers: dto.showCorrectAnswers,
        showFeedback: dto.showFeedback,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async publishQuiz(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    const quiz = await this.getQuiz(organization.id, quizId);
    const questionCount = await this.prisma.quizQuestion.count({
      where: { quizId },
    });
    const poolCount = this.readRandomPools(quiz.metadata).reduce(
      (sum, p) => sum + p.count,
      0,
    );
    if (!questionCount && !poolCount) {
      throw new BadRequestException(
        "Quiz must have at least one fixed question or random pool",
      );
    }
    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  async addQuestion(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
    dto: AddQuizQuestionDto,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    const question = await this.getQuestion(organization.id, dto.questionId);
    const orderIndex =
      dto.orderIndex ??
      (await this.prisma.quizQuestion.count({ where: { quizId } }));
    return this.prisma.quizQuestion.upsert({
      where: { quizId_questionId: { quizId, questionId: question.id } },
      update: {
        points: dto.points,
        orderIndex,
      },
      create: {
        quizId,
        questionId: question.id,
        points: dto.points,
        orderIndex,
      },
    });
  }

  async removeQuestion(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
    questionId: string,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    return this.prisma.quizQuestion.delete({
      where: { quizId_questionId: { quizId, questionId } },
    });
  }

  async reorderQuestions(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
    dto: ReorderQuizQuestionsDto,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    await Promise.all(
      dto.ids.map((id, orderIndex) =>
        this.prisma.quizQuestion.updateMany({
          where: { id, quizId },
          data: { orderIndex },
        }),
      ),
    );
    return this.getInstructorQuiz(organization, userId, quizId);
  }

  async attachQuizToActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: AttachQuizDto,
  ) {
    const activity = await this.ensureCanManageActivity(
      organization,
      userId,
      activityId,
    );
    await this.ensureCanManageQuiz(organization, userId, dto.quizId);
    const quiz = await this.prisma.quiz.update({
      where: { id: dto.quizId },
      data: {
        activityId,
        courseId: activity.courseId,
      },
    });
    await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        activityTypeKey: "core.quiz",
        pluginKey: "core.quiz",
        pluginVersion: "1.0.0",
        completionRule: { type: "quiz", quizId: quiz.id, passingRequired: true },
        gradingRule: {
          type: "quiz",
          passingScorePercent: quiz.passingScorePercent,
        },
        assessmentDisplayPolicy: {
          allowPopout: false,
          allowDualWindow: false,
          allowAIAssistant: false,
          allowNotes: true,
          allowTranscript: false,
          requireFocusMode: false,
          detectTabSwitch: false,
        },
      },
    });
    await this.audit(organization.id, userId, "quiz.attached", quiz.id);
    return quiz;
  }

  async getLearnerQuiz(
    organizationId: string,
    userId: string,
    activityId: string,
  ) {
    const quiz = await this.getPublishedQuizForActivity(
      organizationId,
      userId,
      activityId,
    );
    const lastAttempt = await this.prisma.quizAttempt.findFirst({
      where: { organizationId, quizId: quiz.id, userId },
      orderBy: { attemptNumber: "desc" },
      include: { answers: true },
    });
    const questionOrder =
      lastAttempt?.status === "IN_PROGRESS"
        ? this.readQuestionOrder(lastAttempt.metadata)
        : undefined;
    const learnerQuestions = questionOrder?.length
      ? await this.resolveAttemptQuestions(organizationId, quiz, questionOrder)
      : null;
    return {
      quiz: this.sanitizeQuizForLearner(quiz, {
        attemptQuestions: learnerQuestions ?? undefined,
        includePools: !learnerQuestions,
      }),
      lastAttempt,
    };
  }

  async startAttempt(
    organizationId: string,
    userId: string,
    activityId: string,
  ) {
    const quiz = await this.getPublishedQuizForActivity(
      organizationId,
      userId,
      activityId,
    );
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { organizationId, quizId: quiz.id, userId },
      orderBy: { attemptNumber: "desc" },
      take: 1,
    });
    const latest = attempts[0];
    if (latest?.status === "IN_PROGRESS") {
      return latest;
    }
    const attemptNumber = (latest?.attemptNumber ?? 0) + 1;
    if (attemptNumber > quiz.attemptLimit) {
      throw new ForbiddenException("Quiz attempt limit reached");
    }
    const now = new Date();
    const dueAt = quiz.timeLimitMinutes
      ? new Date(now.getTime() + quiz.timeLimitMinutes * 60_000)
      : null;

    const selection = await this.buildAttemptQuestionSelection(
      organizationId,
      quiz,
    );

    return this.prisma.quizAttempt.create({
      data: {
        organizationId,
        quizId: quiz.id,
        activityId,
        courseId: quiz.courseId,
        userId,
        attemptNumber,
        dueAt,
        maxScore: selection.maxScore,
        metadata: {
          questionOrder: selection.questionOrder,
          poolPicks: selection.poolPicks,
        } as Prisma.InputJsonObject,
      },
    });
  }

  async saveAnswer(
    organizationId: string,
    userId: string,
    attemptId: string,
    dto: SaveQuizAnswerDto,
  ) {
    const attempt = await this.getOwnAttempt(organizationId, userId, attemptId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new ForbiddenException("Submitted attempts are immutable");
    }
    this.assertAttemptStillOpen(attempt);
    const order = this.readQuestionOrder(attempt.metadata);
    if (order?.length && !order.includes(dto.questionId)) {
      throw new NotFoundException("Question not in this attempt");
    }

    const fixed = await this.prisma.quizQuestion.findFirst({
      where: { quizId: attempt.quizId, questionId: dto.questionId },
      include: { question: true },
    });
    let maxPoints: number;
    if (fixed) {
      maxPoints = fixed.points ?? fixed.question.points;
    } else {
      // Random-pool pick: question not permanently on quiz
      const question = await this.getQuestion(organizationId, dto.questionId);
      maxPoints = question.points;
    }
    return this.prisma.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: dto.questionId,
        },
      },
      update: {
        selectedOptionIds: (dto.selectedOptionIds ?? []) as Prisma.InputJsonArray,
        textAnswer: dto.textAnswer,
        numericAnswer: dto.numericAnswer,
        maxPoints,
        status: "NOT_GRADED",
      },
      create: {
        organizationId,
        attemptId,
        questionId: dto.questionId,
        selectedOptionIds: (dto.selectedOptionIds ?? []) as Prisma.InputJsonArray,
        textAnswer: dto.textAnswer,
        numericAnswer: dto.numericAnswer,
        maxPoints,
      },
    });
  }

  async submitAttempt(organizationId: string, userId: string, attemptId: string) {
    const attempt = await this.getOwnAttempt(organizationId, userId, attemptId);
    if (attempt.status !== "IN_PROGRESS") return this.result(organizationId, userId, attemptId);
    const quiz = await this.getQuizForGrading(organizationId, attempt.quizId);
    const order = this.readQuestionOrder(attempt.metadata);
    const gradeTargets = await this.resolveAttemptQuestions(organizationId, quiz, order);
    const answers = await this.prisma.quizAnswer.findMany({
      where: { organizationId, attemptId },
    });
    const answersByQuestion = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );
    const graded = await Promise.all(
      gradeTargets.map(async (target) => {
        const answer = answersByQuestion.get(target.questionId);
        const grade = this.gradeAnswer(
          target.question,
          target.points,
          answer,
        );
        return this.prisma.quizAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: target.questionId,
            },
          },
          update: grade,
          create: {
            organizationId,
            attemptId,
            questionId: target.questionId,
            selectedOptionIds: [],
            ...grade,
          },
        });
      }),
    );
    const summary = this.scoreSummaryFromAnswers(quiz.passingScorePercent, graded);
    const needsManual = graded.some((answer) => answer.status === "NEEDS_MANUAL_GRADING");
    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: needsManual ? "NEEDS_MANUAL_GRADING" : "SUBMITTED",
        submittedAt: new Date(),
        gradedAt: needsManual ? null : new Date(),
        ...summary,
      },
    });
    if (!needsManual && updated.passed && updated.activityId && updated.courseId) {
      await this.completeQuizActivity(organizationId, userId, updated.activityId, updated.courseId);
    } else if (updated.activityId) {
      await this.markQuizInProgress(organizationId, userId, updated);
    }
    await this.audit(organizationId, userId, "quiz_attempt.submitted", attemptId);
    return this.result(organizationId, userId, attemptId);
  }

  async result(organizationId: string, userId: string, attemptId: string) {
    const attempt = await this.getOwnAttempt(organizationId, userId, attemptId);
    const quiz = await this.prisma.quiz.findFirstOrThrow({
      where: { id: attempt.quizId, organizationId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { question: { include: { options: { orderBy: { orderIndex: "asc" } } } } },
        },
      },
    });
    const answers = await this.prisma.quizAnswer.findMany({
      where: { organizationId, attemptId },
    });
    const questionOrder = this.readQuestionOrder(attempt.metadata);
    const attemptQuestions = await this.resolveAttemptQuestions(
      organizationId,
      quiz,
      questionOrder,
    );
    return {
      attempt,
      quiz: this.sanitizeQuizForLearner(quiz, {
        revealCorrect: quiz.showCorrectAnswers,
        revealFeedback: quiz.showFeedback,
        attemptQuestions,
      }),
      answers: answers.map((answer) => ({
        ...answer,
        isCorrect: quiz.showCorrectAnswers ? answer.isCorrect : undefined,
        feedback: quiz.showFeedback ? answer.feedback : undefined,
      })),
    };
  }

  async listAttempts(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
  ) {
    await this.ensureCanManageQuiz(organization, userId, quizId);
    return this.prisma.quizAttempt.findMany({
      where: { organizationId: organization.id, quizId },
      include: { user: true },
      orderBy: { startedAt: "desc" },
    });
  }

  async listMyAttempts(organizationId: string, userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { organizationId, userId },
      include: { quiz: true },
      orderBy: { startedAt: "desc" },
    });
  }

  async attemptDetail(
    organization: OrganizationContext,
    userId: string,
    attemptId: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, organizationId: organization.id },
      include: {
        user: true,
        quiz: true,
        answers: { include: { question: { include: { options: true } } } },
      },
    });
    if (!attempt) throw new NotFoundException("Attempt not found");
    await this.ensureCanManageQuiz(organization, userId, attempt.quizId);
    return attempt;
  }

  async manualGradeAnswer(
    organization: OrganizationContext,
    userId: string,
    answerId: string,
    dto: ManualGradeAnswerDto,
  ) {
    const answer = await this.prisma.quizAnswer.findFirst({
      where: { id: answerId, organizationId: organization.id },
      include: { attempt: true, question: true },
    });
    if (!answer) throw new NotFoundException("Answer not found");
    await this.ensureCanManageQuiz(organization, userId, answer.attempt.quizId);
    const maxPoints = answer.maxPoints || answer.question.points;
    const updated = await this.prisma.quizAnswer.update({
      where: { id: answerId },
      data: {
        pointsAwarded: Math.min(dto.pointsAwarded, maxPoints),
        maxPoints,
        isCorrect: dto.pointsAwarded >= maxPoints,
        status:
          dto.pointsAwarded >= maxPoints
            ? "CORRECT"
            : dto.pointsAwarded > 0
              ? "PARTIALLY_CORRECT"
              : "INCORRECT",
        feedback: dto.feedback,
        gradedById: userId,
        gradedAt: new Date(),
      },
    });
    await this.recalculateAttemptAfterManualGrade(organization.id, userId, answer.attemptId);
    return updated;
  }

  private validateQuestionPayload(input: {
    type: string;
    prompt: string;
    options?: Array<{ isCorrect?: boolean }>;
    acceptedAnswers?: string[];
  }) {
    if (!input.prompt?.trim()) {
      throw new BadRequestException("Question prompt is required");
    }
    if (["MULTIPLE_CHOICE", "MULTIPLE_ANSWER", "TRUE_FALSE"].includes(input.type)) {
      const correctCount = input.options?.filter((option) => option.isCorrect).length ?? 0;
      if (correctCount < 1) {
        throw new BadRequestException("Auto-graded choice questions need a correct option");
      }
    }
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: organization.id, deletedAt: null },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (organization.isPlatformAdmin || organization.permissionKeys.includes("courses:update")) {
      return course;
    }
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, courseId, userId },
    });
    if (!instructor) throw new ForbiddenException("Insufficient course permissions");
    return course;
  }

  private async ensureCanManageActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId: organization.id },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    await this.ensureCanManageCourse(organization, userId, activity.courseId);
    return activity;
  }

  private async ensureCanManageQuestionBank(
    organization: OrganizationContext,
    userId: string,
    bankId: string,
  ) {
    const bank = await this.prisma.questionBank.findFirst({
      where: { id: bankId, organizationId: organization.id, deletedAt: null },
    });
    if (!bank) throw new NotFoundException("Question bank not found");
    if (organization.isPlatformAdmin || bank.ownerId === userId) return bank;
    if (organization.permissionKeys.includes("quiz:manage")) return bank;
    if (bank.courseId) {
      await this.ensureCanManageCourse(organization, userId, bank.courseId);
      return bank;
    }
    throw new ForbiddenException("Insufficient question bank permissions");
  }

  private async ensureCanManageQuiz(
    organization: OrganizationContext,
    userId: string,
    quizId: string,
  ) {
    const quiz = await this.getQuiz(organization.id, quizId);
    if (organization.isPlatformAdmin || quiz.createdById === userId) return quiz;
    if (organization.permissionKeys.includes("quiz:manage")) return quiz;
    if (quiz.courseId) {
      await this.ensureCanManageCourse(organization, userId, quiz.courseId);
      return quiz;
    }
    throw new ForbiddenException("Insufficient quiz permissions");
  }

  private async getQuestion(organizationId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, organizationId, deletedAt: null },
      include: { options: true },
    });
    if (!question) throw new NotFoundException("Question not found");
    return question;
  }

  private async getQuiz(organizationId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, organizationId, deletedAt: null },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  private async getPublishedQuizForActivity(
    organizationId: string,
    userId: string,
    activityId: string,
  ): Promise<QuizForGrading> {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        organizationId,
        activityId,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { question: { include: { options: { orderBy: { orderIndex: "asc" } } } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    if (!quiz.courseId) throw new NotFoundException("Quiz course is not configured");
    await this.ensureEnrollment(organizationId, userId, quiz.courseId);
    return quiz;
  }

  private async getQuizForGrading(
    organizationId: string,
    quizId: string,
  ): Promise<QuizForGrading> {
    return this.prisma.quiz.findFirstOrThrow({
      where: { id: quizId, organizationId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { question: { include: { options: { orderBy: { orderIndex: "asc" } } } } },
        },
      },
    });
  }

  private ensureEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    return ensureEnrollment(this.prisma, organizationId, userId, courseId);
  }

  private async getOwnAttempt(
    organizationId: string,
    userId: string,
    attemptId: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, organizationId, userId },
    });
    if (!attempt) throw new NotFoundException("Quiz attempt not found");
    return attempt;
  }

  private assertAttemptStillOpen(attempt: { dueAt?: Date | null }) {
    if (attempt.dueAt && attempt.dueAt.getTime() < Date.now()) {
      throw new ForbiddenException("Quiz attempt time limit has expired");
    }
  }

  private gradeAnswer(
    question: QuestionWithOptions,
    maxPoints: number,
    answer?: { selectedOptionIds: Prisma.JsonValue; textAnswer?: string | null; numericAnswer?: number | null } | null,
  ) {
    if (question.type === "ESSAY") {
      return {
        maxPoints,
        pointsAwarded: 0,
        isCorrect: null,
        status: "NEEDS_MANUAL_GRADING" as const,
        feedback: null as string | null,
      };
    }
    if (question.type === "SHORT_ANSWER") {
      const accepted = this.stringArray(question.acceptedAnswers);
      if (!accepted.length) {
        return {
          maxPoints,
          pointsAwarded: 0,
          isCorrect: null,
          status: "NEEDS_MANUAL_GRADING" as const,
          feedback: null as string | null,
        };
      }
      const normalized = (answer?.textAnswer ?? "").trim().toLowerCase();
      const correct = accepted.map((value) => value.trim().toLowerCase()).includes(normalized);
      return this.finalGrade(correct, maxPoints);
    }
    if (question.type === "NUMERIC") {
      const expected = Number(this.stringArray(question.acceptedAnswers)[0]);
      const actual = Number(answer?.numericAnswer);
      const tolerance = question.numericTolerance ?? 0;
      const correct = Number.isFinite(expected) && Number.isFinite(actual)
        ? Math.abs(expected - actual) <= tolerance
        : false;
      return this.finalGrade(correct, maxPoints);
    }
    const selected = new Set(this.stringArray(answer?.selectedOptionIds ?? []));
    const correctIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
    const correctSet = new Set(correctIds);
    const exact =
      selected.size === correctSet.size &&
      [...selected].every((id) => correctSet.has(id));
    // ponytail: join option feedbacks for selected choices when present
    const optionFeedback = question.options
      .filter((o) => selected.has(o.id) && o.feedback)
      .map((o) => o.feedback)
      .filter(Boolean)
      .join(" ");
    return {
      ...this.finalGrade(exact, maxPoints),
      feedback: optionFeedback || null,
    };
  }

  private finalGrade(correct: boolean, maxPoints: number) {
    return {
      maxPoints,
      pointsAwarded: correct ? maxPoints : 0,
      isCorrect: correct,
      status: correct ? ("CORRECT" as const) : ("INCORRECT" as const),
      feedback: null as string | null,
    };
  }

  private scoreSummary(
    quiz: QuizForGrading,
    answers: Array<{ pointsAwarded: number; maxPoints: number }>,
  ) {
    return this.scoreSummaryFromAnswers(quiz.passingScorePercent, answers, this.maxScore(quiz));
  }

  private scoreSummaryFromAnswers(
    passingScorePercent: number,
    answers: Array<{ pointsAwarded: number; maxPoints: number }>,
    maxScoreOverride?: number,
  ) {
    const maxScore =
      maxScoreOverride ??
      answers.reduce((sum, answer) => sum + answer.maxPoints, 0);
    const score = answers.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
    return {
      score,
      maxScore,
      percentage,
      passed: percentage >= passingScorePercent,
    };
  }

  private maxScore(quiz: QuizForGrading) {
    return quiz.questions.reduce(
      (sum, quizQuestion) => sum + (quizQuestion.points ?? quizQuestion.question.points),
      0,
    );
  }

  private async isQuestionLockedInPublishedQuiz(
    organizationId: string,
    questionId: string,
  ) {
    const count = await this.prisma.quizQuestion.count({
      where: {
        questionId,
        quiz: {
          organizationId,
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
    });
    return count > 0;
  }

  private readRandomPools(metadata: Prisma.JsonValue | null | undefined): Array<{
    bankId: string;
    count: number;
    type?: string;
  }> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
    const raw = (metadata as { randomPools?: unknown }).randomPools;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const rec = item as Record<string, unknown>;
        const bankId = typeof rec.bankId === "string" ? rec.bankId : "";
        const count = Number(rec.count);
        if (!bankId || !Number.isFinite(count) || count < 1) return null;
        return {
          bankId,
          count: Math.min(50, Math.floor(count)),
          type: typeof rec.type === "string" ? rec.type : undefined,
        };
      })
      .filter(Boolean) as Array<{ bankId: string; count: number; type?: string }>;
  }

  private readQuestionOrder(
    metadata: Prisma.JsonValue | null | undefined,
  ): string[] | undefined {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return undefined;
    }
    const raw = (metadata as { questionOrder?: unknown }).questionOrder;
    if (!Array.isArray(raw)) return undefined;
    const ids = raw.filter((id): id is string => typeof id === "string" && id.length > 0);
    return ids.length ? ids : undefined;
  }

  private shuffleIds(ids: string[]) {
    const next = [...ids];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = next[i]!;
      next[i] = next[j]!;
      next[j] = t;
    }
    return next;
  }

  private async buildAttemptQuestionSelection(
    organizationId: string,
    quiz: QuizForGrading,
  ) {
    const fixedIds = quiz.questions.map((q) => q.questionId);
    const used = new Set(fixedIds);
    const poolPicks: Array<{ bankId: string; questionIds: string[] }> = [];
    let poolPoints = 0;

    for (const pool of this.readRandomPools(quiz.metadata)) {
      const candidates = await this.prisma.question.findMany({
        where: {
          organizationId,
          questionBankId: pool.bankId,
          deletedAt: null,
          id: { notIn: [...used] },
          ...(pool.type ? { type: pool.type as never } : {}),
        },
        select: { id: true, points: true },
      });
      const shuffled = this.shuffleIds(candidates.map((c) => c.id));
      const pick = shuffled.slice(0, pool.count);
      for (const id of pick) used.add(id);
      for (const id of pick) {
        const row = candidates.find((c) => c.id === id);
        poolPoints += row?.points ?? 1;
      }
      poolPicks.push({ bankId: pool.bankId, questionIds: pick });
    }

    let questionOrder = [...fixedIds, ...poolPicks.flatMap((p) => p.questionIds)];
    if (quiz.shuffleQuestions) {
      questionOrder = this.shuffleIds(questionOrder);
    }

    const fixedMax = this.maxScore(quiz);
    return {
      questionOrder,
      poolPicks,
      maxScore: fixedMax + poolPoints,
    };
  }

  private async resolveAttemptQuestions(
    organizationId: string,
    quiz: QuizForGrading,
    order: string[] | undefined,
  ) {
    const fixedById = new Map(
      quiz.questions.map((qq) => [
        qq.questionId,
        {
          questionId: qq.questionId,
          points: qq.points ?? qq.question.points,
          question: qq.question,
        },
      ]),
    );
    const ids = order?.length ? order : quiz.questions.map((q) => q.questionId);
    const missing = ids.filter((id) => !fixedById.has(id));
    const loaded =
      missing.length > 0
        ? await this.prisma.question.findMany({
            where: { organizationId, id: { in: missing }, deletedAt: null },
            include: { options: { orderBy: { orderIndex: "asc" } } },
          })
        : [];
    const loadedById = new Map(loaded.map((q) => [q.id, q]));

    return ids
      .map((id) => {
        const fixed = fixedById.get(id);
        if (fixed) return fixed;
        const q = loadedById.get(id);
        if (!q) return null;
        return { questionId: id, points: q.points, question: q };
      })
      .filter(Boolean) as Array<{
      questionId: string;
      points: number;
      question: QuestionWithOptions;
    }>;
  }

  private sanitizeQuizForLearner(
    quiz: QuizForGrading,
    options: {
      revealCorrect?: boolean;
      revealFeedback?: boolean;
      attemptQuestions?: Array<{
        questionId: string;
        points: number;
        question: QuestionWithOptions;
      }>;
      includePools?: boolean;
    } = {},
  ) {
    const mapQuestion = (
      question: QuestionWithOptions,
      quizQuestionId?: string,
      points?: number,
    ) => ({
      id: question.id,
      quizQuestionId,
      type: question.type,
      prompt: question.prompt,
      points: points ?? question.points,
      explanation: options.revealFeedback ? question.explanation : undefined,
      metadata: question.metadata ?? {},
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: options.revealCorrect ? option.isCorrect : undefined,
        feedback: options.revealFeedback ? option.feedback : undefined,
      })),
    });

    const questions = options.attemptQuestions
      ? options.attemptQuestions.map((t) =>
          mapQuestion(t.question, undefined, t.points),
        )
      : quiz.questions.map((quizQuestion) =>
          mapQuestion(
            quizQuestion.question,
            quizQuestion.id,
            quizQuestion.points ?? quizQuestion.question.points,
          ),
        );

    const pools = this.readRandomPools(quiz.metadata);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passingScorePercent: quiz.passingScorePercent,
      attemptLimit: quiz.attemptLimit,
      timeLimitMinutes: quiz.timeLimitMinutes,
      showCorrectAnswers: quiz.showCorrectAnswers,
      showFeedback: quiz.showFeedback,
      shuffleQuestions: quiz.shuffleQuestions,
      questions,
      randomPools: options.includePools ? pools : undefined,
    };
  }

  private async recalculateAttemptAfterManualGrade(
    organizationId: string,
    userId: string,
    attemptId: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findFirstOrThrow({
      where: { id: attemptId, organizationId },
      include: { quiz: true },
    });
    const answers = await this.prisma.quizAnswer.findMany({
      where: { organizationId, attemptId },
    });
    const needsManual = answers.some(
      (answer) => answer.status === "NEEDS_MANUAL_GRADING" || answer.status === "NOT_GRADED",
    );
    const score = answers.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
    const maxScore = answers.reduce((sum, answer) => sum + answer.maxPoints, 0);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
    const passed = percentage >= attempt.quiz.passingScorePercent;
    const updated = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        maxScore,
        percentage,
        passed,
        status: needsManual ? "NEEDS_MANUAL_GRADING" : "GRADED",
        gradedAt: needsManual ? null : new Date(),
      },
    });
    if (!needsManual && updated.passed && updated.activityId && updated.courseId) {
      await this.completeQuizActivity(organizationId, updated.userId, updated.activityId, updated.courseId);
    }
    await this.audit(organizationId, userId, "quiz_answer.manual_graded", attemptId);
  }

  private async completeQuizActivity(
    organizationId: string,
    userId: string,
    activityId: string,
    courseId: string,
  ) {
    const activity = await this.prisma.activity.findFirstOrThrow({
      where: { id: activityId, organizationId },
    });
    const enrollment = await this.ensureEnrollment(organizationId, userId, courseId);
    const now = new Date();
    await this.prisma.activityProgress.upsert({
      where: { organizationId_userId_activityId: { organizationId, userId, activityId } },
      update: {
        status: "COMPLETED",
        progressPercent: 100,
        completedAt: now,
        lastAccessedAt: now,
        enrollmentId: enrollment.id,
      },
      create: {
        organizationId,
        userId,
        courseId,
        lessonId: activity.lessonId,
        activityId,
        enrollmentId: enrollment.id,
        status: "COMPLETED",
        progressPercent: 100,
        startedAt: now,
        completedAt: now,
        lastAccessedAt: now,
      },
    });
    await this.recalculateEnrollment(organizationId, userId, courseId);
  }

  private async markQuizInProgress(
    organizationId: string,
    userId: string,
    attempt: { activityId: string | null; courseId: string | null; percentage: number },
  ) {
    if (!attempt.activityId || !attempt.courseId) return;
    const activity = await this.prisma.activity.findFirstOrThrow({
      where: { id: attempt.activityId, organizationId },
    });
    const enrollment = await this.ensureEnrollment(organizationId, userId, attempt.courseId);
    const progressPercent = Math.min(Math.max(Math.round(attempt.percentage), 1), 99);
    await this.prisma.activityProgress.upsert({
      where: {
        organizationId_userId_activityId: {
          organizationId,
          userId,
          activityId: attempt.activityId,
        },
      },
      update: {
        status: "IN_PROGRESS",
        progressPercent,
        lastAccessedAt: new Date(),
        enrollmentId: enrollment.id,
      },
      create: {
        organizationId,
        userId,
        courseId: attempt.courseId,
        lessonId: activity.lessonId,
        activityId: attempt.activityId,
        enrollmentId: enrollment.id,
        status: "IN_PROGRESS",
        progressPercent,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      },
    });
  }

  private recalculateEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    return recalculateEnrollment(this.prisma, organizationId, userId, courseId);
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Quiz",
        entityId,
        metadata: {},
      },
    });
  }
}
