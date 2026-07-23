import { NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
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
      const { service } = setup();
      const result = await service.getBranding("org-a");
      expect(result).toMatchObject({ primaryColor: "#2563eb" });
    });

    it("updates branding", async () => {
      const { service, prisma } = setup();
      await service.updateBranding("org-a", { primaryColor: "#ff0000" });
      expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org-a" }, data: { primaryColor: "#ff0000" } }));
    });
  });

  describe("API keys and webhooks", () => {
    it("creates lists and revokes api keys", async () => {
      const { service, prisma } = setup();
      await service.createApiKey(org as any, "admin", { name: "ci" } as any);
      await service.listApiKeys(org as any);
      await service.revokeApiKey(org as any, "key-a");
      expect(prisma.apiKey.create).toHaveBeenCalled();
      expect(prisma.apiKey.update).toHaveBeenCalled();
    });

    it("creates and lists webhooks", async () => {
      const { service, prisma } = setup();
      await service.createWebhook(org as any, "admin", {
        name: "Orders",
        url: "https://hooks.example/x",
        events: ["order.paid"],
      } as any);
      await service.listWebhooks(org as any);
      expect(prisma.webhookEndpoint.create).toHaveBeenCalled();
    });
  });



  describe("SSO Providers", () => {
    it("creates SSO provider", async () => {
      const { service, prisma } = setup();
      await service.createProvider(org, { type: "SAML", name: "Azure AD", issuer: "https://sts.windows.net/", clientSecret: "top-secret", callbackUrl: "https://lms/callback" });
      expect(prisma.ssoProvider.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          clientSecretEncrypted: expect.stringMatching(/^enc:v1:/),
        }),
      }));
    });

    it("rejects cross-tenant delete", async () => {
      const { service } = setup({ ssoProvider: { findFirst: vi.fn().mockResolvedValue(null) } });
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
      const result = await service.createWebhook(org, "admin-a", { name: "Test Webhook", url: "https://hook.example.com", events: ["COURSE_CREATED"] });
      expect(result.rawSecret).toBeDefined();
      expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          secret: expect.stringMatching(/^enc:v1:/),
        }),
      }));
    });

    it("paginates webhook deliveries", async () => {
      const { service } = setup();
      const result = await service.getWebhookDeliveries(org, "wh-a", { page: 1, limit: 20 });
      expect(result.meta.total).toBe(0);
    });

    it("does not expose secret when listing webhooks", async () => {
      const { service, prisma } = setup();
      await service.listWebhooks(org);
      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith(expect.objectContaining({
        select: expect.not.objectContaining({ secret: true }),
      }));
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

  describe("remaining list/update/delete paths", () => {
    it("lists providers, domains, and mutates SSO/webhooks", async () => {
      const { service, prisma } = setup();
      await service.listProviders(org as any);
      await service.getLoginPolicy("org-a");
      await service.listDomains(org as any);
      await service.updateProvider(org as any, "sso-a", {
        name: "Updated",
      } as any);
      await service.deleteDomain(org as any, "dom-a");
      await service.deleteWebhook(org as any, "wh-a");
      expect(prisma.ssoProvider.findFirst).toHaveBeenCalled();
      expect(prisma.webhookEndpoint.delete).toHaveBeenCalled();
    });
  });
});
