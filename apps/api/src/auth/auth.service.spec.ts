import { ForbiddenException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

function createAuthService(overrides?: {
  loginPolicy?: { allowPasswordLogin: boolean } | null;
}) {
  const prisma = {
    user: {
      findUnique: vi.fn()
    },
    organizationLoginPolicy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.loginPolicy ?? {
          allowPasswordLogin: true
        }
      )
    },
    userIdentity: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn()
    },
    userSession: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  const jwtService = {
    signAsync: vi.fn(async (payload: { type: string }) =>
      payload.type === "access" ? "access-token" : "refresh-token"
    )
  };

  const rbacService = {
    ensureOrganizationDefaults: vi.fn(),
    getOrganizationContext: vi.fn()
  };

  return {
    prisma,
    jwtService,
    service: new AuthService(
      prisma as never,
      jwtService as never,
      rbacService as never
    )
  };
}

describe("AuthService", () => {
  it("logs in with email/password and creates a tenant-scoped session", async () => {
    const { prisma, service } = createAuthService();
    const passwordHash = await bcrypt.hash("Password123!", 4);

    prisma.user.findUnique.mockResolvedValue({
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
            status: "ACTIVE"
          }
        }
      ]
    });

    const result = await service.login(
      {
        email: "learner@example.com",
        password: "Password123!"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "test"
      }
    );

    expect(result.tokens.accessToken).toBe("access-token");
    expect(result.tokens.refreshToken).toBe("refresh-token");
    expect(result.activeOrganization?.id).toBe("org-1");
    expect(prisma.userSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          activeOrganizationId: "org-1"
        })
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "auth.login_success",
          organizationId: "org-1"
        })
      })
    );
  });

  it("rejects password login when organization policy disables it", async () => {
    const { prisma, service } = createAuthService({
      loginPolicy: {
        allowPasswordLogin: false
      }
    });
    const passwordHash = await bcrypt.hash("Password123!", 4);

    prisma.user.findUnique.mockResolvedValue({
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
            status: "ACTIVE"
          }
        }
      ]
    });

    await expect(
      service.login(
        {
          email: "learner@example.com",
          password: "Password123!"
        },
        {}
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
