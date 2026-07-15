import { describe, expect, it, vi } from "vitest";
import { EnterpriseController } from "./enterprise.controller";

const org = { id: "org-1", slug: "demo", name: "Demo", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "a@b.c", name: "Tester", avatarUrl: null, role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-1" };

function setup(overrides: Record<string, any> = {}) {
  const enterprise = {
    getBranding: vi.fn().mockResolvedValue({ name: "Demo" }),
    updateBranding: vi.fn().mockResolvedValue({ name: "Demo", primaryColor: "#ff0000" }),
    listProviders: vi.fn().mockResolvedValue([{ id: "sso-1" }]),
    createProvider: vi.fn().mockResolvedValue({ id: "sso-2" }),
    updateProvider: vi.fn().mockResolvedValue({ id: "sso-1" }),
    deleteProvider: vi.fn().mockResolvedValue({ deleted: true }),
    getLoginPolicy: vi.fn().mockResolvedValue({ id: "pol-1" }),
    updateLoginPolicy: vi.fn().mockResolvedValue({ id: "pol-1" }),
    listDomains: vi.fn().mockResolvedValue([]),
    createDomain: vi.fn().mockResolvedValue({ id: "dom-1" }),
    verifyDomain: vi.fn().mockResolvedValue({ id: "dom-1" }),
    deleteDomain: vi.fn().mockResolvedValue({ deleted: true }),
    createApiKey: vi.fn().mockResolvedValue({ id: "key-1", rawKey: "secret" }),
    listApiKeys: vi.fn().mockResolvedValue([]),
    revokeApiKey: vi.fn().mockResolvedValue({ id: "key-1", status: "REVOKED" }),
    createWebhook: vi.fn().mockResolvedValue({ id: "wh-1" }),
    listWebhooks: vi.fn().mockResolvedValue([]),
    deleteWebhook: vi.fn().mockResolvedValue({ deleted: true }),
    getWebhookDeliveries: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    ...overrides,
  };
  return { controller: new EnterpriseController(enterprise as any), enterprise };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("EnterpriseController", () => {
  it("wraps branding in data envelope", async () => {
    const { controller, enterprise } = setup();
    const response = await controller.getBranding(createRequest());
    expect(response).toEqual({ data: { name: "Demo" } });
    expect(enterprise.getBranding).toHaveBeenCalledWith("org-1");
  });

  it("forwards branding update to service", async () => {
    const { controller, enterprise } = setup();
    const response = await controller.updateBranding(createRequest(), { primaryColor: "#ff0000" } as any);
    expect(enterprise.updateBranding).toHaveBeenCalledWith("org-1", expect.objectContaining({ primaryColor: "#ff0000" }));
    expect(response).toMatchObject({ data: { primaryColor: "#ff0000" } });
  });

  it("creates API key with the current user id", async () => {
    const { controller, enterprise } = setup();
    await controller.createApiKey(createRequest(), { name: "Test" } as any);
    expect(enterprise.createApiKey).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ name: "Test" }));
  });

  it("passes pagination to webhook deliveries", async () => {
    const { controller, enterprise } = setup();
    const response = await controller.getDeliveries(createRequest(), "wh-1", { page: 2, limit: 5 } as any);
    expect(enterprise.getWebhookDeliveries).toHaveBeenCalledWith(org, "wh-1", expect.objectContaining({ page: 2, limit: 5 }));
    expect(response).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("returns delete payload directly for SSO provider", async () => {
    const { controller, enterprise } = setup();
    const response = await controller.deleteProvider(createRequest(), "sso-1");
    expect(enterprise.deleteProvider).toHaveBeenCalledWith(org, "sso-1");
    expect(response).toEqual({ deleted: true });
  });

  it("forwards remaining enterprise endpoints", async () => {
    const { controller, enterprise } = setup();
    const req = createRequest();
    await controller.listProviders(req);
    await controller.createProvider(req, { name: "SSO" } as any);
    await controller.updateProvider(req, "sso-1", { name: "SSO2" } as any);
    await controller.getLoginPolicy(req);
    await controller.updateLoginPolicy(req, { mfaRequired: true } as any);
    await controller.listDomains(req);
    await controller.createDomain(req, { domain: "a.com" } as any);
    await controller.verifyDomain(req, "dom-1");
    await controller.deleteDomain(req, "dom-1");
    await controller.listApiKeys(req);
    await controller.revokeApiKey(req, "key-1");
    await controller.createWebhook(req, { name: "w", url: "https://x" } as any);
    await controller.listWebhooks(req);
    await controller.deleteWebhook(req, "wh-1");
    expect(enterprise.listProviders).toHaveBeenCalled();
    expect(enterprise.deleteWebhook).toHaveBeenCalledWith(org, "wh-1");
  });
});
