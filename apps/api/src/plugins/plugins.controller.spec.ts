import { describe, expect, it, vi } from "vitest";
import { PluginsController } from "./plugins.controller";

const org = {
  id: "org-1",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: [],
  isPlatformAdmin: false,
};

function setup() {
  const pluginRegistry = {
    listActivityTypesForOrganization: vi
      .fn()
      .mockResolvedValue([
        {
          type: "core.video",
          pluginKey: "core.video",
          pluginName: "Video",
          pluginVersion: "1.0.0",
          category: "content",
        },
      ]),
  } as any;
  return { controller: new PluginsController(pluginRegistry), pluginRegistry };
}

describe("PluginsController", () => {
  it("returns scoped activity types for the active organization", async () => {
    const { controller, pluginRegistry } = setup();
    const response = await controller.listActivityTypes(org);
    expect(response).toEqual({
      organizationId: "org-1",
      activityTypes: [
        {
          type: "core.video",
          pluginKey: "core.video",
          pluginName: "Video",
          pluginVersion: "1.0.0",
          category: "content",
        },
      ],
    });
    expect(
      pluginRegistry.listActivityTypesForOrganization,
    ).toHaveBeenCalledWith("org-1");
  });
});
