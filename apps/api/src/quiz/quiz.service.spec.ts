import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { QuizService } from "./quiz.service";

function createPrismaMock() {
  return {
    questionBank: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    question: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    questionOption: { deleteMany: vi.fn() },
    quiz: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quizQuestion: { count: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
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
    activity: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    activityProgress: { count: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

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
});
