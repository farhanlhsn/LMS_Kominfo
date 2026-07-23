import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PluginEntitlementGuard } from "./plugin-entitlement.guard";

function context(request: Record<string, unknown>) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe("PluginEntitlementGuard", () => {
  it("allows routes without a plugin requirement", async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    const registry = { isEnabledForOrganization: vi.fn() };
    const guard = new PluginEntitlementGuard(reflector as any, registry as any);

    await expect(guard.canActivate(context({}))).resolves.toBe(true);
  });

  it("allows installed plugins and rejects disabled plugins", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue("plugin.3d_viewer"),
    };
    const registry = {
      isEnabledForOrganization: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    };
    const guard = new PluginEntitlementGuard(reflector as any, registry as any);
    const request = { organization: { id: "org-1" } };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
