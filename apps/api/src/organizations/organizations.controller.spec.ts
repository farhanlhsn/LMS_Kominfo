import { describe, expect, it, vi } from "vitest";
import { OrganizationsController } from "./organizations.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: ["memberships:manage"], isPlatformAdmin: false };
const user = { id: "admin-a", email: "admin@example.com" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    listMembers: vi.fn().mockResolvedValue([
      {
        id: "m-1",
        status: "ACTIVE",
        user: { id: "u-1", email: "u@e.c", name: "Tester" },
        roles: ["org_admin"],
      },
    ]),
    createMember: vi.fn().mockResolvedValue({ id: "m-2" }),
    updateMemberRoles: vi.fn().mockResolvedValue({ id: "m-2" }),
    updateMemberStatus: vi.fn().mockResolvedValue({ id: "m-2" }),
    listRoles: vi.fn().mockResolvedValue([{ id: "r-1", key: "learner" }]),
    createRole: vi.fn().mockResolvedValue({ id: "r-2" }),
    updateRole: vi.fn().mockResolvedValue({ id: "r-2" }),
    listPermissions: vi.fn().mockResolvedValue([{ key: "courses:read" }]),
    ...overrides,
  };
  return { controller: new OrganizationsController(service as any), service };
}

describe("OrganizationsController", () => {
  it("lists organization members using the active organization id", async () => {
    const { controller, service } = setup();
    const response = await controller.listMembers("org-a", org);
    expect(service.listMembers).toHaveBeenCalledWith("org-a");
    expect(response).toEqual([
      {
        id: "m-1",
        status: "ACTIVE",
        user: { id: "u-1", email: "u@e.c", name: "Tester" },
        roles: ["org_admin"],
      },
    ]);
  });

  it("ignores the path organizationId and always uses the active org context", async () => {
    const { controller, service } = setup();
    await controller.listMembers("some-other-id", org);
    expect(service.listMembers).toHaveBeenCalledWith("org-a");
  });

  it("creates a member in the active organization as the current user", async () => {
    const { controller, service } = setup();
    const dto = {
      email: "learner@example.com",
      password: "password123",
      roleKeys: ["learner"],
    };
    await controller.createMember("other-org", org, user as any, dto);
    expect(service.createMember).toHaveBeenCalledWith("org-a", "admin-a", dto);
  });

  it("updates member roles and status in the active organization", async () => {
    const { controller, service } = setup();
    await controller.updateMemberRoles("other-org", "m-2", org, user as any, {
      roleKeys: ["instructor"],
    });
    await controller.updateMemberStatus("other-org", "m-2", org, user as any, {
      status: "SUSPENDED",
    });
    expect(service.updateMemberRoles).toHaveBeenCalledWith("org-a", "admin-a", "m-2", {
      roleKeys: ["instructor"],
    });
    expect(service.updateMemberStatus).toHaveBeenCalledWith("org-a", "admin-a", "m-2", {
      status: "SUSPENDED",
    });
  });

  it("lists and mutates roles in the active organization", async () => {
    const { controller, service } = setup();
    const createDto = {
      key: "teaching_assistant",
      name: "Teaching Assistant",
      permissionKeys: ["courses:read"],
    };
    const updateDto = {
      name: "Teaching Assistant",
      permissionKeys: ["courses:read", "quiz:manage"],
    };

    await controller.listRoles("other-org", org);
    await controller.createRole("other-org", org, user as any, createDto);
    await controller.updateRole("other-org", "r-2", org, user as any, updateDto);

    expect(service.listRoles).toHaveBeenCalledWith("org-a");
    expect(service.createRole).toHaveBeenCalledWith("org-a", "admin-a", createDto);
    expect(service.updateRole).toHaveBeenCalledWith("org-a", "admin-a", "r-2", updateDto);
  });

  it("lists platform permissions for role assignment", async () => {
    const { controller, service } = setup();
    const response = await controller.listPermissions("other-org");
    expect(service.listPermissions).toHaveBeenCalled();
    expect(response).toEqual([{ key: "courses:read" }]);
  });
});
