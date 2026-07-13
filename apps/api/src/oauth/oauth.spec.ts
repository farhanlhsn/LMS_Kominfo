import { describe, expect, it, vi } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MfaService, generateTotpCode } from "./mfa.service";
import { OAuthService } from "./oauth.service";
import { SessionService } from "./session.service";
import { MockCaptchaProvider } from "./captcha.provider";

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "current-s",
  role: "admin",
  isPlatformAdmin: true,
  activeOrganizationId: "org-1",
};

const organization = {
  id: "org-1",
  slug: "o1",
  name: "Org",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: [],
  isPlatformAdmin: true,
};

function buildOauthPrisma() {
  const accounts = new Map<string, any>();
  return {
    oAuthAccount: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.provider_providerUserId) {
          const key = `${where.provider_providerUserId.provider}:${where.provider_providerUserId.providerUserId}`;
          for (const [k, v] of accounts.entries()) {
            if (k === key) return v;
          }
        }
        return null;
      }),
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const key = `${where.provider_providerUserId.provider}:${where.provider_providerUserId.providerUserId}`;
        const existing = accounts.get(key);
        const merged = { id: existing?.id ?? `oa-${accounts.size + 1}`, ...existing, ...create, ...update };
        accounts.set(key, merged);
        return merged;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        for (const [, v] of accounts) {
          if (v.id === where.id) {
            return { ...v, ...data };
          }
        }
        return null;
      }),
      findMany: vi.fn(async () => Array.from(accounts.values())),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const v of accounts.values()) {
          if (where?.id && v.id === where.id && v.userId === where.userId) {
            return v;
          }
        }
        return null;
      }),
      delete: vi.fn(async ({ where }: any) => {
        for (const [k, v] of accounts) {
          if (v.id === where.id) {
            accounts.delete(k);
            return v;
          }
        }
        return null;
      }),
    },
  };
}

describe("MockCaptchaProvider", () => {
  const captcha = new MockCaptchaProvider();

  it("accepts any non-trivial token", async () => {
    const result = await captcha.verify("captcha-test");
    expect(result.valid).toBe(true);
  });

  it("rejects empty or marked invalid tokens", async () => {
    expect((await captcha.verify("")).valid).toBe(false);
    expect((await captcha.verify(null)).valid).toBe(false);
    expect((await captcha.verify("INVALID")).valid).toBe(false);
    expect((await captcha.verify("bad-x")).valid).toBe(false);
  });
});

describe("OAuthService", () => {
  it("builds a provider start URL with state", async () => {
    const prisma: any = buildOauthPrisma();
    const service = new OAuthService(prisma);
    const { authorizeUrl, state } = await service.start("GOOGLE", "http://localhost:3000");
    expect(authorizeUrl).toContain("accounts.mock/google");
    expect(state).toBeTruthy();
  });

  it("exchanges a callback and updates the existing account", async () => {
    const prisma: any = buildOauthPrisma();
    const service = new OAuthService(prisma);
    // Seed an existing account by directly calling the service.
    await service.linkAccount(user.id, organization, "GOOGLE", {
      providerUserId: "google-abcd",
      email: "abc@example.com",
      raw: {},
    });
    const { state } = await service.start("GOOGLE", "http://localhost:3000");
    const result = await service.callback("GOOGLE", "abcd", "org-1", state);
    expect(result.linked).toBe(true);
    expect(result.account!.userId).toBe(user.id);
  });

  it("returns a fresh profile for a new code", async () => {
    const prisma: any = buildOauthPrisma();
    const service = new OAuthService(prisma);
    const { state } = await service.start("MICROSOFT", "http://localhost:3000");
    const result = await service.callback("MICROSOFT", "xyzw", "org-1", state);
    expect(result.profile).toBeDefined();
    expect(result.profile!.provider).toBe("MICROSOFT");
    expect(result.linked).toBeUndefined();
  });

  it("rejects empty callback codes", async () => {
    const prisma: any = buildOauthPrisma();
    const service = new OAuthService(prisma);
    const { state } = await service.start("GOOGLE", "http://localhost:3000");
    await expect(service.callback("GOOGLE", "", "org-1", state)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects callback without matching state", async () => {
    const prisma: any = buildOauthPrisma();
    const service = new OAuthService(prisma);
    await expect(
      service.callback("GOOGLE", "abcd", "org-1", undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("MfaService", () => {
  function buildPrisma() {
    const factors: any[] = [];
    return {
      mfaFactor: {
        create: vi.fn(async (args: any) => {
          const created = { id: `f-${factors.length + 1}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
          factors.push(created);
          return created;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          for (const f of factors) {
            if (where?.userId && f.userId !== where.userId) continue;
            if (where?.type && f.type !== where.type) continue;
            return f;
          }
          return null;
        }),
        findMany: vi.fn(async () => [...factors]),
        update: vi.fn(async ({ where, data }: any) => {
          const factor = factors.find((f) => f.id === where.id);
          if (!factor) return null;
          Object.assign(factor, data);
          return factor;
        }),
        deleteMany: vi.fn(async ({ where }: any) => {
          const remaining = factors.filter((f) => {
            if (where?.userId && f.userId !== where.userId) return true;
            if (where?.type && f.type !== where.type) return true;
            return false;
          });
          const removed = factors.length - remaining.length;
          factors.length = 0;
          factors.push(...remaining);
          return { count: removed };
        }),
      },
    };
  }

  it("enrolls a TOTP factor and returns a secret", async () => {
    const prisma: any = buildPrisma();
    const service = new MfaService(prisma);
    const result = await service.enroll(organization, user, "TOTP");
    expect(result.type).toBe("TOTP");
    expect(result.otpauthUrl).toContain("otpauth://totp");
    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("enrolls backup codes", async () => {
    const prisma: any = buildPrisma();
    const service = new MfaService(prisma);
    const result = await service.enroll(organization, user, "BACKUP_CODE");
    expect(result.codes).toHaveLength(8);
  });

  it("verifies a TOTP code and updates the factor", async () => {
    const prisma: any = buildPrisma();
    const service = new MfaService(prisma);
    const enroll = await service.enroll(organization, user, "TOTP");
    // Compute the current TOTP code using the service's own generator.
    const secret = Buffer.from(prisma.mfaFactor.create.mock.calls[0][0].data.secret, "hex");
    const otp = generateTotpCode(secret, Date.now());
    const result = await service.verify(user.id, otp);
    expect(result.valid).toBe(true);
  });

  it("rejects unknown TOTP codes", async () => {
    const prisma: any = buildPrisma();
    const service = new MfaService(prisma);
    await service.enroll(organization, user, "TOTP");
    await expect(service.verify(user.id, "000000")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("disables a factor", async () => {
    const prisma: any = buildPrisma();
    const service = new MfaService(prisma);
    await service.enroll(organization, user, "BACKUP_CODE");
    const result = await service.disable(user.id, "BACKUP_CODE");
    expect(result.removed).toBe(1);
  });
});

describe("SessionService", () => {
  function buildPrisma() {
    const sessions: any[] = [];
    return {
      userSession: {
        findMany: vi.fn(async ({ where }: any) => {
          return sessions.filter((s) => {
            if (where?.userId && s.userId !== where.userId) return false;
            if (where?.revokedAt === null && s.revokedAt != null) return false;
            if (where?.expiresAt?.gt) {
              if (new Date(s.expiresAt) <= where.expiresAt.gt) return false;
            }
            return true;
          });
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            sessions.find(
              (s) =>
                s.id === where.id && s.userId === where.userId,
            ) ?? null
          );
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const s = sessions.find((x) => x.id === where.id);
          if (s) Object.assign(s, data);
          return s ?? null;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const s of sessions) {
            if (where?.userId && s.userId !== where.userId) continue;
            if (where?.revokedAt === null && s.revokedAt != null) continue;
            if (where?.NOT?.id && where.NOT.id === s.id) continue;
            if (where?.id?.in && !where.id.in.includes(s.id)) continue;
            Object.assign(s, data);
            count += 1;
          }
          return { count };
        }),
        create: vi.fn(async (args: any) => {
          const created = {
            id: `s-${sessions.length + 1}`,
            createdAt: new Date(),
            revokedAt: null,
            ...args.data,
          };
          sessions.push(created);
          return created;
        }),
      },
      _sessions: sessions,
    };
  }

  it("lists only active sessions", async () => {
    const prisma: any = buildPrisma();
    const service = new SessionService(prisma);
    await service.recordSession(user.id, {
      refreshTokenHash: "h1",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await service.recordSession(user.id, {
      refreshTokenHash: "h2",
      expiresAt: new Date(Date.now() - 1000),
    });
    const list = await service.listSessions(user.id);
    expect(list).toHaveLength(1);
  });

  it("prevents revoking the current session through this endpoint", async () => {
    const prisma: any = buildPrisma();
    const service = new SessionService(prisma);
    const created = await service.recordSession(user.id, {
      refreshTokenHash: "h-current",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await expect(
      service.revokeSession({ ...user, sessionId: created.id }, created.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("revokes all other sessions", async () => {
    const prisma: any = buildPrisma();
    const service = new SessionService(prisma);
    const first = await service.recordSession(user.id, {
      refreshTokenHash: "h-current",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await service.recordSession(user.id, {
      refreshTokenHash: "h-other",
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const result = await service.revokeAll({ ...user, sessionId: first.id });
    expect(result.revoked).toBe(1);
  });

  it("rejects revoking a missing session", async () => {
    const prisma: any = buildPrisma();
    const service = new SessionService(prisma);
    await expect(
      service.revokeSession(user, "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
