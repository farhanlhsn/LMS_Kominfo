import { describe, expect, it, vi } from "vitest";
import { LocaleService } from "./locale.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["admin"],
  permissionKeys: ["organizations:manage"],
  isPlatformAdmin: false,
};

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "admin",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

function setup() {
  const userPrefs = new Map<string, Record<string, any>>();
  let orgPref: Record<string, any> | null = null;
  const auditLogs: Record<string, unknown>[] = [];

  const prisma: any = {
    userLocalePreference: {
      findUnique: vi.fn(async (args: any) =>
        userPrefs.get(`${args.where.organizationId_userId.organizationId}::${args.where.organizationId_userId.userId}`) ?? null,
      ),
      upsert: vi.fn(async (args: any) => {
        const key = `${args.where.organizationId_userId.organizationId}::${args.where.organizationId_userId.userId}`;
        const existing = userPrefs.get(key);
        const next = { ...(existing ?? {}), ...args.update, ...args.create };
        userPrefs.set(key, next);
        return next;
      }),
    },
    orgLocalePreference: {
      findUnique: vi.fn(async () => orgPref),
      upsert: vi.fn(async (args: any) => {
        const existing = orgPref;
        orgPref = { ...(existing ?? {}), ...args.update, ...args.create };
        return orgPref;
      }),
    },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
  };
  const service = new LocaleService(prisma);
  return { service, prisma, userPrefs, getOrgPref: () => orgPref, auditLogs };
}

describe("LocaleService", () => {
  it("returns the default preference when none is stored", async () => {
    const { service } = setup();
    const result = await service.getUserPreference(org.id, user.id);
    expect(result.locale).toBe("en");
  });

  it("upserts a user preference", async () => {
    const { service } = setup();
    const updated = await service.updateUserPreference(org.id, user.id, {
      locale: "id",
      timezone: "Asia/Jakarta",
      fallbackChain: ["en"],
    });
    expect(updated).toMatchObject({ locale: "id", timezone: "Asia/Jakarta" });
  });

  it("normalizes an empty fallback chain", async () => {
    const { service } = setup();
    const updated = await service.updateUserPreference(org.id, user.id, {
      fallbackChain: [],
    });
    expect(Array.isArray(updated.fallbackChain)).toBe(true);
    expect((updated.fallbackChain as string[]).length).toBeGreaterThan(0);
  });

  it("updates the org preference and audits", async () => {
    const { service, auditLogs } = setup();
    const updated = await service.updateOrgPreference(org, user.id, {
      defaultLocale: "id",
      supportedLocales: ["en", "id"],
      fallbackChain: ["en"],
    });
    expect(updated).toMatchObject({ defaultLocale: "id" });
    expect(auditLogs).toHaveLength(1);
  });

  it("resolves an effective locale using the user override and org chain", async () => {
    const { service, getOrgPref } = setup();
    getOrgPref();
    await service.updateOrgPreference(org, user.id, {
      defaultLocale: "en",
      supportedLocales: ["en", "id", "fr"],
      fallbackChain: ["en", "id"],
    });
    await service.updateUserPreference(org.id, user.id, {
      locale: "fr",
      fallbackChain: ["id"],
    });
    const result = await service.resolveEffectiveLocale(org.id, user.id);
    expect(result.locale).toBe("fr");
    expect(result.supportedLocales).toEqual(["en", "id", "fr"]);
  });

  it("falls back to the org default when the user preference is not supported", async () => {
    const { service } = setup();
    await service.updateOrgPreference(org, user.id, {
      defaultLocale: "en",
      supportedLocales: ["en", "id"],
    });
    await service.updateUserPreference(org.id, user.id, {
      locale: "xx",
      fallbackChain: ["en"],
    });
    const result = await service.resolveEffectiveLocale(org.id, user.id);
    expect(["en", "id"]).toContain(result.locale);
  });
});
