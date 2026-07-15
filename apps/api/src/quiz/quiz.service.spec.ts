import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { QuizService } from "./quiz.service";

function createPrismaMock() {
  return {
    questionBank: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    question: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    questionOption: { deleteMany: vi.fn(), createMany: vi.fn() },
    quiz: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quizQuestion: {
      count: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    quizAttempt: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quizAnswer: { findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    course: { findFirst: vi.fn() },
    courseInstructor: { findFirst: vi.fn() },
    enrollment: { findUnique: vi.fn(), update: vi.fn() },
    activity: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    activityProgress: { count: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

const org = {
  id: "org-1",
  slug: "o",
  name: "Org",
  memberId: "m1",
  roleKeys: ["instructor"],
  permissionKeys: ["quiz:manage"],
  isPlatformAdmin: true,
};

function createService() {
  const prisma = createPrismaMock();
  return { prisma, service: new QuizService(prisma as never) };
}

const quiz = {
  id: "quiz-1",
  organizationId: "org-1",
  courseId: "course-1",
  activityId: "activity-1",
  passingScorePercent: 70,
  attemptLimit: 1,
  timeLimitMinutes: null,
  showCorrectAnswers: true,
  showFeedback: true,
  questions: [
    {
      id: "qq-1",
      quizId: "quiz-1",
      questionId: "q-1",
      points: 1,
      orderIndex: 0,
      question: {
        id: "q-1",
        type: "MULTIPLE_CHOICE",
        prompt: "Pick one",
        points: 1,
        acceptedAnswers: [],
        numericTolerance: null,
        options: [
          { id: "o-1", text: "A", isCorrect: true },
          { id: "o-2", text: "B", isCorrect: false },
        ],
      },
    },
  ],
};

describe("QuizService", () => {
  it("blocks a learner after the configured attempt limit", async () => {
    const { prisma, service } = createService();
    prisma.quiz.findFirst.mockResolvedValue(quiz);
    prisma.enrollment.findUnique.mockResolvedValue({ id: "enrollment-1", status: "ACTIVE" });
    prisma.quizAttempt.findMany.mockResolvedValue([
      { id: "attempt-1", attemptNumber: 1, status: "SUBMITTED" },
    ]);

    await expect(
      service.startAttempt("org-1", "learner-1", "activity-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("auto-grades multiple choice and completes progress when passed", async () => {
    const { prisma, service } = createService();
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
    prisma.quizAnswer.findMany.mockResolvedValue([
      {
        id: "answer-1",
        questionId: "q-1",
        selectedOptionIds: ["o-1"],
      },
    ]);
    prisma.quizAnswer.upsert.mockResolvedValue({
      id: "answer-1",
      questionId: "q-1",
      pointsAwarded: 1,
      maxPoints: 1,
      status: "CORRECT",
    });
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      passed: true,
      percentage: 100,
    });
    prisma.activity.findFirstOrThrow.mockResolvedValue({
      id: "activity-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({ id: "enrollment-1", status: "ACTIVE" });
    prisma.activity.findMany.mockResolvedValue([{ id: "activity-1" }]);
    prisma.activityProgress.count.mockResolvedValue(1);
    prisma.quiz.findFirstOrThrow.mockResolvedValueOnce(quiz).mockResolvedValueOnce(quiz);

    await service.submitAttempt("org-1", "learner-1", "attempt-1");

    expect(prisma.quizAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "CORRECT",
          pointsAwarded: 1,
        }),
      }),
    );
    expect(prisma.activityProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "COMPLETED",
          progressPercent: 100,
        }),
      }),
    );
  });

  it("creates and updates question banks and questions", async () => {
    const { prisma, service } = createService();
    prisma.questionBank.create.mockResolvedValue({ id: "bank-1" });
    await expect(
      service.createQuestionBank(org as any, "u1", {
        title: "Bank",
      } as any),
    ).resolves.toEqual({ id: "bank-1" });

    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      courseId: null,
    });
    prisma.questionBank.update.mockResolvedValue({ id: "bank-1", title: "B2" });
    await service.updateQuestionBank(org as any, "u1", "bank-1", {
      title: "B2",
    } as any);
    await service.deleteQuestionBank(org as any, "u1", "bank-1");
    prisma.question.findMany.mockResolvedValue([{ id: "q-1" }]);
    expect(await service.listQuestions(org as any, "u1", "bank-1")).toEqual([
      { id: "q-1" },
    ]);

    prisma.question.create.mockResolvedValue({ id: "q-new" });
    await service.createQuestion(org as any, "u1", {
      questionBankId: "bank-1",
      type: "MULTIPLE_CHOICE",
      prompt: "Q?",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
    } as any);
  });

  it("starts a new attempt when under limit", async () => {
    const { prisma, service } = createService();
    prisma.quiz.findFirst.mockResolvedValue(quiz);
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.quizAttempt.findMany.mockResolvedValue([]);
    prisma.quizAttempt.create.mockResolvedValue({ id: "attempt-new" });
    await expect(
      service.startAttempt("org-1", "learner-1", "activity-1"),
    ).resolves.toEqual({ id: "attempt-new" });
  });

  it("returns existing in-progress attempt", async () => {
    const { prisma, service } = createService();
    prisma.quiz.findFirst.mockResolvedValue(quiz);
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.quizAttempt.findMany.mockResolvedValue([
      { id: "attempt-open", attemptNumber: 1, status: "IN_PROGRESS" },
    ]);
    await expect(
      service.startAttempt("org-1", "learner-1", "activity-1"),
    ).resolves.toEqual(
      expect.objectContaining({ id: "attempt-open", status: "IN_PROGRESS" }),
    );
  });

  it("creates quiz, publishes, and saves answer", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.quiz.create.mockResolvedValue({ id: "quiz-new" });
    await service.createQuiz(org as any, "u1", {
      courseId: "course-1",
      title: "Quiz",
    } as any);

    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      status: "DRAFT",
      courseId: "course-1",
    });
    prisma.quizQuestion.count.mockResolvedValue(1);
    prisma.quiz.update.mockResolvedValue({ ...quiz, status: "PUBLISHED" });
    await service.publishQuiz(org as any, "u1", "quiz-1");

    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
      dueAt: null,
    });
    prisma.quizQuestion.findFirst.mockResolvedValue({
      quizId: "quiz-1",
      questionId: "q-1",
      points: 1,
      question: { points: 1 },
    });
    prisma.quizAnswer.upsert.mockResolvedValue({ id: "ans-1" });
    await service.saveAnswer("org-1", "learner-1", "attempt-1", {
      questionId: "q-1",
      selectedOptionIds: ["o-1"],
    } as any);
    expect(prisma.quizAnswer.upsert).toHaveBeenCalled();
  });

  it("updates quiz, manages questions, and learner views", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      status: "DRAFT",
      courseId: "course-1",
    });
    prisma.quiz.update.mockResolvedValue({ ...quiz, title: "Updated" });
    await service.updateQuiz(org as any, "u1", "quiz-1", {
      title: "Updated",
    } as any);

    prisma.question.findFirst.mockResolvedValue({
      id: "q-1",
      organizationId: "org-1",
      questionBankId: "bank-1",
    });
    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
    });
    prisma.quizQuestion.upsert.mockResolvedValue({ id: "qq-1" });
    await service.addQuestion(org as any, "u1", "quiz-1", {
      questionId: "q-1",
      points: 2,
    } as any);

    prisma.quizQuestion.delete = vi.fn().mockResolvedValue({ id: "qq-1" });
    await service.removeQuestion(org as any, "u1", "quiz-1", "q-1");

    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      status: "PUBLISHED",
      courseId: "course-1",
    });
    prisma.quizAttempt.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "attempt-1",
        organizationId: "org-1",
        userId: "learner-1",
        quizId: "quiz-1",
        status: "SUBMITTED",
        percentage: 100,
        passed: true,
      });
    await service.getLearnerQuiz("org-1", "learner-1", "activity-1");

    prisma.quizAttempt.findMany.mockResolvedValue([{ id: "attempt-1" }]);
    await service.listAttempts(org as any, "u1", "quiz-1");

    prisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
    prisma.quizAnswer.findMany.mockResolvedValue([
      { id: "ans-1", questionId: "q-1", isCorrect: true, feedback: "ok" },
    ]);
    await service.result("org-1", "learner-1", "attempt-1");

    prisma.quizQuestion.updateMany = vi.fn().mockResolvedValue({ count: 1 });
    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      status: "DRAFT",
      courseId: "course-1",
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
    await service.reorderQuestions(org as any, "u1", "quiz-1", {
      ids: ["qq-1"],
    } as any);
  });

  it("updates/deletes questions, attaches quiz, and grades manually", async () => {
    const { prisma, service } = createService();
    prisma.question.findFirst.mockResolvedValue({
      id: "q-1",
      organizationId: "org-1",
      questionBankId: "bank-1",
      type: "MULTIPLE_CHOICE",
      prompt: "Q?",
      options: [
        { id: "o-1", text: "A", isCorrect: true },
        { id: "o-2", text: "B", isCorrect: false },
      ],
    });
    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      courseId: null,
    });
    prisma.questionOption.deleteMany.mockResolvedValue({ count: 2 });
    prisma.question.update.mockResolvedValue({ id: "q-1", prompt: "Q2" });
    await service.updateQuestion(org as any, "u1", "q-1", {
      prompt: "Q2",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
    } as any);
    await service.deleteQuestion(org as any, "u1", "q-1");

    prisma.quiz.findMany.mockResolvedValue([{ id: "quiz-1" }]);
    expect(await service.listQuizzes(org as any, "u1")).toEqual([{ id: "quiz-1" }]);
    prisma.quiz.findFirst.mockResolvedValue({ ...quiz, courseId: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
    await service.getInstructorQuiz(org as any, "u1", "quiz-1");

    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      courseId: "course-1",
      organizationId: "org-1",
    });
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.quiz.update.mockResolvedValue({ ...quiz, activityId: "activity-1" });
    prisma.activity.update.mockResolvedValue({ id: "activity-1" });
    await service.attachQuizToActivity(org as any, "u1", "activity-1", {
      quizId: "quiz-1",
    } as any);

    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      quiz: quiz,
      user: { id: "learner-1" },
      answers: [],
    });
    await service.attemptDetail(org as any, "u1", "attempt-1");

    prisma.quizAnswer.findFirst = vi.fn().mockResolvedValue({
      id: "ans-1",
      organizationId: "org-1",
      attemptId: "attempt-1",
      maxPoints: 1,
      question: { points: 1 },
      attempt: { quizId: "quiz-1", id: "attempt-1" },
    });
    prisma.quizAnswer.update.mockResolvedValue({
      id: "ans-1",
      pointsAwarded: 1,
      status: "CORRECT",
    });
    prisma.quizAttempt.findFirstOrThrow.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      userId: "learner-1",
      activityId: "activity-1",
      courseId: "course-1",
      quiz: { passingScorePercent: 70 },
    });
    prisma.quizAnswer.findMany.mockResolvedValue([
      {
        id: "ans-1",
        pointsAwarded: 1,
        maxPoints: 1,
        status: "CORRECT",
      },
    ]);
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      passed: true,
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
    });
    prisma.activity.findFirstOrThrow.mockResolvedValue({
      id: "activity-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.activity.findMany.mockResolvedValue([{ id: "activity-1" }]);
    prisma.activityProgress.count.mockResolvedValue(1);
    await service.manualGradeAnswer(org as any, "u1", "ans-1", {
      pointsAwarded: 1,
      feedback: "ok",
    } as any);
    expect(prisma.quizAnswer.update).toHaveBeenCalled();
  });

  it("marks quiz progress when attempt fails and grades short answers", async () => {
    const { prisma, service } = createService();
    const shortQuiz = {
      ...quiz,
      questions: [
        {
          id: "qq-2",
          quizId: "quiz-1",
          questionId: "q-2",
          points: 2,
          orderIndex: 0,
          question: {
            id: "q-2",
            type: "SHORT_ANSWER",
            prompt: "Capital?",
            points: 2,
            acceptedAnswers: ["paris", "Paris"],
            numericTolerance: null,
            options: [],
          },
        },
      ],
    };
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
      percentage: 0,
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(shortQuiz);
    prisma.quizAnswer.findMany.mockResolvedValue([
      {
        id: "answer-1",
        questionId: "q-2",
        textAnswer: "paris",
        selectedOptionIds: [],
      },
    ]);
    prisma.quizAnswer.upsert.mockResolvedValue({
      id: "answer-1",
      questionId: "q-2",
      pointsAwarded: 2,
      maxPoints: 2,
      status: "CORRECT",
    });
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      passed: false,
      percentage: 40,
      status: "SUBMITTED",
    });
    prisma.activity.findFirstOrThrow.mockResolvedValue({
      id: "activity-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    prisma.activity.findMany.mockResolvedValue([{ id: "activity-1" }]);
    prisma.activityProgress.count.mockResolvedValue(0);
    await service.submitAttempt("org-1", "learner-1", "attempt-1");
    expect(prisma.activityProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "IN_PROGRESS" }),
      }),
    );
  });

  it("grades true/false numeric multi-answer and needs manual essay", async () => {
    const { prisma, service } = createService();
    const mixedQuiz = {
      ...quiz,
      questions: [
        {
          id: "qq-tf",
          quizId: "quiz-1",
          questionId: "q-tf",
          points: 1,
          orderIndex: 0,
          question: {
            id: "q-tf",
            type: "TRUE_FALSE",
            prompt: "T?",
            points: 1,
            acceptedAnswers: [],
            options: [
              { id: "t", text: "True", isCorrect: true },
              { id: "f", text: "False", isCorrect: false },
            ],
          },
        },
        {
          id: "qq-num",
          quizId: "quiz-1",
          questionId: "q-num",
          points: 1,
          orderIndex: 1,
          question: {
            id: "q-num",
            type: "NUMERIC",
            prompt: "2+2",
            points: 1,
            acceptedAnswers: ["4"],
            numericTolerance: 0,
            options: [],
          },
        },
        {
          id: "qq-ma",
          quizId: "quiz-1",
          questionId: "q-ma",
          points: 2,
          orderIndex: 2,
          question: {
            id: "q-ma",
            type: "MULTIPLE_ANSWER",
            prompt: "Pick",
            points: 2,
            acceptedAnswers: [],
            options: [
              { id: "a", text: "A", isCorrect: true },
              { id: "b", text: "B", isCorrect: true },
              { id: "c", text: "C", isCorrect: false },
            ],
          },
        },
        {
          id: "qq-es",
          quizId: "quiz-1",
          questionId: "q-es",
          points: 3,
          orderIndex: 3,
          question: {
            id: "q-es",
            type: "ESSAY",
            prompt: "Explain",
            points: 3,
            acceptedAnswers: [],
            options: [],
          },
        },
      ],
    };
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(mixedQuiz);
    prisma.quizAnswer.findMany.mockResolvedValue([
      { questionId: "q-tf", selectedOptionIds: ["t"] },
      { questionId: "q-num", numericAnswer: 4 },
      { questionId: "q-ma", selectedOptionIds: ["a", "b"] },
      { questionId: "q-es", textAnswer: "long form" },
    ]);
    prisma.quizAnswer.upsert.mockImplementation(async ({ update, create }) => ({
      id: "ans",
      ...(create ?? {}),
      ...update,
    }));
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      passed: false,
      percentage: 50,
      status: "NEEDS_MANUAL_GRADING",
    });
    prisma.activity.findFirstOrThrow.mockResolvedValue({
      id: "activity-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    await service.submitAttempt("org-1", "learner-1", "attempt-1");
    expect(prisma.quizAnswer.upsert).toHaveBeenCalled();
  });

  it("creates quiz with activity attach and partial manual grade", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.activity.findFirst.mockResolvedValue({
      id: "activity-1",
      courseId: "course-1",
      organizationId: "org-1",
    });
    prisma.quiz.create.mockResolvedValue({
      id: "quiz-new",
      activityId: "activity-1",
      courseId: "course-1",
      passingScorePercent: 70,
    });
    prisma.quiz.findFirst.mockResolvedValue({
      id: "quiz-new",
      organizationId: "org-1",
      createdById: "u1",
      courseId: "course-1",
      deletedAt: null,
      passingScorePercent: 70,
    });
    prisma.quiz.update.mockResolvedValue({
      id: "quiz-new",
      activityId: "activity-1",
    });
    prisma.activity.update.mockResolvedValue({ id: "activity-1" });
    await service.createQuiz(org as any, "u1", {
      courseId: "course-1",
      activityId: "activity-1",
      title: "Quiz",
    } as any);
    expect(prisma.activity.update).toHaveBeenCalled();

    prisma.quizAnswer.findFirst = vi.fn().mockResolvedValue({
      id: "ans-1",
      organizationId: "org-1",
      attemptId: "attempt-1",
      maxPoints: 2,
      question: { points: 2 },
      attempt: { quizId: "quiz-1", id: "attempt-1" },
    });
    prisma.quizAnswer.update.mockResolvedValue({
      id: "ans-1",
      pointsAwarded: 1,
      status: "PARTIALLY_CORRECT",
    });
    prisma.quizAttempt.findFirstOrThrow.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      userId: "learner-1",
      activityId: null,
      courseId: "course-1",
      quiz: { passingScorePercent: 70 },
    });
    prisma.quizAnswer.findMany.mockResolvedValue([
      {
        id: "ans-1",
        pointsAwarded: 1,
        maxPoints: 2,
        status: "PARTIALLY_CORRECT",
      },
    ]);
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      passed: false,
      activityId: null,
      courseId: "course-1",
      userId: "learner-1",
    });
    await service.manualGradeAnswer(org as any, "u1", "ans-1", {
      pointsAwarded: 1,
      feedback: "partial",
    } as any);
    expect(prisma.quizAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PARTIALLY_CORRECT" }),
      }),
    );

    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      ownerId: "other",
      courseId: "course-1",
    });
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    const limited = {
      ...org,
      isPlatformAdmin: false,
      permissionKeys: [],
    };
    prisma.question.create.mockResolvedValue({ id: "q-new" });
    await service.createQuestion(limited as any, "u1", {
      questionBankId: "bank-1",
      type: "SHORT_ANSWER",
      prompt: "Q?",
      acceptedAnswers: ["a"],
    } as any);
  });

  it("lists banks/quizzes for non-admin and enforces manage permissions", async () => {
    const { prisma, service } = createService();
    const nonAdmin = {
      ...org,
      isPlatformAdmin: false,
      permissionKeys: [],
    };
    prisma.questionBank.findMany.mockResolvedValue([{ id: "bank-1" }]);
    prisma.quiz.findMany.mockResolvedValue([{ id: "quiz-1" }]);
    expect(await service.listQuestionBanks(nonAdmin as any, "u1")).toEqual([
      { id: "bank-1" },
    ]);
    expect(await service.listQuizzes(nonAdmin as any, "u1")).toEqual([
      { id: "quiz-1" },
    ]);

    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      ownerId: "other",
      courseId: null,
    });
    await expect(
      service.createQuestion(nonAdmin as any, "u1", {
        questionBankId: "bank-1",
        type: "SHORT_ANSWER",
        prompt: "Q?",
        acceptedAnswers: ["a"],
      } as any),
    ).rejects.toThrow(/permission/i);

    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      createdById: "other",
      courseId: null,
    });
    await expect(
      service.getInstructorQuiz(nonAdmin as any, "u1", "quiz-1"),
    ).rejects.toThrow(/permission/i);

    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.createQuestionBank(org as any, "u1", {
        title: "B",
        courseId: "missing",
      } as any),
    ).rejects.toThrow(/Course not found/i);

    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      service.createQuestionBank(nonAdmin as any, "u1", {
        title: "B",
        courseId: "course-1",
      } as any),
    ).rejects.toThrow(/permission/i);

    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      userId: "learner-1",
      status: "SUBMITTED",
      dueAt: null,
    });
    await expect(
      service.saveAnswer("org-1", "learner-1", "attempt-1", {
        questionId: "q-1",
        selectedOptionIds: ["o-1"],
      } as any),
    ).rejects.toThrow(/immutable/i);
  });

  it("rejects empty prompt on question create", async () => {
    const { prisma, service } = createService();
    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      courseId: null,
    });
    await expect(
      service.createQuestion(org as any, "u1", {
        questionBankId: "bank-1",
        type: "SHORT_ANSWER",
        prompt: "   ",
        acceptedAnswers: ["x"],
      } as any),
    ).rejects.toThrow(/prompt/i);
  });

  it("rejects publish without questions and wrong multi-answer selection", async () => {
    const { prisma, service } = createService();
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.quiz.findFirst.mockResolvedValue({
      ...quiz,
      status: "DRAFT",
      courseId: "course-1",
    });
    prisma.quizQuestion.count.mockResolvedValue(0);
    await expect(
      service.publishQuiz(org as any, "u1", "quiz-1"),
    ).rejects.toThrow();

    const multi = {
      ...quiz,
      questions: [
        {
          id: "qq-ma",
          quizId: "quiz-1",
          questionId: "q-ma",
          points: 2,
          orderIndex: 0,
          question: {
            id: "q-ma",
            type: "MULTIPLE_ANSWER",
            prompt: "Pick",
            points: 2,
            acceptedAnswers: [],
            options: [
              { id: "a", text: "A", isCorrect: true },
              { id: "b", text: "B", isCorrect: true },
              { id: "c", text: "C", isCorrect: false },
            ],
          },
        },
      ],
    };
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      activityId: null,
      courseId: "course-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(multi);
    prisma.quizAnswer.findMany.mockResolvedValue([
      { questionId: "q-ma", selectedOptionIds: ["a"] },
    ]);
    prisma.quizAnswer.upsert.mockResolvedValue({
      questionId: "q-ma",
      pointsAwarded: 0,
      maxPoints: 2,
      status: "INCORRECT",
    });
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      activityId: null,
      courseId: "course-1",
      userId: "learner-1",
      status: "SUBMITTED",
      passed: false,
      percentage: 0,
    });
    await service.submitAttempt("org-1", "learner-1", "attempt-1");
    expect(prisma.quizAnswer.upsert).toHaveBeenCalled();
  });

  it("needs manual grading for short answer without accepted answers", async () => {
    const { prisma, service } = createService();
    const openShort = {
      ...quiz,
      questions: [
        {
          id: "qq-open",
          quizId: "quiz-1",
          questionId: "q-open",
          points: 2,
          orderIndex: 0,
          question: {
            id: "q-open",
            type: "SHORT_ANSWER",
            prompt: "Open?",
            points: 2,
            acceptedAnswers: [],
            numericTolerance: null,
            options: [],
          },
        },
      ],
    };
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
    });
    prisma.quiz.findFirstOrThrow.mockResolvedValue(openShort);
    prisma.quizAnswer.findMany.mockResolvedValue([
      { questionId: "q-open", textAnswer: "anything" },
    ]);
    prisma.quizAnswer.upsert.mockResolvedValue({
      questionId: "q-open",
      pointsAwarded: 0,
      maxPoints: 2,
      status: "NEEDS_MANUAL_GRADING",
    });
    prisma.quizAttempt.update.mockResolvedValue({
      id: "attempt-1",
      activityId: "activity-1",
      courseId: "course-1",
      userId: "learner-1",
      status: "NEEDS_MANUAL_GRADING",
      passed: false,
      percentage: 0,
    });
    prisma.activity.findFirstOrThrow.mockResolvedValue({
      id: "activity-1",
      lessonId: "lesson-1",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      id: "e1",
      status: "ACTIVE",
    });
    await service.submitAttempt("org-1", "learner-1", "attempt-1");
    expect(prisma.quizAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "NEEDS_MANUAL_GRADING" }),
      }),
    );
  });

  it("blocks expired attempts and invalid choice questions", async () => {
    const { prisma, service } = createService();
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      organizationId: "org-1",
      quizId: "quiz-1",
      userId: "learner-1",
      status: "IN_PROGRESS",
      dueAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.saveAnswer("org-1", "learner-1", "attempt-1", {
        questionId: "q-1",
        selectedOptionIds: ["o-1"],
      } as any),
    ).rejects.toThrow(/time limit/i);

    prisma.questionBank.findFirst.mockResolvedValue({
      id: "bank-1",
      organizationId: "org-1",
      courseId: null,
    });
    await expect(
      service.createQuestion(org as any, "u1", {
        questionBankId: "bank-1",
        type: "MULTIPLE_CHOICE",
        prompt: "Q?",
        options: [
          { text: "A", isCorrect: false },
          { text: "B", isCorrect: false },
        ],
      } as any),
    ).rejects.toThrow(/correct option/i);
  });
});





