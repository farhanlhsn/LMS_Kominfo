import { describe, expect, it, vi } from "vitest";
import { OrganizationsController } from "./organizations.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: ["memberships:manage"], isPlatformAdmin: false };

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
});
