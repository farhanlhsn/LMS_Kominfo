import { describe, expect, it, vi } from "vitest";
import { PluginsController } from "./plugins.controller";

const org = { id: "org-1", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup() {
  const pluginRegistry = {
    listActivityTypes: vi.fn().mockReturnValue([
      { type: "core.video", pluginKey: "core.video", pluginName: "Video", pluginVersion: "1.0.0", category: "content" },
    ]),
  } as any;
  return { controller: new PluginsController(pluginRegistry), pluginRegistry };
}

describe("PluginsController", () => {
  it("returns scoped activity types for the active organization", () => {
    const { controller, pluginRegistry } = setup();
    const response = controller.listActivityTypes(org);
    expect(response).toEqual({
      organizationId: "org-1",
      activityTypes: [
        { type: "core.video", pluginKey: "core.video", pluginName: "Video", pluginVersion: "1.0.0", category: "content" },
      ],
    });
    expect(pluginRegistry.listActivityTypes).toHaveBeenCalled();
  });
});
