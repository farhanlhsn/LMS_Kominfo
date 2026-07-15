import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PluginPermissionService } from "./plugin-permission.service";

describe("PluginPermissionService", () => {
  it("ensures plugin enabled", async () => {
    const registry = {
      isEnabledForOrganization: vi.fn().mockResolvedValue(false),
      getPlugin: vi.fn(),
    };
    const rbac = { hasPermissions: vi.fn().mockReturnValue(true) };
    const service = new PluginPermissionService(rbac as any, registry as any);
    await expect(service.ensureEnabled("org", "p1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    registry.isEnabledForOrganization.mockResolvedValue(true);
    await expect(service.ensureEnabled("org", "p1")).resolves.toBeUndefined();
  });

  it("checks permissions", () => {
    const registry = {
      isEnabledForOrganization: vi.fn(),
      getPlugin: vi.fn().mockReturnValue({ key: "p1" }),
    };
    const rbac = { hasPermissions: vi.fn().mockReturnValue(false) };
    const service = new PluginPermissionService(rbac as any, registry as any);
    expect(() =>
      service.ensurePluginPermissions(
        { id: "org" } as any,
        "p1",
        ["plugins:configure"],
      ),
    ).toThrow(ForbiddenException);
    rbac.hasPermissions.mockReturnValue(true);
    expect(() =>
      service.ensurePluginPermissions(
        { id: "org" } as any,
        "p1",
        ["plugins:configure"],
      ),
    ).not.toThrow();
  });
});
