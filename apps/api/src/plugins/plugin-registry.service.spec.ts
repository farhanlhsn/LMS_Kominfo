import { describe, expect, it, vi } from "vitest";
import { PluginManifestValidator } from "./plugin-manifest-validator.service";
import { PluginRegistry } from "./plugin-registry.service";

function registryWithPrisma(prisma: unknown) {
  return new PluginRegistry(
    prisma as ConstructorParameters<typeof PluginRegistry>[0],
    new PluginManifestValidator(),
  );
}

describe("PluginRegistry", () => {
  it("lists implemented core and internal plugin activity types", () => {
    const registry = registryWithPrisma({});

    const activityTypes = registry.listActivityTypes();

    expect(activityTypes.some((type) => type.key === "core.text")).toBe(true);
    expect(activityTypes.some((type) => type.key === "core.quiz")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.3d_viewer")).toBe(
      true,
    );
    expect(
      activityTypes.some((type) => type.key === "plugin.code_runner"),
    ).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.h5p")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.scorm")).toBe(
      true,
    );
    expect(
      activityTypes.find((type) => type.key === "core.quiz")?.placeholder,
    ).toBe(false);
    expect(
      activityTypes.find((type) => type.key === "core.quiz")?.implemented,
    ).toBe(true);
    expect(
      activityTypes.find((type) => type.key === "plugin.code_runner")
        ?.placeholder,
    ).toBe(false);
    expect(
      activityTypes.find((type) => type.key === "plugin.code_runner")
        ?.implemented,
    ).toBe(true);
    expect(
      registry
        .listCorePlugins()
        .some((plugin) => plugin.key === "plugin.3d_viewer"),
    ).toBe(false);
    expect(
      registry
        .listMarketplacePlugins()
        .some((plugin) => plugin.key === "plugin.3d_viewer"),
    ).toBe(true);
  });

  it("checks organization-scoped plugin enablement", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      organizationPlugins: [{ enabled: true }],
    });
    const registry = registryWithPrisma({
      plugin: { findUnique },
      pluginInstallation: {
        findFirst: vi.fn().mockResolvedValue({ id: "installation-1" }),
      },
    });

    await expect(
      registry.isEnabledForOrganization("org_1", "core.text"),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();

    await expect(
      registry.isEnabledForOrganization("org_1", "plugin.3d_viewer"),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { key: "plugin.3d_viewer" },
      include: {
        organizationPlugins: {
          where: { organizationId: "org_1" },
        },
      },
    });

    findUnique.mockResolvedValue({ organizationPlugins: [] });
    await expect(
      registry.isEnabledForOrganization("org_1", "plugin.3d_viewer"),
    ).resolves.toBe(false);
  });

  it("returns only installed marketplace activity types for an organization", async () => {
    const registry = registryWithPrisma({
      plugin: { upsert: vi.fn().mockResolvedValue({}) },
      permission: { upsert: vi.fn().mockResolvedValue({}) },
      pluginPermission: { upsert: vi.fn().mockResolvedValue({}) },
      pluginInstallation: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ listing: { pluginId: "plugin.3d_viewer" } }]),
      },
    });

    const activityTypes =
      await registry.listActivityTypesForOrganization("org_1");

    expect(activityTypes.some((type) => type.key === "core.text")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.3d_viewer")).toBe(
      true,
    );
    expect(
      activityTypes.some((type) => type.key === "plugin.code_runner"),
    ).toBe(false);
  });

  it("gets plugins, capabilities, and ensures registration", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const permissionUpsert = vi.fn().mockResolvedValue({});
    const pluginPermissionUpsert = vi.fn().mockResolvedValue({});
    const registry = registryWithPrisma({
      plugin: { upsert, findUnique: vi.fn() },
      permission: { upsert: permissionUpsert },
      pluginPermission: { upsert: pluginPermissionUpsert },
    });
    expect(registry.listRegisteredPlugins().length).toBeGreaterThan(5);
    expect(registry.getPlugin("core.text").key).toBe("core.text");
    expect(() => registry.getPlugin("missing.plugin")).toThrow();
    expect(registry.hasCapability("core.text", "render_activity")).toBe(true);
    expect(registry.hasCapability("core.text", "nope")).toBe(false);
    expect(registry.assertCompatible("plugin.3d_viewer", "1.0.0")).toBe(true);
    await registry.ensureRegisteredPlugins();
    expect(upsert).toHaveBeenCalled();
    expect(permissionUpsert).toHaveBeenCalled();
    expect(pluginPermissionUpsert).toHaveBeenCalled();
  });

  it("rejects incompatible marketplace package versions", () => {
    const registry = registryWithPrisma({});
    const manifest = registry.getPlugin("plugin.3d_viewer");
    const original = manifest.compatibility;
    manifest.compatibility = { minimumCoreVersion: "2.0.0" };
    expect(() =>
      registry.assertCompatible("plugin.3d_viewer", "1.9.9"),
    ).toThrow();
    manifest.compatibility = original;
  });
});
