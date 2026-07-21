import { describe, expect, it, vi } from "vitest";
import { AssignmentsService } from "./assignments.service";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["instructor"],
  permissionKeys: ["courses:update", "assignments:grade"],
  isPlatformAdmin: false,
};

const course = { id: "c1", organizationId: "org-a", deletedAt: null };
const instructor = { organizationId: "org-a", courseId: "c1", userId: "u1" };
const activity = { id: "act-1", courseId: "c1", organizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    course: { findFirst: vi.fn().mockResolvedValue(course) },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue(instructor) },
    activity: {
      findFirst: vi.fn().mockResolvedValue(activity),
      updateMany: vi.fn().mockResolvedValue(undefined),
    },
    rubric: {
      findFirst: vi.fn().mockResolvedValue({ id: "rub", organizationId: "org-a" }),
      findMany: vi.fn().mockResolvedValue([{ id: "rub" }]),
      create: vi.fn().mockResolvedValue({ id: "rub-new" }),
      update: vi.fn().mockResolvedValue({ id: "rub", deletedAt: new Date() }),
    },
    assignment: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: "asg-1",
          courseId: "c1",
          organizationId: "org-a",
          activityId: null,
          status: "DRAFT",
          deletedAt: null,
          allowResubmission: true,
          maxAttempts: 3,
          maxResubmissions: 2,
          dueAt: null,
          availableUntil: null,
          allowLateSubmission: true,
        }),
      findMany: vi.fn().mockResolvedValue([{ id: "asg-1" }]),
      create: vi
        .fn()
        .mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "asg-1", ...data }),
        ),
      update: vi
        .fn()
        .mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: "asg-1",
            courseId: "c1",
            activityId: data.activityId,
            status: data.status,
            deletedAt: data.deletedAt,
          }),
        ),
    },
    assignmentSubmission: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "sub-1", status: "DRAFT" }),
      update: vi.fn().mockResolvedValue({
        id: "sub-1",
        status: "SUBMITTED",
        assignmentId: "asg-1",
        activityId: null,
        courseId: "c1",
        userId: "learner",
        assignment: { title: "Test", id: "asg-1" },
      }),
      findMany: vi.fn().mockResolvedValue([{ id: "sub-1" }]),
    },
    rubricScore: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    activityAssignment: { upsert: vi.fn().mockResolvedValue(undefined) },
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({ id: "e1", status: "ACTIVE" }),
    },
    activityProgress: { upsert: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  } as any;
  return { service: new AssignmentsService(prisma, undefined), prisma };
}

describe("AssignmentsService.createAssignment", () => {
  it("creates assignment with activity attach and rubric", async () => {
    const { service, prisma } = setup();
    prisma.activity.findFirst.mockResolvedValue({
      ...activity,
      courseId: "c1",
    });
    prisma.rubric.findFirst.mockResolvedValue({
      id: "rub",
      organizationId: "org-a",
      courseId: "c1",
      deletedAt: null,
    });
    await service.createAssignment(org, "u1", "c1", {
      title: "Test",
      submissionType: "TEXT",
      activityId: "act-1",
      rubricId: "rub",
    } as any);
    expect(prisma.activity.updateMany).toHaveBeenCalled();
  });

  it("creates an assignment tied to course and actor", async () => {
    const { service, prisma } = setup();
    const result = await service.createAssignment(org, "u1", "c1", {
      title: "Test",
      submissionType: "TEXT",
    } as any);
    expect(result.id).toBe("asg-1");
    expect(prisma.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-a",
          courseId: "c1",
          createdById: "u1",
          title: "Test",
          submissionType: "TEXT",
        }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "assignment.created" }) })
    );
  });

  it("rejects activity that does not belong to course", async () => {
    const local = setup();
    local.prisma.activity.findFirst.mockResolvedValue({ ...activity, courseId: "c-other" });
    await expect(
      local.service.createAssignment(org, "u1", "c1", {
        title: "Test",
        submissionType: "TEXT",
        activityId: "act-x",
      } as any)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects creation when user is not an instructor and has no permission", async () => {
    const local = setup();
    local.prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      local.service.createAssignment({ ...org, permissionKeys: [] }, "u1", "c1", { title: "X", submissionType: "TEXT" } as any)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects activity from other course and cross-course rubric", async () => {
    const { service, prisma } = setup();
    prisma.activity.findFirst.mockResolvedValue({
      id: "act-x",
      courseId: "c-other",
      organizationId: "org-a",
    });
    await expect(
      service.updateAssignment(org as any, "u1", "asg-1", {
        activityId: "act-x",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.activity.findFirst.mockResolvedValue(activity);
    prisma.rubric.findFirst.mockResolvedValue({
      id: "rub",
      organizationId: "org-a",
      courseId: "c-other",
      deletedAt: null,
    });
    await expect(
      service.updateAssignment(org as any, "u1", "asg-1", {
        rubricId: "rub",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects missing course", async () => {
    const local = setup();
    local.prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      local.service.createAssignment(org, "u1", "missing", { title: "X", submissionType: "TEXT" } as any)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("AssignmentsService.publishAssignment", () => {
  it("flips status to PUBLISHED and writes audit log", async () => {
    const { service, prisma } = setup();
    const result = await service.publishAssignment(org, "u1", "asg-1");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "assignment.published" }) })
    );
    expect(result).toMatchObject({ id: "asg-1", status: "PUBLISHED" });
  });
});

describe("AssignmentsService more paths", () => {
  it("lists and deletes assignments", async () => {
    const { service, prisma } = setup();
    expect(await service.listAssignments(org as any, "u1", "c1")).toEqual([
      { id: "asg-1" },
    ]);
    await service.deleteAssignment(org as any, "u1", "asg-1");
    expect(prisma.assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ARCHIVED" }),
      }),
    );
  });

  it("creates and lists rubrics", async () => {
    const { service, prisma } = setup();
    expect(await service.listRubrics(org as any, "u1")).toEqual([{ id: "rub" }]);
    await service.createRubric(org as any, "u1", {
      title: "R",
      criteria: [{ title: "C", maxPoints: 10, levels: [{ title: "L", points: 10 }] }],
    } as any);
    expect(prisma.rubric.create).toHaveBeenCalled();

    prisma.rubric.findFirst.mockResolvedValue({
      id: "rub",
      organizationId: "org-a",
      courseId: "c1",
      deletedAt: null,
      criteria: [],
    });
    prisma.rubricCriterion = {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    prisma.rubric.update.mockResolvedValue({
      id: "rub",
      title: "R2",
      criteria: [],
    });
    await service.getRubric(org as any, "u1", "rub");
    await service.updateRubric(org as any, "u1", "rub", {
      title: "R2",
      criteria: [
        {
          title: "C",
          maxPoints: 5,
          levels: [{ title: "L", points: 5, description: "ok" }],
        },
      ],
    } as any);
    await service.deleteRubric(org as any, "u1", "rub");
    expect(prisma.rubric.update).toHaveBeenCalled();
  });


  it("learner creates and submits submission", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: null,
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
    });
    await service.createSubmission("org-a", "learner", "asg-1", {
      textAnswer: "hello",
    } as any);
    expect(prisma.assignmentSubmission.create).toHaveBeenCalled();

    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      assignmentId: "asg-1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
    });
    prisma.assignmentSubmission.update.mockResolvedValue({
      id: "sub-1",
      status: "SUBMITTED",
      assignmentId: "asg-1",
      activityId: null,
      courseId: "c1",
      userId: "learner",
      assignment: { id: "asg-1" },
    });
    await service.submitSubmission("org-a", "learner", "sub-1");
    expect(prisma.assignmentSubmission.update).toHaveBeenCalled();
  });

  it("lists grades and returns submissions", async () => {
    const { service, prisma } = setup();
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      courseId: "c1",
      userId: "learner",
      assignmentId: "asg-1",
      organizationId: "org-a",
      maxScore: 100,
      assignment: {
        id: "asg-1",
        title: "Test",
        courseId: "c1",
        rubric: { totalPoints: 10 },
      },
      rubricScores: [],
      user: { id: "learner" },
    });
    prisma.assignmentSubmission.update.mockResolvedValue({
      id: "sub-1",
      userId: "learner",
      courseId: "c1",
      assignmentId: "asg-1",
      status: "GRADED",
      assignment: { id: "asg-1", title: "Test" },
      rubricScores: [],
    });
    prisma.assignmentSubmission.findMany.mockResolvedValue([{ id: "sub-1" }]);

    expect(await service.listSubmissions(org as any, "u1", "asg-1")).toEqual([
      { id: "sub-1" },
    ]);
    await service.gradeSubmission(org as any, "u1", "sub-1", {
      score: 8,
      maxScore: 10,
      feedback: "good",
    } as any);
    await service.returnSubmission(org as any, "u1", "sub-1", {
      feedback: "retry",
    } as any);
    expect(prisma.assignmentSubmission.update).toHaveBeenCalled();
  });

  it("covers instructor detail/update and learner assignment flows", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirstOrThrow = vi.fn().mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: "act-1",
      status: "DRAFT",
      deletedAt: null,
    });
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: "act-1",
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: null,
      availableFrom: null,
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
      rubric: null,
    });
    await service.getInstructorAssignment(org as any, "u1", "asg-1");
    await service.updateAssignment(org as any, "u1", "asg-1", {
      title: "Updated",
      activityId: "act-1",
    } as any);
    await service.getLearnerAssignment("org-a", "learner", "asg-1");
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      assignmentId: "asg-1",
      courseId: "c1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
      assignment: { id: "asg-1", rubric: null },
      rubricScores: [],
      user: { id: "learner" },
    });
    await service.getSubmission(org as any, "u1", "sub-1");
    await service.updateSubmission("org-a", "learner", "sub-1", {
      textAnswer: "edited",
    } as any);
    await service.submissionResult("org-a", "learner", "sub-1");
    expect(prisma.assignment.update).toHaveBeenCalled();
  });

  it("grades with rubric scores and rejects invalid resubmission limits", async () => {
    const { service, prisma } = setup();
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      courseId: "c1",
      userId: "learner",
      assignmentId: "asg-1",
      organizationId: "org-a",
      maxScore: null,
      assignment: {
        id: "asg-1",
        title: "Test",
        courseId: "c1",
        rubric: {
          totalPoints: 10,
          criteria: [{ id: "c1", title: "Quality", maxPoints: 10, orderIndex: 0, levels: [] }],
        },
      },
      rubricScores: [],
      user: { id: "learner" },
    });
    prisma.assignmentSubmission.update.mockResolvedValue({
      id: "sub-1",
      userId: "learner",
      courseId: "c1",
      assignmentId: "asg-1",
      status: "GRADED",
      assignment: { id: "asg-1", title: "Test" },
      rubricScores: [{ points: 8 }],
    });
    await service.gradeSubmission(org as any, "u1", "sub-1", {
      feedback: "nice",
      rubricScores: [{ criterionId: "c1", points: 8 }],
    } as any);
    expect(prisma.rubricScore.deleteMany).toHaveBeenCalled();

    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: false,
      maxAttempts: 1,
      maxResubmissions: 0,
      dueAt: null,
      availableFrom: null,
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
    });
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-old",
      status: "SUBMITTED",
      attemptNumber: 1,
      userId: "learner",
      assignmentId: "asg-1",
    });
    await expect(
      service.createSubmission("org-a", "learner", "asg-1", {
        textAnswer: "again",
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects unavailable assignment, attempt limits, and returned edits", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 1,
      maxResubmissions: 0,
      dueAt: null,
      availableFrom: null,
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
    });
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-old",
      status: "SUBMITTED",
      attemptNumber: 1,
      userId: "learner",
      assignmentId: "asg-1",
    });
    await expect(
      service.createSubmission("org-a", "learner", "asg-1", {
        textAnswer: "again",
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 5,
      maxResubmissions: 0,
      dueAt: null,
      availableFrom: null,
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
    });
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-old",
      status: "SUBMITTED",
      attemptNumber: 1,
      userId: "learner",
      assignmentId: "asg-1",
    });
    await expect(
      service.createSubmission("org-a", "learner", "asg-1", {
        textAnswer: "resub",
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "RETURNED",
      assignmentId: "asg-1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
    });
    prisma.assignmentSubmission.update.mockResolvedValue({
      id: "sub-1",
      status: "RESUBMITTED",
    });
    await service.updateSubmission("org-a", "learner", "sub-1", {
      textAnswer: "retry",
    } as any);
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RESUBMITTED" }),
      }),
    );

    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: null,
      availableFrom: null,
      availableUntil: new Date(Date.now() - 1000),
      allowLateSubmission: true,
    });
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      assignmentId: "asg-1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
    });
    await expect(
      service.submitSubmission("org-a", "learner", "sub-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects late submission when late not allowed", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: new Date(Date.now() - 60_000),
      availableFrom: null,
      availableUntil: null,
      allowLateSubmission: false,
      submissions: [],
    });
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "DRAFT",
      assignmentId: "asg-1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
    });
    await expect(
      service.submitSubmission("org-a", "learner", "sub-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects assignment after availability window ends", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: null,
      availableFrom: null,
      availableUntil: new Date(Date.now() - 60_000),
      allowLateSubmission: true,
      submissions: [],
    });
    await expect(
      service.getLearnerAssignment("org-a", "learner", "asg-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects assignment before availability window", async () => {
    const { service, prisma } = setup();
    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "PUBLISHED",
      deletedAt: null,
      allowResubmission: true,
      maxAttempts: 3,
      maxResubmissions: 2,
      dueAt: null,
      availableFrom: new Date(Date.now() + 60_000),
      availableUntil: null,
      allowLateSubmission: true,
      submissions: [],
    });
    await expect(
      service.getLearnerAssignment("org-a", "learner", "asg-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects editing non-draft submissions and missing rubrics", async () => {
    const { service, prisma } = setup();
    prisma.assignmentSubmission.findFirst.mockResolvedValue({
      id: "sub-1",
      status: "SUBMITTED",
      assignmentId: "asg-1",
      userId: "learner",
      organizationId: "org-a",
      fileIds: [],
    });
    await expect(
      service.updateSubmission("org-a", "learner", "sub-1", {
        textAnswer: "nope",
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.assignment.findFirst.mockResolvedValue({
      id: "asg-1",
      courseId: "c1",
      organizationId: "org-a",
      activityId: null,
      status: "DRAFT",
      deletedAt: null,
    });
    prisma.rubric.findFirst.mockResolvedValue(null);
    await expect(
      service.updateAssignment(org as any, "u1", "asg-1", {
        rubricId: "missing",
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});


