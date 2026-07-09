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
    expect(activityTypes.some((type) => type.key === "plugin.3d_viewer")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.code_runner")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.h5p")).toBe(true);
    expect(activityTypes.some((type) => type.key === "plugin.scorm")).toBe(true);
    expect(
      activityTypes.find((type) => type.key === "core.quiz")?.placeholder,
    ).toBe(false);
    expect(
      activityTypes.find((type) => type.key === "core.quiz")?.implemented,
    ).toBe(true);
    expect(
      activityTypes.find((type) => type.key === "plugin.code_runner")?.placeholder,
    ).toBe(false);
    expect(
      activityTypes.find((type) => type.key === "plugin.code_runner")?.implemented,
    ).toBe(true);
  });

  it("checks organization-scoped plugin enablement", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      organizationPlugins: [{ enabled: true }],
    });
    const registry = registryWithPrisma({
      plugin: { findUnique },
    });

    await expect(
      registry.isEnabledForOrganization("org_1", "core.text"),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { key: "core.text" },
      include: {
        organizationPlugins: {
          where: { organizationId: "org_1" },
        },
      },
    });
  });
});
