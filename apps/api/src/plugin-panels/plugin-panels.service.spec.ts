import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { PluginPanelService } from "./plugin-panels.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: ["plugins:configure"],
  isPlatformAdmin: false,
};

function setup() {
  const panels = new Map<string, Record<string, any>>();
  const layouts = new Map<string, Record<string, any>>();

  const prisma: any = {
    pluginInstallation: {
      findMany: vi.fn(async () =>
        Array.from(
          new Set(Array.from(panels.values()).map((panel) => panel.pluginId)),
        ).map((pluginId) => ({ listing: { pluginId } })),
      ),
    },
    pluginPanel: {
      findMany: vi.fn(async (args: any) =>
        Array.from(panels.values()).filter(
          (p) =>
            p.organizationId === args?.where?.organizationId &&
            (!args?.where?.pluginId?.in ||
              args.where.pluginId.in.includes(p.pluginId)),
        ),
      ),
      findFirst: vi.fn(async (_args: any) => null),
      upsert: vi.fn(async (args: any) => {
        const key = `${args.where.organizationId_pluginId_panelKey.organizationId}:${args.where.organizationId_pluginId_panelKey.pluginId}:${args.where.organizationId_pluginId_panelKey.panelKey}`;
        panels.set(key, { ...args.create, ...(args.update ?? {}) });
        return panels.get(key);
      }),
    },
    userPanelLayout: {
      findUnique: vi.fn(async (args: any) => {
        const key = `${args?.where?.userId_layoutKey?.userId}:${args?.where?.userId_layoutKey?.layoutKey}`;
        return layouts.get(key) ?? null;
      }),
      upsert: vi.fn(async (args: any) => {
        const key = `${args.where.userId_layoutKey.userId}:${args.where.userId_layoutKey.layoutKey}`;
        const merged = { ...args.create, ...args.update };
        layouts.set(key, merged);
        return merged;
      }),
    },
  };

  return {
    service: new PluginPanelService(prisma),
    prisma,
    panels,
    layouts,
  };
}

describe("PluginPanelService", () => {
  it("registers a new panel via upsert", async () => {
    const { service, panels } = setup();
    const panel = await service.registerPanel(org, {
      pluginId: "plugin.notes",
      panelKey: "notes",
      name: "Notes",
    } as any);
    expect(panel.name).toBe("Notes");
    expect(panels.size).toBe(1);
  });

  it("lists available panels for the org", async () => {
    const { service } = setup();
    await service.registerPanel(org, {
      pluginId: "plugin.notes",
      panelKey: "notes",
      name: "Notes",
    } as any);
    await service.registerPanel(org, {
      pluginId: "plugin.dictionary",
      panelKey: "lookup",
      name: "Lookup",
    } as any);
    const list = await service.listAvailable("org-a");
    expect(list).toHaveLength(2);
  });

  it("returns an empty layout for unknown layoutKey", async () => {
    const { service } = setup();
    const layout = await service.getLayout("org-a", "u1", "lesson");
    expect(layout.panels).toEqual([]);
  });

  it("saves a layout and rejects unknown panels", async () => {
    const { service } = setup();
    await expect(
      service.saveLayout(org, "u1", "lesson", {
        panels: [{ panelKey: "missing" }],
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("saves and retrieves a layout for known panels", async () => {
    const { service, layouts } = setup();
    await service.registerPanel(org, {
      pluginId: "plugin.notes",
      panelKey: "notes",
      name: "Notes",
    } as any);
    const saved = await service.saveLayout(org, "u1", "lesson", {
      panels: [
        { panelKey: "notes", size: "lg", position: "left", visible: true },
      ],
    } as any);
    expect(saved.panels).toHaveLength(1);
    expect(layouts.size).toBe(1);
    const fetched = await service.getLayout("org-a", "u1", "lesson");
    expect(fetched.panels).toHaveLength(1);
  });
});
