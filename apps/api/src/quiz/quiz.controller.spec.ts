import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InstructorQuizController, LearnerQuizController } from "./quiz.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: ["quiz:manage", "quiz:grade"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };
const learnerOrg = { ...org, roleKeys: ["learner"], permissionKeys: [] };
const learnerUser = { ...user, role: "learner" };

function setup(overrides: Record<string, any> = {}) {
  const quiz = {
    listQuestionBanks: vi.fn().mockResolvedValue([{ id: "bank-1" }]),
    createQuestionBank: vi.fn().mockResolvedValue({ id: "bank-1" }),
    updateQuestionBank: vi.fn().mockResolvedValue({ id: "bank-1" }),
    deleteQuestionBank: vi.fn().mockResolvedValue({ id: "bank-1", deletedAt: new Date() }),
    listQuestions: vi.fn().mockResolvedValue([{ id: "q-1" }]),
    createQuestion: vi.fn().mockResolvedValue({ id: "q-1" }),
    updateQuestion: vi.fn().mockResolvedValue({ id: "q-1" }),
    deleteQuestion: vi.fn().mockResolvedValue({ id: "q-1", deletedAt: new Date() }),
    listQuizzes: vi.fn().mockResolvedValue([{ id: "quiz-1" }]),
    createQuiz: vi.fn().mockResolvedValue({ id: "quiz-1" }),
    getInstructorQuiz: vi.fn().mockResolvedValue({ id: "quiz-1", questions: [] }),
    updateQuiz: vi.fn().mockResolvedValue({ id: "quiz-1" }),
    publishQuiz: vi.fn().mockResolvedValue({ id: "quiz-1", status: "PUBLISHED" }),
    addQuestion: vi.fn().mockResolvedValue({ id: "qq-1" }),
    removeQuestion: vi.fn().mockResolvedValue({ id: "qq-1" }),
    reorderQuestions: vi.fn().mockResolvedValue({ id: "quiz-1" }),
    attachQuizToActivity: vi.fn().mockResolvedValue({ id: "quiz-1" }),
    listAttempts: vi.fn().mockResolvedValue([{ id: "att-1" }]),
    attemptDetail: vi.fn().mockResolvedValue({ id: "att-1" }),
    manualGradeAnswer: vi.fn().mockResolvedValue({ id: "ans-1" }),
    getLearnerQuiz: vi.fn().mockResolvedValue({ quiz: { id: "quiz-1" }, lastAttempt: null }),
    startAttempt: vi.fn().mockResolvedValue({ id: "att-1", status: "IN_PROGRESS" }),
    saveAnswer: vi.fn().mockResolvedValue({ id: "ans-1" }),
    submitAttempt: vi.fn().mockResolvedValue({ attempt: { id: "att-1" } }),
    result: vi.fn().mockResolvedValue({ attempt: { id: "att-1" }, answers: [] }),
    ...overrides,
  };
  return { quiz };
}

describe("InstructorQuizController", () => {
  it("manages question banks", async () => {
    const { quiz } = setup();
    const controller = new InstructorQuizController(quiz as any);

    await controller.listQuestionBanks(org, user);
    expect(quiz.listQuestionBanks).toHaveBeenCalledWith(org, "u-1");

    await controller.createQuestionBank(org, user, { title: "Bank 1" } as any);
    expect(quiz.createQuestionBank).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "Bank 1" }));

    await controller.updateQuestionBank(org, user, "bank-1", { title: "Updated" } as any);
    expect(quiz.updateQuestionBank).toHaveBeenCalledWith(org, "u-1", "bank-1", expect.objectContaining({ title: "Updated" }));

    await controller.deleteQuestionBank(org, user, "bank-1");
    expect(quiz.deleteQuestionBank).toHaveBeenCalledWith(org, "u-1", "bank-1");
  });

  it("manages questions", async () => {
    const { quiz } = setup();
    const controller = new InstructorQuizController(quiz as any);

    await controller.listQuestions(org, user, "bank-1");
    expect(quiz.listQuestions).toHaveBeenCalledWith(org, "u-1", "bank-1");

    await controller.createQuestion(org, user, { questionBankId: "bank-1", type: "MULTIPLE_CHOICE", prompt: "Q?" } as any);
    expect(quiz.createQuestion).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ prompt: "Q?" }));

    await controller.updateQuestion(org, user, "q-1", { prompt: "Q? v2" } as any);
    expect(quiz.updateQuestion).toHaveBeenCalledWith(org, "u-1", "q-1", expect.objectContaining({ prompt: "Q? v2" }));

    await controller.deleteQuestion(org, user, "q-1");
    expect(quiz.deleteQuestion).toHaveBeenCalledWith(org, "u-1", "q-1");
  });

  it("manages quizzes, questions, and the activity attachment", async () => {
    const { quiz } = setup();
    const controller = new InstructorQuizController(quiz as any);

    await controller.listQuizzes(org, user);
    expect(quiz.listQuizzes).toHaveBeenCalledWith(org, "u-1");

    await controller.createQuiz(org, user, { title: "Q1" } as any);
    expect(quiz.createQuiz).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "Q1" }));

    await controller.getQuiz(org, user, "quiz-1");
    expect(quiz.getInstructorQuiz).toHaveBeenCalledWith(org, "u-1", "quiz-1");

    await controller.updateQuiz(org, user, "quiz-1", { title: "Q1 v2" } as any);
    expect(quiz.updateQuiz).toHaveBeenCalledWith(org, "u-1", "quiz-1", expect.objectContaining({ title: "Q1 v2" }));

    await controller.publishQuiz(org, user, "quiz-1");
    expect(quiz.publishQuiz).toHaveBeenCalledWith(org, "u-1", "quiz-1");

    await controller.addQuestion(org, user, "quiz-1", { questionId: "q-1" } as any);
    expect(quiz.addQuestion).toHaveBeenCalledWith(org, "u-1", "quiz-1", expect.objectContaining({ questionId: "q-1" }));

    await controller.removeQuestion(org, user, "quiz-1", "q-1");
    expect(quiz.removeQuestion).toHaveBeenCalledWith(org, "u-1", "quiz-1", "q-1");

    await controller.reorderQuestions(org, user, "quiz-1", { ids: ["q-1"] } as any);
    expect(quiz.reorderQuestions).toHaveBeenCalledWith(org, "u-1", "quiz-1", expect.objectContaining({ ids: ["q-1"] }));

    await controller.attachQuizToActivity(org, user, "a-1", { quizId: "quiz-1" } as any);
    expect(quiz.attachQuizToActivity).toHaveBeenCalledWith(org, "u-1", "a-1", expect.objectContaining({ quizId: "quiz-1" }));
  });

  it("manages attempts and manual grading", async () => {
    const { quiz } = setup();
    const controller = new InstructorQuizController(quiz as any);

    await controller.listAttempts(org, user, "quiz-1");
    expect(quiz.listAttempts).toHaveBeenCalledWith(org, "u-1", "quiz-1");

    await controller.attemptDetail(org, user, "att-1");
    expect(quiz.attemptDetail).toHaveBeenCalledWith(org, "u-1", "att-1");

    await controller.manualGrade(org, user, "ans-1", { pointsAwarded: 5, feedback: "ok" } as any);
    expect(quiz.manualGradeAnswer).toHaveBeenCalledWith(org, "u-1", "ans-1", expect.objectContaining({ pointsAwarded: 5 }));
  });

  it("propagates a not found error from the service", async () => {
    const { quiz } = setup({
      getInstructorQuiz: vi.fn().mockRejectedValue(new NotFoundException("Quiz not found")),
    });
    const controller = new InstructorQuizController(quiz as any);
    await expect(controller.getQuiz(org, user, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("propagates a bad request error from the service when publishing", async () => {
    const { quiz } = setup({
      publishQuiz: vi.fn().mockRejectedValue(new BadRequestException("Quiz must have at least one question")),
    });
    const controller = new InstructorQuizController(quiz as any);
    await expect(controller.publishQuiz(org, user, "quiz-1")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("LearnerQuizController", () => {
  it("returns the learner's quiz payload for an activity", async () => {
    const { quiz } = setup();
    const controller = new LearnerQuizController(quiz as any);
    const response = await controller.getQuiz(learnerOrg, learnerUser, "a-1");
    expect(quiz.getLearnerQuiz).toHaveBeenCalledWith("org-a", "u-1", "a-1");
    expect(response).toEqual({ quiz: { id: "quiz-1" }, lastAttempt: null });
  });

  it("starts, saves answers for, and submits an attempt", async () => {
    const { quiz } = setup();
    const controller = new LearnerQuizController(quiz as any);

    const start = await controller.startAttempt(learnerOrg, learnerUser, "a-1");
    expect(quiz.startAttempt).toHaveBeenCalledWith("org-a", "u-1", "a-1");
    expect(start).toEqual({ id: "att-1", status: "IN_PROGRESS" });

    await controller.saveAnswer(learnerOrg, learnerUser, "att-1", { questionId: "q-1", selectedOptionIds: ["o-1"] } as any);
    expect(quiz.saveAnswer).toHaveBeenCalledWith("org-a", "u-1", "att-1", expect.objectContaining({ questionId: "q-1" }));

    const submit = await controller.submitAttempt(learnerOrg, learnerUser, "att-1");
    expect(quiz.submitAttempt).toHaveBeenCalledWith("org-a", "u-1", "att-1");
    expect(submit).toEqual({ attempt: { id: "att-1" } });
  });

  it("returns the attempt result", async () => {
    const { quiz } = setup();
    const controller = new LearnerQuizController(quiz as any);
    const response = await controller.result(learnerOrg, learnerUser, "att-1");
    expect(quiz.result).toHaveBeenCalledWith("org-a", "u-1", "att-1");
    expect(response).toEqual({ attempt: { id: "att-1" }, answers: [] });
  });
});
