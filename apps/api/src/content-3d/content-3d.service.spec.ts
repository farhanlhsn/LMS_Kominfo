import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { Content3DService } from "./content-3d.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["instructor"],
  permissionKeys: ["files:read", "files:create", "files:delete"],
  isPlatformAdmin: false,
};

function setup() {
  const assets = new Map<string, Record<string, any>>();
  const scenes = new Map<string, Record<string, any>>();
  const interactions = new Map<string, Record<string, any>>();

  const prisma: any = {
    threeDAsset: {
      findMany: vi.fn(async (args: any) => {
        const list = Array.from(assets.values()).filter(
          (a) => a.organizationId === args?.where?.organizationId,
        );
        if (args?.where?.name?.contains) {
          const needle = args.where.name.contains.toLowerCase();
          return list.filter((a) => a.name.toLowerCase().includes(needle));
        }
        if (args?.where?.format) {
          return list.filter((a) => a.format === args.where.format);
        }
        return list;
      }),
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(assets.values());
        return (
          list.find(
            (a) =>
              a.organizationId === args?.where?.organizationId &&
              a.id === args.where.id,
          ) ?? null
        );
      }),
      create: vi.fn(async (args: any) => {
        const id = `asset-${assets.size + 1}`;
        const asset = { id, ...args.data, _count: { scenes: 0 } };
        assets.set(id, asset);
        return asset;
      }),
      update: vi.fn(async (args: any) => {
        const existing = assets.get(args.where.id);
        const updated = { ...existing, ...args.data };
        assets.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        assets.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    threeDScene: {
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(scenes.values());
        return (
          list.find(
            (s) =>
              s.organizationId === args?.where?.organizationId &&
              s.id === args.where.id,
          ) ?? null
        );
      }),
      findMany: vi.fn(async (args: any) => {
        const list = Array.from(scenes.values()).filter(
          (s) =>
            s.organizationId === args?.where?.organizationId &&
            (!args.where.assetId || s.assetId === args.where.assetId),
        );
        return list;
      }),
      create: vi.fn(async (args: any) => {
        const id = `scene-${scenes.size + 1}`;
        const scene = { id, ...args.data, interactions: [] };
        scenes.set(id, scene);
        return scene;
      }),
    },
    threeDInteraction: {
      create: vi.fn(async (args: any) => {
        const id = `int-${interactions.size + 1}`;
        const interaction = { id, ...args.data };
        interactions.set(id, interaction);
        return interaction;
      }),
    },
  };

  return {
    service: new Content3DService(prisma),
    prisma,
    assets,
    scenes,
  };
}

describe("Content3DService", () => {
  it("lists assets scoped to organization", async () => {
    const { service, prisma, assets } = setup();
    assets.set("a1", { id: "a1", organizationId: "org-a", name: "Robot" });
    assets.set("a2", {
      id: "a2",
      organizationId: "org-other",
      name: "Other",
    });
    const result = await service.listAssets("org-a");
    expect(result).toHaveLength(1);
    expect(prisma.threeDAsset.findMany).toHaveBeenCalled();
  });

  it("creates an asset with mock thumbnail when none provided", async () => {
    const { service, assets } = setup();
    const asset = await service.createAsset(org, "u1", {
      name: "Sphere",
      format: "GLB",
      url: "https://example.com/sphere.glb",
    } as any);
    expect(asset.thumbnailUrl).toContain("Sphere");
    expect(assets.has(asset.id)).toBe(true);
  });

  it("uses provided thumbnail when supplied", async () => {
    const { service } = setup();
    const asset = await service.createAsset(org, "u1", {
      name: "Cube",
      format: "GLTF",
      url: "https://example.com/cube.gltf",
      thumbnailUrl: "https://cdn.example.com/cube.png",
    } as any);
    expect(asset.thumbnailUrl).toBe("https://cdn.example.com/cube.png");
  });

  it("throws NotFound when getting an unknown asset", async () => {
    const { service } = setup();
    await expect(service.getAsset("org-a", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updates an asset and returns the updated row", async () => {
    const { service, assets } = setup();
    assets.set("a1", {
      id: "a1",
      organizationId: "org-a",
      name: "Old",
      format: "GLB",
    });
    const updated = await service.updateAsset("org-a", "a1", {
      name: "New",
    } as any);
    expect(updated.name).toBe("New");
  });

  it("deletes an asset", async () => {
    const { service, assets } = setup();
    assets.set("a1", {
      id: "a1",
      organizationId: "org-a",
      name: "X",
      format: "GLB",
    });
    const result = await service.deleteAsset("org-a", "a1");
    expect(result.deleted).toBe(true);
    expect(assets.has("a1")).toBe(false);
  });

  it("generates a preview thumbnail from name and format", async () => {
    const { service, assets } = setup();
    assets.set("a1", {
      id: "a1",
      organizationId: "org-a",
      name: "Tree",
      format: "FBX",
      thumbnailUrl: null,
    });
    const result = await service.generatePreviewThumbnail("org-a", "a1");
    expect(result.thumbnailUrl).toContain("Tree");
  });

  it("creates a scene for an existing asset", async () => {
    const { service, assets } = setup();
    assets.set("a1", {
      id: "a1",
      organizationId: "org-a",
      name: "X",
      format: "GLB",
    });
    const scene = await service.createScene(org, "u1", "a1", {
      scene: { lights: [] },
    } as any);
    expect(scene.assetId).toBe("a1");
    expect(scene.version).toBe(1);
  });

  it("throws when creating a scene for unknown asset", async () => {
    const { service } = setup();
    await expect(
      service.createScene(org, "u1", "missing", { scene: {} } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("adds an interaction to an existing scene", async () => {
    const { service, scenes } = setup();
    scenes.set("s1", {
      id: "s1",
      organizationId: "org-a",
      assetId: "a1",
    });
    const interaction = await service.createInteraction(
      "org-a",
      "u1",
      "s1",
      {
        name: "Click",
        trigger: "click",
        action: { type: "highlight" },
      } as any,
    );
    expect(interaction.name).toBe("Click");
  });

  it("lists scenes for an asset and gets a scene by id", async () => {
    const { service, assets, scenes } = setup();
    assets.set("a1", {
      id: "a1",
      organizationId: "org-a",
      name: "X",
      format: "GLB",
    });
    scenes.set("s1", {
      id: "s1",
      organizationId: "org-a",
      assetId: "a1",
      interactions: [],
    });
    expect(await service.listScenes("org-a", "a1")).toHaveLength(1);
    expect(await service.getScene("org-a", "s1")).toMatchObject({ id: "s1" });
    await expect(service.getScene("org-a", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await service.listAssets("org-a", "rob", "GLB")).toEqual([]);
  });
});
