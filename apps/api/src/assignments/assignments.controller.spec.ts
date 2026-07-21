import { describe, expect, it, vi } from "vitest";
import {
  InstructorAssignmentsController,
  LearnerAssignmentsController,
} from "./assignments.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: ["assignments:manage", "assignments:grade"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setupInstructorService(overrides: Record<string, any> = {}) {
  const service = {
    listAssignments: vi.fn().mockResolvedValue([{ id: "a-1" }]),
    createAssignment: vi.fn().mockResolvedValue({ id: "a-1", title: "HW" }),
    getInstructorAssignment: vi.fn().mockResolvedValue({ id: "a-1", title: "HW" }),
    updateAssignment: vi.fn().mockResolvedValue({ id: "a-1", title: "Updated" }),
    deleteAssignment: vi.fn().mockResolvedValue({ id: "a-1", deletedAt: new Date() }),
    publishAssignment: vi.fn().mockResolvedValue({ id: "a-1", status: "PUBLISHED" }),
    listRubrics: vi.fn().mockResolvedValue([{ id: "r-1" }]),
    createRubric: vi.fn().mockResolvedValue({ id: "r-1", title: "Rubric" }),
    getRubric: vi.fn().mockResolvedValue({ id: "r-1", title: "Rubric" }),
    updateRubric: vi.fn().mockResolvedValue({ id: "r-1", title: "Updated" }),
    deleteRubric: vi.fn().mockResolvedValue({ id: "r-1", deletedAt: new Date() }),
    listSubmissions: vi.fn().mockResolvedValue([{ id: "s-1" }]),
    getSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "SUBMITTED" }),
    gradeSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "GRADED", score: 90 }),
    returnSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "RETURNED" }),
    reviewLateSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "SUBMITTED" }),
    getGradebook: vi.fn().mockResolvedValue([]),
    getRoster: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return { service, controller: new InstructorAssignmentsController(service as any) };
}

function setupLearnerService(overrides: Record<string, any> = {}) {
  const service = {
    getLearnerAssignment: vi.fn().mockResolvedValue({ assignment: { id: "a-1" }, latestSubmission: null }),
    createSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "DRAFT" }),
    updateSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "DRAFT" }),
    submitSubmission: vi.fn().mockResolvedValue({ id: "s-1", status: "SUBMITTED" }),
    submissionResult: vi.fn().mockResolvedValue({ id: "s-1", status: "GRADED", score: 90 }),
    ...overrides,
  };
  return { service, controller: new LearnerAssignmentsController(service as any) };
}

describe("InstructorAssignmentsController", () => {
  it("lists assignments for a course", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.list(org, user, "c-1");
    expect(service.listAssignments).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual([{ id: "a-1" }]);
  });

  it("creates an assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.create(org, user, "c-1", { title: "HW" } as any);
    expect(service.createAssignment).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ title: "HW" }));
    expect(response).toEqual({ id: "a-1", title: "HW" });
  });

  it("gets an instructor assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.get(org, user, "a-1");
    expect(service.getInstructorAssignment).toHaveBeenCalledWith(org, "u-1", "a-1");
    expect(response).toEqual({ id: "a-1", title: "HW" });
  });

  it("updates an assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.update(org, user, "a-1", { title: "Updated" } as any);
    expect(service.updateAssignment).toHaveBeenCalledWith(org, "u-1", "a-1", expect.objectContaining({ title: "Updated" }));
    expect(response).toEqual({ id: "a-1", title: "Updated" });
  });

  it("deletes an assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.delete(org, user, "a-1");
    expect(service.deleteAssignment).toHaveBeenCalledWith(org, "u-1", "a-1");
    expect(response).toEqual({ id: "a-1", deletedAt: expect.any(Date) });
  });

  it("publishes an assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.publish(org, user, "a-1");
    expect(service.publishAssignment).toHaveBeenCalledWith(org, "u-1", "a-1");
    expect(response).toEqual({ id: "a-1", status: "PUBLISHED" });
  });

  it("lists rubrics", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.rubrics(org, user);
    expect(service.listRubrics).toHaveBeenCalledWith(org, "u-1");
    expect(response).toEqual([{ id: "r-1" }]);
  });

  it("creates a rubric", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.createRubric(org, user, { title: "Rubric" } as any);
    expect(service.createRubric).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "Rubric" }));
    expect(response).toEqual({ id: "r-1", title: "Rubric" });
  });

  it("gets a rubric", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.rubric(org, user, "r-1");
    expect(service.getRubric).toHaveBeenCalledWith(org, "u-1", "r-1");
    expect(response).toEqual({ id: "r-1", title: "Rubric" });
  });

  it("updates a rubric", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.updateRubric(org, user, "r-1", { title: "Updated" } as any);
    expect(service.updateRubric).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ title: "Updated" }));
    expect(response).toEqual({ id: "r-1", title: "Updated" });
  });

  it("deletes a rubric", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.deleteRubric(org, user, "r-1");
    expect(service.deleteRubric).toHaveBeenCalledWith(org, "u-1", "r-1");
    expect(response).toEqual({ id: "r-1", deletedAt: expect.any(Date) });
  });

  it("lists submissions for an assignment", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.submissions(org, user, "a-1");
    expect(service.listSubmissions).toHaveBeenCalledWith(org, "u-1", "a-1");
    expect(response).toEqual([{ id: "s-1" }]);
  });

  it("gets a single submission", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.submission(org, user, "s-1");
    expect(service.getSubmission).toHaveBeenCalledWith(org, "u-1", "s-1");
    expect(response).toEqual({ id: "s-1", status: "SUBMITTED" });
  });

  it("grades a submission", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.grade(org, user, "s-1", { score: 90 } as any);
    expect(service.gradeSubmission).toHaveBeenCalledWith(org, "u-1", "s-1", expect.objectContaining({ score: 90 }));
    expect(response).toEqual({ id: "s-1", status: "GRADED", score: 90 });
  });

  it("returns a submission", async () => {
    const { controller, service } = setupInstructorService();
    const response = await controller.returnSubmission(org, user, "s-1", { feedback: "redo" } as any);
    expect(service.returnSubmission).toHaveBeenCalledWith(org, "u-1", "s-1", expect.objectContaining({ feedback: "redo" }));
    expect(response).toEqual({ id: "s-1", status: "RETURNED" });
  });

  it("routes late review, gradebook, and roster through service authorization", async () => {
    const { controller, service } = setupInstructorService();
    await controller.reviewLateSubmission(org, user, "s-1", { action: "APPROVE" } as any);
    await controller.gradebook(org, user, "c-1");
    await controller.roster(org, user, "c-1");
    expect(service.reviewLateSubmission).toHaveBeenCalledWith(org, "u-1", "s-1", { action: "APPROVE" });
    expect(service.getGradebook).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(service.getRoster).toHaveBeenCalledWith(org, "u-1", "c-1");
  });
});

describe("LearnerAssignmentsController", () => {
  it("gets a learner assignment", async () => {
    const { controller, service } = setupLearnerService();
    const response = await controller.get(org, user, "a-1");
    expect(service.getLearnerAssignment).toHaveBeenCalledWith("org-a", "u-1", "a-1");
    expect(response).toEqual({ assignment: { id: "a-1" }, latestSubmission: null });
  });

  it("creates a submission for an assignment", async () => {
    const { controller, service } = setupLearnerService();
    const response = await controller.create(org, user, "a-1", { textAnswer: "hello" } as any);
    expect(service.createSubmission).toHaveBeenCalledWith("org-a", "u-1", "a-1", expect.objectContaining({ textAnswer: "hello" }));
    expect(response).toEqual({ id: "s-1", status: "DRAFT" });
  });

  it("updates a submission", async () => {
    const { controller, service } = setupLearnerService();
    const response = await controller.update(org, user, "s-1", { textAnswer: "world" } as any);
    expect(service.updateSubmission).toHaveBeenCalledWith("org-a", "u-1", "s-1", expect.objectContaining({ textAnswer: "world" }));
    expect(response).toEqual({ id: "s-1", status: "DRAFT" });
  });

  it("submits a submission", async () => {
    const { controller, service } = setupLearnerService();
    const response = await controller.submit(org, user, "s-1");
    expect(service.submitSubmission).toHaveBeenCalledWith("org-a", "u-1", "s-1");
    expect(response).toEqual({ id: "s-1", status: "SUBMITTED" });
  });

  it("returns a submission result", async () => {
    const { controller, service } = setupLearnerService();
    const response = await controller.result(org, user, "s-1");
    expect(service.submissionResult).toHaveBeenCalledWith("org-a", "u-1", "s-1");
    expect(response).toEqual({ id: "s-1", status: "GRADED", score: 90 });
  });
});
