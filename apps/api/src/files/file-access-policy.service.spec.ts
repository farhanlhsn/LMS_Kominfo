import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FileAccessPolicyService } from "./file-access-policy.service";

const baseOrganization = {
  id: "org_1",
  slug: "demo",
  name: "Demo",
  memberId: "member_1",
  roleKeys: [],
  permissionKeys: [],
  isPlatformAdmin: false,
};

function createService(file: Record<string, unknown> | null) {
  const prisma = {
    file: {
      findFirst: vi.fn().mockResolvedValue(file),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    courseInstructor: {
      findFirst: vi.fn(),
    },
  };
  return {
    service: new FileAccessPolicyService(prisma as never),
    prisma,
  };
}

describe("FileAccessPolicyService", () => {
  it("blocks cross-tenant file access by querying inside the active organization", async () => {
    const { service, prisma } = createService(null);

    await expect(
      service.ensureCanReadFile(baseOrganization, "user_1", "file_other_org"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.file.findFirst).toHaveBeenCalledWith({
      where: {
        id: "file_other_org",
        organizationId: "org_1",
        deletedAt: null,
      },
    });
  });

  it("allows enrolled learners only when a matching active enrollment exists", async () => {
    const { service, prisma } = createService({
      id: "file_1",
      ownerId: "owner_1",
      visibility: "ORGANIZATION",
      accessLevel: "ENROLLED_LEARNERS",
    });
    prisma.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });

    await expect(
      service.ensureCanReadFile(
        baseOrganization,
        "learner_1",
        "file_1",
        "course_1",
      ),
    ).resolves.toMatchObject({ id: "file_1" });
  });

  it("denies enrolled-learner files when course context is missing", async () => {
    const { service } = createService({
      id: "file_1",
      ownerId: "owner_1",
      visibility: "ORGANIZATION",
      accessLevel: "ENROLLED_LEARNERS",
    });

    await expect(
      service.ensureCanReadFile(baseOrganization, "learner_1", "file_1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("covers manage and read permission branches", async () => {
    const { service, prisma } = createService({
      id: "file_1",
      ownerId: "owner_1",
      visibility: "PRIVATE",
      accessLevel: "OWNER",
    });
    await expect(
      service.ensureCanManageFile(baseOrganization, "other", "file_1"),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.ensureCanManageFile(
        { ...baseOrganization, permissionKeys: ["files:delete"] },
        "other",
        "file_1",
      ),
    ).resolves.toMatchObject({ id: "file_1" });

    await expect(
      service.ensureCanReadFile(
        { ...baseOrganization, permissionKeys: ["files:read"] },
        "other",
        "file_1",
      ),
    ).resolves.toMatchObject({ id: "file_1" });

    const orgMembers = createService({
      id: "file_2",
      ownerId: "owner_1",
      visibility: "PRIVATE",
      accessLevel: "ORGANIZATION_MEMBERS",
    });
    await expect(
      orgMembers.service.ensureCanReadFile(
        baseOrganization,
        "member",
        "file_2",
      ),
    ).resolves.toMatchObject({ id: "file_2" });

    prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      service.ensureInstructorCanManageCourse(
        baseOrganization,
        "u1",
        "course_1",
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.ensureInstructorCanManageCourse(
        { ...baseOrganization, isPlatformAdmin: true },
        "u1",
        "course_1",
      ),
    ).resolves.toBeUndefined();
  });
});

