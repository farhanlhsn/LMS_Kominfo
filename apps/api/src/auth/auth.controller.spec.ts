import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";
import { UnauthorizedException } from "@nestjs/common";

function createRequest() {
  return { headers: { "user-agent": "tester" }, ip: "127.0.0.1" } as any;
}

function setup(overrides: Record<string, any> = {}) {
  const service = {
    register: vi.fn().mockResolvedValue({ id: "u" }),
    login: vi.fn().mockResolvedValue({ tokens: { accessToken: "a", refreshToken: "r" } }),
    refresh: vi.fn().mockResolvedValue({ tokens: { accessToken: "a2", refreshToken: "r2" } }),
    me: vi.fn().mockResolvedValue({ id: "u" }),
    getOrganizations: vi.fn().mockResolvedValue([]),
    switchOrganization: vi.fn().mockResolvedValue({ tokens: { accessToken: "a3" } }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
  return { controller: new AuthController(service as any), service };
}

describe("AuthController", () => {
  it("passes metadata to login", async () => {
    const { controller, service } = setup();
    const request = createRequest();
    await controller.login({ email: "a@b.c", password: "secret" } as any, request);
    expect(service.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.c" }),
      expect.objectContaining({ ipAddress: "127.0.0.1", userAgent: "tester" })
    );
  });

  it("propagates login failure as UnauthorizedException", async () => {
    const { controller } = setup({ login: vi.fn().mockRejectedValue(new UnauthorizedException("nope")) });
    await expect(
      controller.login({ email: "a@b.c", password: "bad" } as any, createRequest())
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("exposes me endpoint through guard", async () => {
    const { controller, service } = setup();
    await controller.me({ id: "u" } as any);
    expect(service.me).toHaveBeenCalled();
  });

  it("switches organization with metadata", async () => {
    const { controller, service } = setup();
    const request = createRequest();
    await controller.switchOrganization(
      { id: "u" } as any,
      { organizationId: "org-2" } as any,
      request
    );
    expect(service.switchOrganization).toHaveBeenCalledWith(
      expect.anything(),
      "org-2",
      expect.objectContaining({ ipAddress: "127.0.0.1" })
    );
  });
});
