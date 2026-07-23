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

  it("denies empty required permissions list", () => {
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
        []
      )
    ).toBe(false);
  });

  it("provisions organization roles with the permissions needed by learning flows", async () => {
    const permissions = Object.values(PERMISSIONS).map((key, index) => ({
      id: `perm-${index}`,
      key
    }));
    const prisma = {
      permission: {
        findMany: vi.fn().mockResolvedValue(permissions)
      },
      role: {
        upsert: vi.fn().mockImplementation(({ where, create }) =>
          Promise.resolve({
            id: `role-${where.organizationId_key.key}`,
            key: create.key
          })
        )
      },
      rolePermission: {
        upsert: vi.fn().mockResolvedValue({})
      },
      roleDelegation: {
        upsert: vi.fn().mockResolvedValue({})
      }
    };
    const service = new RbacService(prisma as never);

    await service.ensureOrganizationDefaults("org-1");

    const rolePermissionCalls = prisma.rolePermission.upsert.mock.calls.map(
      ([call]) => call
    );
    const permissionIdsForRole = (roleKey: string) =>
      rolePermissionCalls
        .filter((call) =>
          String(call.where.roleId_permissionId.roleId).endsWith(roleKey)
        )
        .map((call) => call.where.roleId_permissionId.permissionId);
    const permissionIdSetForRole = (roleKey: string) =>
      new Set(
        rolePermissionCalls
          .filter((call) =>
            String(call.where.roleId_permissionId.roleId).endsWith(roleKey)
          )
          .map((call) => call.where.roleId_permissionId.permissionId)
      );
    const permissionId = (key: string) =>
      permissions.find((permission) => permission.key === key)?.id;

    expect(permissionIdsForRole("org_admin")).not.toContain(
      permissionId(PERMISSIONS.platformAdmin)
    );
    expect(permissionIdsForRole("org_admin")).toContain(
      permissionId(PERMISSIONS.rolesManage)
    );
    expect(permissionIdsForRole("instructor")).toEqual(
      expect.arrayContaining([
        permissionId(PERMISSIONS.coursesUpdate),
        permissionId(PERMISSIONS.quizManage),
        permissionId(PERMISSIONS.assignmentsManage),
        permissionId(PERMISSIONS.contentLibraryManage)
      ])
    );
    expect(permissionIdSetForRole("learner")).toEqual(
      new Set([permissionId(PERMISSIONS.coursesRead)])
    );
  });
});
