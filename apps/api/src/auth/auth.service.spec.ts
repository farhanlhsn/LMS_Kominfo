import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

function createAuthService(overrides?: {
  loginPolicy?: { allowPasswordLogin: boolean } | null;
}) {
  const prisma: any = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationLoginPolicy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.loginPolicy ?? {
          allowPasswordLogin: true,
        },
      ),
    },
    userIdentity: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const jwtService = {
    signAsync: vi.fn(async (payload: { type: string }) =>
      payload.type === "access" ? "access-token" : "refresh-token",
    ),
    verifyAsync: vi.fn(),
  };

  const rbacService = {
    ensureOrganizationDefaults: vi.fn(),
    getOrganizationContext: vi.fn().mockResolvedValue({ id: "org-1" }),
  };

  const emailService = {
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  };

  return {
    prisma,
    jwtService,
    rbacService,
    emailService,
    service: new AuthService(
      prisma as never,
      jwtService as never,
      rbacService as never,
      emailService as never,
    ),
  };
}

function activeUser(passwordHash: string) {
  return {
    id: "user-1",
    email: "learner@example.com",
    name: "Learner",
    passwordHash,
    status: "ACTIVE",
    memberships: [
      {
        organizationId: "org-1",
        status: "ACTIVE",
        organization: {
          id: "org-1",
          slug: "org-one",
          name: "Org One",
          status: "ACTIVE",
        },
      },
    ],
  };
}

describe("AuthService", () => {
  it("logs in with email/password and creates a tenant-scoped session", async () => {
    const { prisma, service } = createAuthService();
    const passwordHash = await bcrypt.hash("Password123!", 4);
    prisma.user.findUnique.mockResolvedValue(activeUser(passwordHash));

    const result = await service.login(
      { email: "learner@example.com", password: "Password123!" },
      { ipAddress: "127.0.0.1", userAgent: "test" },
    );

    expect(result.tokens.accessToken).toBe("access-token");
    expect(result.activeOrganization?.id).toBe("org-1");
    expect(prisma.userSession.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "auth.login_success" }),
      }),
    );
  });

  it("rejects password login when organization policy disables it", async () => {
    const { prisma, service } = createAuthService({
      loginPolicy: { allowPasswordLogin: false },
    });
    const passwordHash = await bcrypt.hash("Password123!", 4);
    prisma.user.findUnique.mockResolvedValue(activeUser(passwordHash));
    await expect(
      service.login(
        { email: "learner@example.com", password: "Password123!" },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects invalid credentials", async () => {
    const { prisma, service } = createAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: "x@y.z", password: "nope" }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const passwordHash = await bcrypt.hash("Password123!", 4);
    prisma.user.findUnique.mockResolvedValue(activeUser(passwordHash));
    await expect(
      service.login(
        { email: "learner@example.com", password: "WrongPassword1!" },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects login without active membership", async () => {
    const { prisma, service } = createAuthService();
    const passwordHash = await bcrypt.hash("Password123!", 4);
    const user = activeUser(passwordHash);
    user.memberships = [];
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.login(
        { email: "learner@example.com", password: "Password123!" },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refreshes session tokens", async () => {
    const { prisma, jwtService, service } = createAuthService();
    const refreshToken = "refresh-token";
    const tokenHash = await bcrypt.hash(refreshToken, 4);
    jwtService.verifyAsync.mockResolvedValue({
      type: "refresh",
      sub: "user-1",
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash,
      activeOrganizationId: "org-1",
      user: { id: "user-1", email: "a@b.c", name: "A" },
      activeOrganization: { id: "org-1", slug: "o", name: "Org" },
    });
    const result = await service.refresh(refreshToken, {});
    expect(result.tokens.accessToken).toBe("access-token");
    expect(prisma.userSession.update).toHaveBeenCalled();
  });

  it("rejects invalid refresh and reuse", async () => {
    const { prisma, jwtService, service } = createAuthService();
    jwtService.verifyAsync.mockRejectedValue(new Error("bad"));
    await expect(service.refresh("x", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    jwtService.verifyAsync.mockResolvedValue({
      type: "access",
      sub: "u",
      sessionId: "s",
    });
    await expect(service.refresh("x", {})).rejects.toThrow(/Invalid/);

    jwtService.verifyAsync.mockResolvedValue({
      type: "refresh",
      sub: "user-1",
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: await bcrypt.hash("other", 4),
      activeOrganizationId: null,
      user: { id: "user-1", email: "a@b.c", name: null },
      activeOrganization: null,
    });
    await expect(service.refresh("refresh-token", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revokedReason: "refresh_token_reuse_detected",
        }),
      }),
    );
  });

  it("me, organizations, switch, logout", async () => {
    const { prisma, rbacService, service } = createAuthService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.c",
      name: "A",
    });
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        status: "ACTIVE",
        organization: { id: "org-1", slug: "o", name: "Org" },
      },
    ]);
    const me = await service.me({
      id: "user-1",
      email: "a@b.c",
      name: "A",
      sessionId: "s1",
      activeOrganizationId: "org-1",
    } as any);
    expect(me.organizations).toHaveLength(1);
    expect(rbacService.getOrganizationContext).toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.me({
        id: "missing",
        email: "x",
        sessionId: "s",
        activeOrganizationId: null,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    const switched = await service.switchOrganization(
      {
        id: "user-1",
        email: "a@b.c",
        sessionId: "s1",
        activeOrganizationId: "org-1",
      } as any,
      "org-2",
      {},
    );
    expect(switched.tokens.accessToken).toBe("access-token");

    await expect(
      service.logout(
        {
          id: "user-1",
          email: "a@b.c",
          sessionId: "s1",
          activeOrganizationId: "org-1",
        } as any,
        {},
      ),
    ).resolves.toEqual({ revoked: true });
  });

  it("registers a new organization admin", async () => {
    const { prisma, rbacService, service } = createAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "org-new",
        slug: "acme",
        name: "Acme",
      }),
    };
    prisma.user.create = vi.fn().mockResolvedValue({
      id: "user-new",
      email: "admin@acme.test",
      name: "Admin",
    });
    prisma.role = {
      findUnique: vi.fn().mockResolvedValue({ id: "role-admin" }),
    };
    prisma.organizationMember = {
      create: vi.fn().mockResolvedValue({ id: "mem-1" }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    prisma.userIdentity.create = vi.fn();
    prisma.userSession.create = vi.fn();

    const result = await service.register(
      {
        email: "admin@acme.test",
        password: "Password123!",
        name: "Admin",
        organizationName: "Acme",
        organizationSlug: "acme",
      } as any,
      {},
    );
    expect(result.activeOrganization?.slug).toBe("acme");
    expect(rbacService.ensureOrganizationDefaults).toHaveBeenCalledWith(
      "org-new",
    );
  });

  it("logs in with explicit organizationId and updates password identity", async () => {
    const { prisma, service } = createAuthService();
    const passwordHash = await bcrypt.hash("Password123!", 4);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.c",
      name: "A",
      status: "ACTIVE",
      passwordHash,
      memberships: [
        {
          organizationId: "org-1",
          status: "ACTIVE",
          organization: { id: "org-1", status: "ACTIVE", slug: "o", name: "O" },
        },
      ],
    });
    prisma.userIdentity.findFirst.mockResolvedValue({
      id: "id-1",
      providerType: "PASSWORD",
    });
    prisma.userSession.create.mockResolvedValue({ id: "s1" });
    const result = await service.login(
      {
        email: "a@b.c",
        password: "Password123!",
        organizationId: "org-1",
      } as any,
      {},
    );
    expect(result.tokens?.accessToken).toBeTruthy();
    expect(prisma.userIdentity.update).toHaveBeenCalled();
  });

  it("rejects inactive membership and disabled password policy", async () => {
    const { prisma, service } = createAuthService({
      loginPolicy: { allowPasswordLogin: false },
    });
    const passwordHash = await bcrypt.hash("Password123!", 4);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.c",
      name: "A",
      status: "ACTIVE",
      passwordHash,
      memberships: [
        {
          organizationId: "org-1",
          status: "SUSPENDED",
          organization: { id: "org-1", status: "ACTIVE", slug: "o", name: "O" },
        },
      ],
    });
    await expect(
      service.login(
        { email: "a@b.c", password: "Password123!", organizationId: "org-1" } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.c",
      name: "A",
      status: "ACTIVE",
      passwordHash,
      memberships: [
        {
          organizationId: "org-1",
          status: "ACTIVE",
          organization: { id: "org-1", status: "ACTIVE", slug: "o", name: "O" },
        },
      ],
    });
    await expect(
      service.login(
        { email: "a@b.c", password: "Password123!", organizationId: "org-1" } as any,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("forgot and reset password", async () => {
    const { prisma, emailService, service } = createAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await service.forgotPassword("missing@e.c")).toEqual({ sent: true });

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.c",
      name: "A",
      status: "ACTIVE",
    });
    expect(await service.forgotPassword("a@b.c")).toEqual({ sent: true });
    expect(emailService.sendPasswordReset).toHaveBeenCalled();

    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    await expect(service.resetPassword("bad", "NewPass123!")).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "t1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.resetPassword("good", "NewPass123!"),
    ).resolves.toEqual({ reset: true });
    expect(prisma.userSession.updateMany).toHaveBeenCalled();
  });

  it("register conflicts, missing role defaults, inactive refresh session", async () => {
    const { prisma, jwtService, service } = createAuthService();
    prisma.user.findUnique.mockResolvedValue({ id: "exists" });
    await expect(
      service.register(
        {
          email: "a@b.c",
          password: "Password123!",
          organizationName: "Acme",
        } as any,
        {},
      ),
    ).rejects.toThrow(/already registered/);

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization = {
      findUnique: vi.fn().mockResolvedValue({ id: "org-exists" }),
      create: vi.fn(),
    };
    await expect(
      service.register(
        {
          email: "a@b.c",
          password: "Password123!",
          organizationName: "Acme",
          organizationSlug: "acme",
        } as any,
        {},
      ),
    ).rejects.toThrow(/already in use/);

    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.organization.create = vi.fn().mockResolvedValue({
      id: "org-new",
      slug: "acme-co",
      name: "Acme Co!!!",
    });
    prisma.user.create = vi.fn().mockResolvedValue({
      id: "user-new",
      email: "a@b.c",
      name: null,
    });
    prisma.role = { findUnique: vi.fn().mockResolvedValue(null) };
    await expect(
      service.register(
        {
          email: "a@b.c",
          password: "Password123!",
          organizationName: "Acme Co!!!",
        } as any,
        {},
      ),
    ).rejects.toThrow(/role defaults/);

    jwtService.verifyAsync.mockResolvedValue({
      type: "refresh",
      sub: "user-1",
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "other",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: "x",
      user: { id: "other", email: "a@b.c", name: null },
      activeOrganization: null,
    });
    await expect(service.refresh("tok", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

