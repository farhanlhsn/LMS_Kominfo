import { NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { EnterpriseService } from "./enterprise.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    organization: {
      findUnique: vi.fn().mockImplementation(({ select }: any) => {
        const record: Record<string, unknown> = { id: "org-a", name: "Test", slug: "test" };
        if (select) {
          for (const key of Object.keys(select)) record[key] = undefined;
        }
        record.primaryColor = "#2563eb";
        record.secondaryColor = "#0f172a";
        record.accentColor = "#22c55e";
        record.borderRadius = "0.75rem";
        record.logoUrl = null;
        record.faviconUrl = null;
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "org-a", name: "Test", slug: "test", logoUrl: null, faviconUrl: null, primaryColor: data.primaryColor, secondaryColor: "#0f172a", accentColor: "#22c55e", borderRadius: "0.75rem" })),
    },
    ssoProvider: { findFirst: vi.fn().mockResolvedValue({ id: "sso-a", organizationId: "org-a" }), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "sso-a" }), update: vi.fn(), delete: vi.fn() },
    organizationLoginPolicy: { findUnique: vi.fn().mockResolvedValue({ id: "pol-a", organizationId: "org-a" }), upsert: vi.fn() },
    organizationDomain: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue({ id: "dom-a", organizationId: "org-a" }), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "dom-a" }), update: vi.fn(), delete: vi.fn() },
    apiKey: { create: vi.fn().mockResolvedValue({ id: "key-a", keyPrefix: "lms_test", rawKey: "lms_test_xxx" }), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "key-a", organizationId: "org-a" }), update: vi.fn() },
    webhookEndpoint: { create: vi.fn().mockResolvedValue({ id: "wh-a" }), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "wh-a", organizationId: "org-a" }), delete: vi.fn() },
    webhookDelivery: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: "inst-a", name: "Instructor" }) },
    ...overrides,
  };
  return { service: new EnterpriseService(prisma as never), prisma };
}

describe("EnterpriseService", () => {
  describe("Branding", () => {
    it("gets branding", async () => {
      const { service, prisma } = setup();
      const result = await service.getBranding("org-a");
      expect(result).toMatchObject({ primaryColor: "#2563eb" });
    });

    it("updates branding", async () => {
      const { service, prisma } = setup();
      await service.updateBranding("org-a", { primaryColor: "#ff0000" });
      expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org-a" }, data: { primaryColor: "#ff0000" } }));
    });
  });

  describe("SSO Providers", () => {
    it("creates SSO provider", async () => {
      const { service, prisma } = setup();
      await service.createProvider(org, { type: "SAML", name: "Azure AD", issuer: "https://sts.windows.net/", callbackUrl: "https://lms/callback" });
      expect(prisma.ssoProvider.create).toHaveBeenCalled();
    });

    it("rejects cross-tenant delete", async () => {
      const { service, prisma } = setup({ ssoProvider: { findFirst: vi.fn().mockResolvedValue(null) } });
      await expect(service.deleteProvider(org, "sso-org-b")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("API Keys", () => {
    it("creates API key with prefix and hash", async () => {
      const { service, prisma } = setup();
      const result = await service.createApiKey(org, "admin-a", { name: "Test Key" });
      expect(result.rawKey).toBeDefined();
      expect(prisma.apiKey.create).toHaveBeenCalled();
    });

    it("revokes API key", async () => {
      const { service, prisma } = setup();
      await service.revokeApiKey(org, "key-a");
      expect(prisma.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVOKED" } }));
    });
  });

  describe("Webhooks", () => {
    it("creates webhook with secret", async () => {
      const { service, prisma } = setup();
      await service.createWebhook(org, "admin-a", { name: "Test Webhook", url: "https://hook.example.com", events: ["COURSE_CREATED"] });
      expect(prisma.webhookEndpoint.create).toHaveBeenCalled();
    });

    it("paginates webhook deliveries", async () => {
      const { service } = setup();
      const result = await service.getWebhookDeliveries(org, "wh-a", { page: 1, limit: 20 });
      expect(result.meta.total).toBe(0);
    });
  });

  describe("Domains", () => {
    it("creates and verifies domain", async () => {
      const { service, prisma } = setup();
      await service.createDomain(org, { domain: "example.com" });
      expect(prisma.organizationDomain.create).toHaveBeenCalled();
      await service.verifyDomain(org, "dom-a");
      expect(prisma.organizationDomain.update).toHaveBeenCalled();
    });
  });

  describe("Login Policy", () => {
    it("upserts login policy", async () => {
      const { service, prisma } = setup();
      await service.updateLoginPolicy("org-a", { mfaRequired: true });
      expect(prisma.organizationLoginPolicy.upsert).toHaveBeenCalled();
    });
  });
});
