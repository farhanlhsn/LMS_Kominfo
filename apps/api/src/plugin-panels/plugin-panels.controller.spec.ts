import { describe, expect, it, vi } from "vitest";
import {
  PluginPanelController,
  UserPanelLayoutController,
} from "./plugin-panels.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Plugin panel controllers", () => {
  it("available register layout get/save", async () => {
    const service = {
      listAvailable: vi.fn().mockResolvedValue([]),
      registerPanel: vi.fn().mockResolvedValue({ id: "p1" }),
      getLayout: vi.fn().mockResolvedValue({ panels: [] }),
      saveLayout: vi.fn().mockResolvedValue({ panels: [] }),
    };
    const panels = new PluginPanelController(service as any);
    await panels.list(org);
    await panels.register(org, { key: "notes" } as any);

    const layouts = new UserPanelLayoutController(service as any);
    await layouts.get(org, user, "default");
    await layouts.save(org, user, "default", { panels: [] } as any);
    expect(service.saveLayout).toHaveBeenCalled();
  });
});
