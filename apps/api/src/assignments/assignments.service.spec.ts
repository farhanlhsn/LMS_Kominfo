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
    activity: { findFirst: vi.fn().mockResolvedValue(activity), updateMany: vi.fn().mockResolvedValue(undefined) },
    rubric: { findFirst: vi.fn().mockResolvedValue({ id: "rub", organizationId: "org-a" }) },
    assignment: {
      findFirst: vi.fn().mockResolvedValue({ id: "asg-1", courseId: "c1", organizationId: "org-a", activityId: null, status: "DRAFT" }),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "asg-1", ...data })),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "asg-1", courseId: "c1", activityId: data.activityId, status: data.status })),
    },
    activityAssignment: { upsert: vi.fn().mockResolvedValue(undefined) },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  } as any;
  return { service: new AssignmentsService(prisma, undefined), prisma };
}

describe("AssignmentsService.createAssignment", () => {
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
