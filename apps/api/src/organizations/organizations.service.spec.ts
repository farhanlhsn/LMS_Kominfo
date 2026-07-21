import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { OrganizationsService } from "./organizations.service";

function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "m1",
    userId: "u1",
    status: "ACTIVE",
    joinedAt: new Date("2020-01-01"),
    user: { id: "u1", email: "u@e.c", name: "User" },
    memberRoles: [{ role: { key: "learner" } }],
    ...overrides,
  };
}

function setup() {
  const tx = {
    user: { create: vi.fn() },
    organizationMember: {
      upsert: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    memberRole: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    rolePermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    role: { update: vi.fn() },
  };
  const prisma = {
    organizationMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const notifications = {
    createForUser: vi.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    sendOrganizationInvite: vi.fn().mockResolvedValue(undefined),
  };
  const service = new OrganizationsService(
    prisma as any,
    notifications as any,
    emailService as any,
  );
  return { service, prisma, tx, notifications, emailService };
}

describe("OrganizationsService", () => {
  it("lists members and roles and permissions", async () => {
    const { service, prisma } = setup();
    prisma.organizationMember.findMany.mockResolvedValue([memberRow()]);
    prisma.role.findMany.mockResolvedValue([
      {
        id: "r1",
        key: "learner",
        name: "Learner",
        description: null,
        isSystem: true,
        rolePermissions: [
          { permission: { key: "courses:read", description: null } },
        ],
      },
    ]);
    prisma.permission.findMany.mockResolvedValue([{ key: "courses:read" }]);

    expect(await service.listMembers("org-1")).toEqual([
      {
        id: "m1",
        status: "ACTIVE",
        user: { id: "u1", email: "u@e.c", name: "User" },
        roles: ["learner"],
      },
    ]);
    expect(await service.listRoles("org-1")).toEqual([
      {
        id: "r1",
        key: "learner",
        name: "Learner",
        description: null,
        isSystem: true,
        permissions: [{ key: "courses:read", description: null }],
      },
    ]);
    expect(await service.listPermissions()).toEqual([{ key: "courses:read" }]);
  });

  it("createMember requires password for new users", async () => {
    const { service, prisma } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.createMember("org-1", "admin", {
        email: "new@e.c",
        roleKeys: ["learner"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("createMember creates user and membership", async () => {
    const { service, prisma, tx } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: "u-new", email: "new@e.c" });
    tx.organizationMember.upsert.mockResolvedValue({ id: "m-new" });
    tx.organizationMember.findFirstOrThrow.mockResolvedValue(
      memberRow({
        id: "m-new",
        userId: "u-new",
        user: { id: "u-new", email: "new@e.c", name: null },
      }),
    );

    const result = await service.createMember("org-1", "admin", {
      email: " New@e.c ",
      password: "Secret123!",
      name: "  New  ",
      roleKeys: ["learner"],
    });
    expect(result.id).toBe("m-new");
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("createMember reuses existing user", async () => {
    const { service, prisma, tx } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "u@e.c" });
    tx.organizationMember.upsert.mockResolvedValue({ id: "m1" });
    tx.organizationMember.findFirstOrThrow.mockResolvedValue(memberRow());
    await service.createMember("org-1", "admin", {
      email: "u@e.c",
      roleKeys: [],
    });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it("inviteMember rejects active members and invites new", async () => {
    const { service, prisma, tx, notifications, emailService } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "u@e.c" });
    prisma.organizationMember.findUnique.mockResolvedValue({
      status: "ACTIVE",
    });
    await expect(
      service.inviteMember("org-1", "admin", { email: "u@e.c" }),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.organizationMember.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: "u2", email: "n@e.c" });
    tx.organizationMember.upsert.mockResolvedValue({ id: "m2" });
    tx.organizationMember.findFirstOrThrow.mockResolvedValue(
      memberRow({
        id: "m2",
        userId: "u2",
        status: "INVITED",
        user: { id: "u2", email: "n@e.c", name: null },
      }),
    );
    prisma.organization.findUnique.mockResolvedValue({ name: "Acme" });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Admin" });

    // re-setup invite path cleanly
    const s2 = setup();
    s2.prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    s2.prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Admin" });
    s2.tx.user.create.mockResolvedValue({ id: "u2", email: "n@e.c" });
    s2.tx.organizationMember.upsert.mockResolvedValue({ id: "m2" });
    s2.tx.organizationMember.findFirstOrThrow.mockResolvedValue(
      memberRow({
        id: "m2",
        userId: "u2",
        status: "INVITED",
        user: { id: "u2", email: "n@e.c", name: null },
      }),
    );
    s2.prisma.organization.findUnique.mockResolvedValue({ name: "Acme" });

    const invited = await s2.service.inviteMember("org-1", "admin", {
      email: "n@e.c",
      message: "hi",
    });
    expect(invited.status).toBe("INVITED");
    expect(s2.notifications.createForUser).toHaveBeenCalled();
    expect(s2.emailService.sendOrganizationInvite).toHaveBeenCalled();
  });

  it("updateMemberRoles and status", async () => {
    const { service, prisma, tx } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r2", key: "instructor" }]);
    prisma.organizationMember.findFirst.mockResolvedValue(
      memberRow({
        memberRoles: [{ role: { key: "learner" } }],
      }),
    );
    tx.organizationMember.findFirstOrThrow.mockResolvedValue(
      memberRow({
        memberRoles: [{ role: { key: "instructor" } }],
      }),
    );
    prisma.organizationMember.update.mockResolvedValue(
      memberRow({ status: "SUSPENDED" }),
    );

    const roles = await service.updateMemberRoles("org-1", "admin", "m1", {
      roleKeys: ["instructor"],
    });
    expect(roles.roles).toEqual(["instructor"]);

    const status = await service.updateMemberStatus("org-1", "admin", "m1", {
      status: "SUSPENDED",
    });
    expect(status.status).toBe("SUSPENDED");
  });

  it("blocks removing last org admin", async () => {
    const { service, prisma } = setup();
    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.organizationMember.findFirst.mockResolvedValue(
      memberRow({
        memberRoles: [{ role: { key: "org_admin" } }],
      }),
    );
    prisma.organizationMember.count.mockResolvedValue(0);
    await expect(
      service.updateMemberRoles("org-1", "admin", "m1", {
        roleKeys: ["learner"],
      }),
    ).rejects.toThrow(/at least one active organization admin/i);
  });

  it("createRole and updateRole", async () => {
    const { service, prisma, tx } = setup();
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([
      { id: "p1", key: "courses:read" },
    ]);
    prisma.role.create.mockResolvedValue({
      id: "r-new",
      key: "ta",
      name: "TA",
      description: null,
      isSystem: false,
      rolePermissions: [
        { permission: { key: "courses:read", description: null } },
      ],
    });
    const created = await service.createRole("org-1", "admin", {
      key: "TA",
      name: "TA",
      permissionKeys: ["courses:read"],
    });
    expect(created.key).toBe("ta");

    prisma.role.findUnique.mockResolvedValue({ id: "r-new" });
    await expect(
      service.createRole("org-1", "admin", {
        key: "ta",
        name: "TA",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.role.findFirst.mockResolvedValue({
      id: "r-sys",
      key: "org_admin",
      isSystem: true,
      rolePermissions: [],
    });
    await expect(
      service.updateRole("org-1", "admin", "r-sys", {
        permissionKeys: ["courses:read"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.role.findFirst.mockResolvedValue(null);
    await expect(
      service.updateRole("org-1", "admin", "missing", { name: "X" }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.role.findFirst.mockResolvedValue({
      id: "r-custom",
      key: "custom",
      isSystem: false,
      rolePermissions: [],
    });
    prisma.permission.findMany.mockResolvedValue([
      { id: "p1", key: "courses:read" },
    ]);
    tx.role.update.mockResolvedValue({
      id: "r-custom",
      key: "custom",
      name: "Custom",
      description: "d",
      isSystem: false,
      rolePermissions: [
        { permission: { key: "courses:read", description: null } },
      ],
    });
    const updated = await service.updateRole("org-1", "admin", "r-custom", {
      name: "Custom",
      description: "d",
      permissionKeys: ["courses:read"],
    });
    expect(updated.name).toBe("Custom");
  });

  it("validates role and permission keys", async () => {
    const { service, prisma } = setup();
    prisma.role.findMany.mockResolvedValue([]);
    await expect(
      service.createMember("org-1", "admin", {
        email: "a@b.c",
        password: "x",
        roleKeys: ["nope"],
      }),
    ).rejects.toThrow(/Unknown role/);

    prisma.role.findMany.mockResolvedValue([{ id: "r1", key: "learner" }]);
    prisma.role.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([]);
    await expect(
      service.createRole("org-1", "admin", {
        key: "x",
        name: "X",
        permissionKeys: ["missing:perm"],
      }),
    ).rejects.toThrow(/Unknown permission/);
  });

  it("throws when member missing", async () => {
    const { service, prisma } = setup();
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    await expect(
      service.updateMemberStatus("org-1", "admin", "m-missing", {
        status: "ACTIVE",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
