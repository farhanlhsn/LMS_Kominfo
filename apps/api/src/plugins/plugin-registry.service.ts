import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CORE_PLUGIN_MANIFESTS,
  CAPABILITY_RISKS,
  MARKETPLACE_PLUGIN_MANIFESTS,
  PLUGIN_CATALOG_MANIFESTS,
  type InternalPluginManifest,
} from "@lms/shared";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import { PluginManifestValidator } from "./plugin-manifest-validator.service";

@Injectable()
export class PluginRegistry {
  private readonly manifests = new Map<string, InternalPluginManifest>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginManifestValidator)
    private readonly validator: PluginManifestValidator,
  ) {
    this.validator.validateAll(PLUGIN_CATALOG_MANIFESTS);
    for (const manifest of PLUGIN_CATALOG_MANIFESTS) {
      this.manifests.set(manifest.key, manifest);
    }
  }

  listRegisteredPlugins() {
    return [...this.manifests.values()];
  }

  getPlugin(key: string) {
    const manifest = this.manifests.get(key);
    if (!manifest) {
      throw new NotFoundException("Plugin manifest not found");
    }
    return manifest;
  }

  listCorePlugins() {
    return CORE_PLUGIN_MANIFESTS;
  }

  listMarketplacePlugins() {
    return MARKETPLACE_PLUGIN_MANIFESTS;
  }

  isCorePlugin(pluginKey: string) {
    return this.getPlugin(pluginKey).distribution === "CORE";
  }

  listActivityTypes() {
    return this.mapActivityTypes(this.listRegisteredPlugins());
  }

  async listActivityTypesForOrganization(organizationId: string) {
    await this.ensureRegisteredPlugins();
    const installations = await this.prisma.pluginInstallation.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        listing: {
          pluginId: {
            in: MARKETPLACE_PLUGIN_MANIFESTS.map((plugin) => plugin.key),
          },
        },
      },
      select: {
        listing: {
          select: { pluginId: true },
        },
      },
    });
    const enabledKeys = new Set(
      installations.map((installation) => installation.listing.pluginId),
    );
    return this.mapActivityTypes([
      ...CORE_PLUGIN_MANIFESTS,
      ...MARKETPLACE_PLUGIN_MANIFESTS.filter((plugin) =>
        enabledKeys.has(plugin.key),
      ),
    ]);
  }

  private mapActivityTypes(manifests: InternalPluginManifest[]) {
    return manifests.flatMap((plugin) =>
      (plugin.activityTypes ?? []).map((activityType) => ({
        ...activityType,
        pluginKey: plugin.key,
        pluginName: plugin.name,
        pluginVersion: plugin.version,
        category: plugin.category,
        placeholder: Boolean(plugin.placeholder),
      })),
    );
  }

  hasCapability(pluginKey: string, capability: string) {
    return (
      this.getPlugin(pluginKey).capabilities?.includes(capability) ?? false
    );
  }

  assertCompatible(
    pluginKey: string,
    coreVersion = process.env.LMS_CORE_VERSION ?? "1.0.0",
  ) {
    const manifest = this.getPlugin(pluginKey);
    const minimum = manifest.compatibility?.minimumCoreVersion;
    const maximum = manifest.compatibility?.maximumCoreVersion;
    if (minimum && compareVersions(coreVersion, minimum) < 0) {
      throw new BadRequestException(
        `${manifest.name} requires LMS core ${minimum} or newer`,
      );
    }
    if (maximum && compareVersions(coreVersion, maximum) > 0) {
      throw new BadRequestException(
        `${manifest.name} supports LMS core up to ${maximum}`,
      );
    }
    return true;
  }

  async isEnabledForOrganization(organizationId: string, pluginKey: string) {
    const manifest = this.getPlugin(pluginKey);
    if (manifest.distribution === "CORE") return true;
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
      include: {
        organizationPlugins: {
          where: { organizationId },
        },
      },
    });
    if (!plugin?.organizationPlugins[0]?.enabled) return false;
    const installation = await this.prisma.pluginInstallation.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        listing: { pluginId: pluginKey },
      },
      select: { id: true },
    });
    return Boolean(installation);
  }

  async missingDependencies(organizationId: string, pluginKey: string) {
    const dependencies = this.getPlugin(pluginKey).dependencies ?? [];
    const missing: string[] = [];
    for (const dependency of dependencies) {
      if (!(await this.isEnabledForOrganization(organizationId, dependency))) {
        missing.push(dependency);
      }
    }
    return missing;
  }

  async assertDependenciesEnabled(
    organizationId: string,
    pluginKey: string,
  ) {
    const missing = await this.missingDependencies(organizationId, pluginKey);
    if (missing.length) {
      throw new BadRequestException(
        `Enable required plugins first: ${missing.join(", ")}`,
      );
    }
  }

  async activeDependents(organizationId: string, pluginKey: string) {
    const dependents: string[] = [];
    for (const manifest of this.listRegisteredPlugins()) {
      if (!(manifest.dependencies ?? []).includes(pluginKey)) continue;
      if (await this.isEnabledForOrganization(organizationId, manifest.key)) {
        dependents.push(manifest.key);
      }
    }
    return dependents;
  }

  async assertCanDisable(organizationId: string, pluginKey: string) {
    const dependents = await this.activeDependents(organizationId, pluginKey);
    if (dependents.length) {
      throw new BadRequestException(
        `Disable dependent plugins first: ${dependents.join(", ")}`,
      );
    }
  }

  async ensureRegisteredPlugins() {
    for (const manifest of this.listRegisteredPlugins()) {
      const plugin = await this.prisma.plugin.upsert({
        where: { key: manifest.key },
        update: {
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          category: manifest.category,
          status: manifest.placeholder ? "DISABLED" : "ACTIVE",
          author: manifest.author,
          manifest: manifest as unknown as Prisma.InputJsonObject,
          configSchema: manifest.configSchema as
            Prisma.InputJsonObject | undefined,
          permissions: (manifest.permissions ?? []) as Prisma.InputJsonArray,
          capabilities: (manifest.capabilities ?? []) as Prisma.InputJsonArray,
        },
        create: {
          key: manifest.key,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          category: manifest.category,
          status: manifest.placeholder ? "DISABLED" : "ACTIVE",
          author: manifest.author,
          manifest: manifest as unknown as Prisma.InputJsonObject,
          configSchema: manifest.configSchema as
            Prisma.InputJsonObject | undefined,
          permissions: (manifest.permissions ?? []) as Prisma.InputJsonArray,
          capabilities: (manifest.capabilities ?? []) as Prisma.InputJsonArray,
        },
      });
      for (const capability of manifest.capabilities ?? []) {
        const permissionKey = `${manifest.key}:${capability}`;
        await this.prisma.permission.upsert({
          where: { key: permissionKey },
          update: {
            description: `${manifest.name}: ${capability.replaceAll("_", " ")}`,
            component: manifest.key,
            sourcePluginKey:
              manifest.distribution === "MARKETPLACE" ? manifest.key : null,
            riskBitmask: pluginCapabilityRisk(capability),
            isActive: true,
          },
          create: {
            key: permissionKey,
            description: `${manifest.name}: ${capability.replaceAll("_", " ")}`,
            component: manifest.key,
            capabilityType:
              capability.startsWith("render_") ||
              capability.startsWith("view_") ||
              capability.startsWith("track_")
                ? "READ"
                : "WRITE",
            riskBitmask: pluginCapabilityRisk(capability),
            contextTypes: [
              "ORGANIZATION",
              "COURSE",
              "MODULE",
              "ACTIVITY",
              "PLUGIN",
            ],
            sourcePluginKey:
              manifest.distribution === "MARKETPLACE" ? manifest.key : null,
          },
        });
        await this.prisma.pluginPermission.upsert({
          where: {
            pluginId_permissionKey: {
              pluginId: plugin.id,
              permissionKey,
            },
          },
          update: {
            description: `Capability provided by ${manifest.name}`,
          },
          create: {
            pluginId: plugin.id,
            permissionKey,
            description: `Capability provided by ${manifest.name}`,
          },
        });
      }
    }
  }
}

function pluginCapabilityRisk(capability: string) {
  let risk = 0;
  if (capability.startsWith("render_")) risk |= CAPABILITY_RISKS.xss;
  if (
    capability.startsWith("manage_") ||
    capability.startsWith("edit_") ||
    capability.startsWith("grade_")
  ) {
    risk |= CAPABILITY_RISKS.configuration;
  }
  if (capability.includes("execute") || capability.includes("delete")) {
    risk |= CAPABILITY_RISKS.dataLoss;
  }
  return risk;
}

function compareVersions(left: string, right: string) {
  const parse = (value: string) => {
    const [coreVersion = "0"] = value.split("-", 1);
    return coreVersion
      .split(".")
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  };
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}
