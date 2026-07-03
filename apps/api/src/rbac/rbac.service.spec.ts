import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@lms/shared";
import { RbacService } from "./rbac.service";

function createService(member: unknown) {
  const prisma = {
    organizationMember: {
      findUnique: vi.fn().mockResolvedValue(member)
    }
  };

  return {
    prisma,
    service: new RbacService(prisma as never)
  };
}

describe("RbacService", () => {
  it("resolves permissions from the active organization membership", async () => {
    const { service } = createService({
      id: "member-1",
      status: "ACTIVE",
      organization: {
        id: "org-1",
        slug: "org-one",
        name: "Org One",
        status: "ACTIVE"
      },
      memberRoles: [
        {
          role: {
            key: "org_admin",
            rolePermissions: [
              {
                permission: {
                  key: PERMISSIONS.membershipsManage
                }
              }
            ]
          }
        }
      ]
    });

    const context = await service.getOrganizationContext("user-1", "org-1");

    expect(context.id).toBe("org-1");
    expect(context.permissionKeys).toContain(PERMISSIONS.membershipsManage);
    expect(service.hasPermissions(context, [PERMISSIONS.membershipsManage])).toBe(
      true
    );
  });

  it("blocks cross-tenant access when membership is missing", async () => {
    const { service } = createService(null);

    await expect(
      service.getOrganizationContext("user-1", "other-org")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("blocks suspended memberships", async () => {
    const { service } = createService({
      id: "member-1",
      status: "SUSPENDED",
      organization: {
        id: "org-1",
        slug: "org-one",
        name: "Org One",
        status: "ACTIVE"
      },
      memberRoles: []
    });

    await expect(
      service.getOrganizationContext("user-1", "org-1")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies missing permissions", () => {
    const { service } = createService(null);

    expect(
      service.hasPermissions(
        {
          id: "org-1",
          slug: "org-one",
          name: "Org One",
          memberId: "member-1",
          roleKeys: ["learner"],
          permissionKeys: [PERMISSIONS.coursesRead],
          isPlatformAdmin: false
        },
        [PERMISSIONS.membershipsManage]
      )
    ).toBe(false);
  });
});
