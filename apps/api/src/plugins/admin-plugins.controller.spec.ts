import { describe, expect, it, vi } from "vitest";
import { AdminPluginsController } from "./admin-plugins.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "user-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    listPlugins: vi.fn().mockReturnValue([{ key: "core.video", name: "Video" }]),
    getPlugin: vi.fn().mockReturnValue({ key: "core.video", name: "Video" }),
    enablePlugin: vi.fn().mockResolvedValue({ key: "core.video", enabled: true }),
    disablePlugin: vi.fn().mockResolvedValue({ key: "core.video", enabled: false }),
    updateConfig: vi.fn().mockResolvedValue({ key: "core.video", config: { maxSize: 1024 } }),
    logs: vi.fn().mockReturnValue([{ id: "l-1", level: "info" }]),
    ...overrides,
  };
  return { controller: new AdminPluginsController(service as any), service };
}

describe("AdminPluginsController", () => {
  it("lists plugins scoped to organization", () => {
    const { controller, service } = setup();
    expect(controller.list(org)).toEqual([{ key: "core.video", name: "Video" }]);
    expect(service.listPlugins).toHaveBeenCalledWith("org-a");
  });

  it("retrieves a single plugin by key", () => {
    const { controller, service } = setup();
    expect(controller.get(org, "core.video")).toEqual({ key: "core.video", name: "Video" });
    expect(service.getPlugin).toHaveBeenCalledWith("org-a", "core.video");
  });

  it("enables and disables plugins with the current user", async () => {
    const { controller, service } = setup();
    await controller.enable(org, user, "core.video");
    expect(service.enablePlugin).toHaveBeenCalledWith("org-a", user, "core.video");
    await controller.disable(org, user, "core.video");
    expect(service.disablePlugin).toHaveBeenCalledWith("org-a", user, "core.video");
  });

  it("updates plugin config and forwards the new payload", async () => {
    const { controller, service } = setup();
    const result = await controller.updateConfig(org, user, "core.video", { config: { maxSize: 1024 } } as any);
    expect(service.updateConfig).toHaveBeenCalledWith("org-a", user, "core.video", { maxSize: 1024 });
    expect(result).toEqual({ key: "core.video", config: { maxSize: 1024 } });
  });

  it("returns logs for a plugin", () => {
    const { controller, service } = setup();
    expect(controller.logs(org, "core.video")).toEqual([{ id: "l-1", level: "info" }]);
    expect(service.logs).toHaveBeenCalledWith("org-a", "core.video");
  });
});
