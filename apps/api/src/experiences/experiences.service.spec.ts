import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ExperiencesService } from "./experiences.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const adminOrg = { ...org, roleKeys: ["org_admin"], isPlatformAdmin: true };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma: Record<string, any> = {
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a", deletedAt: null }) },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue(null) },
    enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }) },
    scormPackage: {
      findFirst: vi.fn().mockResolvedValue({ id: "scorm-1", organizationId: "org-a", courseId: "course-a" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "scorm-new" }),
      update: vi.fn().mockResolvedValue({ id: "scorm-1" }),
      delete: vi.fn().mockResolvedValue({ id: "scorm-1" }),
    },
    scormAttempt: {
      findFirst: vi.fn().mockResolvedValue({ id: "att-1", organizationId: "org-a", userId: "u1" }),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "att-1" }),
      update: vi.fn().mockResolvedValue({ id: "att-1" }),
    },
    h5PContent: {
      findFirst: vi.fn().mockResolvedValue({ id: "h5p-1", organizationId: "org-a", courseId: "course-a" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "h5p-new" }),
      update: vi.fn().mockResolvedValue({ id: "h5p-1" }),
      delete: vi.fn().mockResolvedValue({ id: "h5p-1" }),
    },
    h5PResult: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "h5p-res-1" }),
    },
    xapiStatement: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: `stmt-${Math.random()}`, ...data })),
    },
    xapiActivityState: {
      findUnique: vi.fn().mockResolvedValue({ state: { pos: 5 } }),
      upsert: vi.fn().mockResolvedValue({ id: "state-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    survey: {
      findFirst: vi.fn().mockResolvedValue({
        id: "survey-1",
        organizationId: "org-a",
        courseId: "course-a",
        status: "PUBLISHED",
        anonymous: false,
        allowMultipleSubmissions: false,
        questions: [{ id: "q-1", prompt: "How are you?" }, { id: "q-2", prompt: "Rate" }],
      }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "survey-new" }),
      update: vi.fn().mockResolvedValue({ id: "survey-1" }),
      delete: vi.fn().mockResolvedValue({ id: "survey-1" }),
    },
    surveyQuestion: {
      findFirst: vi.fn().mockResolvedValue({ orderIndex: 0 }),
      create: vi.fn().mockResolvedValue({ id: "q-new" }),
      delete: vi.fn().mockResolvedValue({ id: "q-1" }),
    },
    surveyResponse: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: "resp-1", ...data })),
    },
    surveyAnswer: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    poll: {
      findFirst: vi.fn().mockResolvedValue({
        id: "poll-1",
        organizationId: "org-a",
        courseId: "course-a",
        options: [{ id: "opt-1", label: "Yes" }, { id: "opt-2", label: "No" }],
        status: "ACTIVE",
      }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "poll-new" }),
      update: vi.fn().mockResolvedValue({ id: "poll-1" }),
      delete: vi.fn().mockResolvedValue({ id: "poll-1" }),
    },
    pollVote: {
      findMany: vi.fn().mockResolvedValue([{ selected: ["opt-1"] }, { selected: ["opt-1", "opt-2"] }]),
      upsert: vi.fn().mockResolvedValue({ id: "vote-1" }),
    },
    courseFeedback: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(7),
      create: vi.fn().mockResolvedValue({ id: "fb-1" }),
      aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4.2 }, _count: { rating: 7 } }),
    },
    ...overrides,
  };
  return { service: new ExperiencesService(prisma as never), prisma };
}

describe("ExperiencesService", () => {
  describe("SCORM", () => {
    it("creates a SCORM package for admins", async () => {
      const { service, prisma } = setup();
      await service.createScormPackage(adminOrg, { courseId: "course-a", title: "Module 1" });
      expect(prisma.scormPackage.create).toHaveBeenCalled();
    });

    it("blocks learners from creating SCORM packages", async () => {
      const { service } = setup();
      await expect(
        service.createScormPackage(org, { courseId: "course-a", title: "Module 1" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("starts an SCORM attempt for enrolled users", async () => {
      const { service, prisma } = setup();
      const attempt = await service.startScormAttempt(org, "u1", "scorm-1", {});
      expect(prisma.scormAttempt.upsert).toHaveBeenCalled();
      expect(attempt).toBeTruthy();
    });

    it("rejects SCORM attempt start for non-enrolled users", async () => {
      const { service } = setup({ enrollment: { findUnique: vi.fn().mockResolvedValue(null) } });
      await expect(service.startScormAttempt(org, "u1", "scorm-1", {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("commits SCORM attempt with score and finalizes", async () => {
      const { service, prisma } = setup();
      await service.commitScormAttempt(org, "u1", "att-1", {
        status: "COMPLETED",
        completion: "COMPLETED",
        success: "PASSED",
        scoreRaw: 85,
        finalize: true,
      });
      expect(prisma.scormAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ finishedAt: expect.any(Date) }) }),
      );
    });
  });

  describe("H5P", () => {
    it("creates H5P content", async () => {
      const { service, prisma } = setup();
      await service.createH5PContent(adminOrg, {
        courseId: "course-a",
        library: "H5P.MultiChoice",
        title: "Quiz 1",
      });
      expect(prisma.h5PContent.create).toHaveBeenCalled();
    });

    it("submits H5P result for enrolled user", async () => {
      const { service, prisma } = setup();
      await service.submitH5PResult(org, "u1", "h5p-1", { score: 80, maxScore: 100, completion: "COMPLETED" });
      expect(prisma.h5PResult.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 80, completion: "COMPLETED" }) }),
      );
    });
  });

  describe("xAPI", () => {
    it("stores multiple statements", async () => {
      const { service, prisma } = setup();
      const result = await service.postXapiStatements(org, "u1", [
        { actor: { mbox: "mailto:a@b.com" }, verb: { id: "x" }, object: { id: "o" } },
        { actor: { mbox: "mailto:c@d.com" }, verb: { id: "y" }, object: { id: "o" } },
      ]);
      expect(result.stored).toBe(2);
      expect(prisma.xapiStatement.create).toHaveBeenCalledTimes(2);
    });

    it("rejects empty statement arrays", async () => {
      const { service } = setup();
      await expect(service.postXapiStatements(org, "u1", [])).rejects.toBeInstanceOf(BadRequestException);
    });

    it("blocks learners from listing statements", async () => {
      const { service } = setup();
      await expect(service.listXapiStatements(org)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("gets and puts xAPI activity state", async () => {
      const { service, prisma } = setup();
      const state = await service.getXapiState(org, "act-1", "bookmark", { mbox: "mailto:a@b.com" });
      expect(state).toEqual({ pos: 5 });

      await service.putXapiState(org, {
        activityId: "act-1",
        stateId: "bookmark",
        agent: { mbox: "mailto:a@b.com" },
        state: { pos: 10 },
      });
      expect(prisma.xapiActivityState.upsert).toHaveBeenCalled();
    });
  });

  describe("Survey", () => {
    it("creates a survey with questions", async () => {
      const { service, prisma } = setup();
      await service.createSurvey(adminOrg, "u1", {
        courseId: "course-a",
        title: "Course evaluation",
        questions: [{ type: "SHORT_TEXT", prompt: "Q1" }, { type: "RATING", prompt: "Q2" }],
      });
      expect(prisma.survey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            questions: { create: expect.arrayContaining([expect.objectContaining({ prompt: "Q1" })]) },
          }),
        }),
      );
    });

    it("submits survey response with valid question ids", async () => {
      const { service, prisma } = setup();
      const response = await service.submitSurveyResponse(org, "u1", "survey-1", {
        answers: [
          { questionId: "q-1", value: "Great course" },
          { questionId: "q-2", value: 5 },
        ],
      });
      expect(prisma.surveyResponse.create).toHaveBeenCalled();
      expect(response).toBeTruthy();
    });

    it("rejects survey response with invalid question id", async () => {
      const { service } = setup();
      await expect(
        service.submitSurveyResponse(org, "u1", "survey-1", {
          answers: [{ questionId: "q-bad", value: "x" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("exports survey responses as CSV", async () => {
      const { service } = setup({
        surveyResponse: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "resp-1",
              submittedAt: new Date("2026-07-01T00:00:00.000Z"),
              user: { id: "u1", name: "Ayu", email: "ayu@x.com" },
              answers: [
                { questionId: "q-1", value: "Great", textValue: "Great" },
                { questionId: "q-2", value: 5, textValue: null },
              ],
            },
          ]),
        },
      });
      const csv = await service.exportSurveyResponsesCsv(adminOrg, "survey-1");
      expect(csv).toContain("response_id");
      expect(csv).toContain("ayu@x.com");
      expect(csv).toContain("Great");
      expect(csv).toContain("5");
    });
  });

  describe("Poll", () => {
    it("casts a vote on an active poll", async () => {
      const { service, prisma } = setup();
      await service.votePoll(org, "u1", "poll-1", { selected: ["opt-1"] });
      expect(prisma.pollVote.upsert).toHaveBeenCalled();
    });

    it("rejects vote on closed poll", async () => {
      const { service } = setup({
        poll: {
          findFirst: vi.fn().mockResolvedValue({ id: "poll-1", status: "CLOSED", options: [{ id: "opt-1", label: "Yes" }] }),
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
      });
      await expect(service.votePoll(org, "u1", "poll-1", { selected: ["opt-1"] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("aggregates poll results with counts per option", async () => {
      const { service } = setup();
      const result = await service.pollResults(adminOrg, "poll-1");
      expect(result.totalVotes).toBe(2);
      expect(result.options.find((o: any) => o.id === "opt-1")?.votes).toBe(2);
      expect(result.options.find((o: any) => o.id === "opt-2")?.votes).toBe(1);
    });
  });

  describe("Course Feedback", () => {
    it("submits feedback with rating", async () => {
      const { service, prisma } = setup();
      await service.submitCourseFeedback(org, "u1", { courseId: "course-a", rating: 5, comment: "Great!" });
      expect(prisma.courseFeedback.create).toHaveBeenCalled();
    });

    it("returns feedback list with average rating", async () => {
      const { service } = setup();
      const result = await service.listCourseFeedback(adminOrg, "course-a");
      expect(result.average).toBe(4.2);
      expect(result.totalFeedback).toBe(7);
    });

    it("blocks learners from listing feedback", async () => {
      const { service } = setup();
      await expect(service.listCourseFeedback(org, "course-a")).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("error handling", () => {
    it("throws NotFound for missing SCORM package", async () => {
      const { service } = setup({ scormPackage: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn() } });
      await expect(service.getScormPackage(org, "missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFound for missing survey", async () => {
      const { service } = setup({ survey: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn() } });
      await expect(service.getSurvey(org, "missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
