import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { INTERNAL_PLUGIN_MANIFESTS, type InternalPluginManifest } from "@lms/shared";
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
    this.validator.validateAll(INTERNAL_PLUGIN_MANIFESTS);
    for (const manifest of INTERNAL_PLUGIN_MANIFESTS) {
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

  listActivityTypes() {
    return this.listRegisteredPlugins().flatMap((plugin) =>
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
    return this.getPlugin(pluginKey).capabilities?.includes(capability) ?? false;
  }

  async isEnabledForOrganization(organizationId: string, pluginKey: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
      include: {
        organizationPlugins: {
          where: { organizationId },
        },
      },
    });
    return Boolean(plugin?.organizationPlugins[0]?.enabled);
  }

  async ensureRegisteredPlugins() {
    for (const manifest of this.listRegisteredPlugins()) {
      await this.prisma.plugin.upsert({
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
            | Prisma.InputJsonObject
            | undefined,
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
            | Prisma.InputJsonObject
            | undefined,
          permissions: (manifest.permissions ?? []) as Prisma.InputJsonArray,
          capabilities: (manifest.capabilities ?? []) as Prisma.InputJsonArray,
        },
      });
    }
  }
}
