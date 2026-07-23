import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { PluginExecutionLogger } from "./plugin-execution-logger.service";
import { PluginRegistry } from "./plugin-registry.service";
import { PluginSecretService } from "./plugin-secret.service";

@Injectable()
export class PluginConfigService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
    @Inject(PluginExecutionLogger)
    private readonly executionLogger: PluginExecutionLogger,
    @Optional()
    @Inject(PluginSecretService)
    private readonly secretService?: PluginSecretService,
  ) {}

  async listPlugins(organizationId: string) {
    await this.registry.ensureRegisteredPlugins();
    const plugins = await this.prisma.plugin.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
      include: {
        organizationPlugins: {
          where: { organizationId },
        },
      },
    });
    const marketplaceInstallations =
      await this.marketplaceDb().pluginInstallation.findMany({
        where: { organizationId },
        select: {
          listing: {
            select: { pluginId: true },
          },
        },
      });
    const installedMarketplaceKeys = new Set(
      marketplaceInstallations.map(
        (installation) => installation.listing.pluginId,
      ),
    );

    return plugins
      .filter(
        (plugin) =>
          this.isCorePlugin(plugin.key) ||
          installedMarketplaceKeys.has(plugin.key),
      )
      .map((plugin) => {
        const organizationPlugin = plugin.organizationPlugins[0] ?? null;
        return {
          ...plugin,
          organizationPlugin,
          enabled: this.isCorePlugin(plugin.key)
            ? true
            : Boolean(organizationPlugin?.enabled),
        };
      });
  }

  async getPlugin(organizationId: string, pluginKey: string) {
    await this.registry.ensureRegisteredPlugins();
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
      include: {
        organizationPlugins: {
          where: { organizationId },
        },
        pluginPermissions: true,
      },
    });
    if (!plugin) throw new NotFoundException("Plugin not found");
    if (
      !this.isCorePlugin(plugin.key) &&
      !(await this.hasMarketplaceInstallation(organizationId, plugin.key))
    ) {
      throw new NotFoundException("Plugin is not installed");
    }
    const organizationPlugin = plugin.organizationPlugins[0] ?? null;
    return {
      ...plugin,
      organizationPlugin,
      enabled: this.isCorePlugin(plugin.key)
        ? true
        : Boolean(organizationPlugin?.enabled),
      configuredSecrets: this.secretService
        ? await this.secretService.listMetadata(organizationId, plugin.key)
        : [],
    };
  }

  async enablePlugin(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
  ) {
    const plugin = await this.findConfigurablePlugin(organizationId, pluginKey);
    await this.registry.assertDependenciesEnabled?.(organizationId, pluginKey);
    const organizationPlugin = await this.prisma.organizationPlugin.upsert({
      where: {
        organizationId_pluginId: {
          organizationId,
          pluginId: plugin.id,
        },
      },
      update: {
        enabled: true,
        installedById: user.id,
      },
      create: {
        organizationId,
        pluginId: plugin.id,
        enabled: true,
        config: {},
        installedById: user.id,
      },
    });
    await this.audit(organizationId, user.id, "plugin.enabled", plugin.id, {
      pluginKey,
    });
    await this.executionLogger.log({
      organizationId,
      pluginId: plugin.id,
      userId: user.id,
      action: "plugin.enabled",
      status: "SUCCESS",
      output: { enabled: true },
    });
    await this.syncMarketplaceInstallation(organizationId, pluginKey, "ACTIVE");
    return organizationPlugin;
  }

  async disablePlugin(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
  ) {
    if (this.isCorePlugin(pluginKey)) {
      throw new BadRequestException("Core plugins cannot be disabled");
    }
    await this.registry.assertCanDisable?.(organizationId, pluginKey);
    const plugin = await this.findConfigurablePlugin(organizationId, pluginKey);
    const organizationPlugin = await this.prisma.organizationPlugin.upsert({
      where: {
        organizationId_pluginId: {
          organizationId,
          pluginId: plugin.id,
        },
      },
      update: { enabled: false },
      create: {
        organizationId,
        pluginId: plugin.id,
        enabled: false,
        config: {},
        installedById: user.id,
      },
    });
    await this.audit(organizationId, user.id, "plugin.disabled", plugin.id, {
      pluginKey,
    });
    await this.executionLogger.log({
      organizationId,
      pluginId: plugin.id,
      userId: user.id,
      action: "plugin.disabled",
      status: "SUCCESS",
      output: { enabled: false },
    });
    await this.syncMarketplaceInstallation(
      organizationId,
      pluginKey,
      "DISABLED",
    );
    return organizationPlugin;
  }

  async updateConfig(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
    config: Record<string, unknown>,
  ) {
    this.rejectSecretLikeConfig(config);
    const plugin = await this.findConfigurablePlugin(organizationId, pluginKey);
    const organizationPlugin = await this.prisma.organizationPlugin.upsert({
      where: {
        organizationId_pluginId: {
          organizationId,
          pluginId: plugin.id,
        },
      },
      update: { config: config as Prisma.InputJsonObject },
      create: {
        organizationId,
        pluginId: plugin.id,
        enabled: false,
        config: config as Prisma.InputJsonObject,
        installedById: user.id,
      },
    });
    await this.audit(
      organizationId,
      user.id,
      "plugin.config_updated",
      plugin.id,
      {
        pluginKey,
      },
    );
    await this.executionLogger.log({
      organizationId,
      pluginId: plugin.id,
      userId: user.id,
      action: "plugin.config_updated",
      status: "SUCCESS",
      output: { updated: true },
    });
    return organizationPlugin;
  }

  async logs(organizationId: string, pluginKey: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
    });
    if (!plugin) throw new NotFoundException("Plugin not found");
    return this.prisma.pluginExecutionLog.findMany({
      where: { organizationId, pluginId: plugin.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async updateSecret(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
    secretKey: string,
    value: string,
  ) {
    if (!this.secretService) {
      throw new BadRequestException("Plugin secret storage is unavailable");
    }
    await this.findConfigurablePlugin(organizationId, pluginKey);
    const secret = await this.secretService.set(
      organizationId,
      pluginKey,
      secretKey,
      value,
    );
    const plugin = await this.prisma.plugin.findUniqueOrThrow({
      where: { key: pluginKey },
      select: { id: true },
    });
    await this.audit(
      organizationId,
      user.id,
      "plugin.secret_updated",
      plugin.id,
      { pluginKey, secretKey },
    );
    return { ...secret, configured: true };
  }

  async deleteSecret(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
    secretKey: string,
  ) {
    if (!this.secretService) {
      throw new BadRequestException("Plugin secret storage is unavailable");
    }
    await this.findConfigurablePlugin(organizationId, pluginKey);
    const result = await this.secretService.delete(
      organizationId,
      pluginKey,
      secretKey,
    );
    const plugin = await this.prisma.plugin.findUniqueOrThrow({
      where: { key: pluginKey },
      select: { id: true },
    });
    await this.audit(
      organizationId,
      user.id,
      "plugin.secret_deleted",
      plugin.id,
      { pluginKey, secretKey },
    );
    return result;
  }

  private async findConfigurablePlugin(
    organizationId: string,
    pluginKey: string,
  ) {
    await this.registry.ensureRegisteredPlugins();
    const manifest = this.registry.getPlugin(pluginKey);
    if (manifest.placeholder) {
      throw new BadRequestException("Placeholder plugins cannot be enabled");
    }
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
    });
    if (!plugin) throw new NotFoundException("Plugin not found");
    if (manifest.distribution === "MARKETPLACE") {
      if (!(await this.hasMarketplaceInstallation(organizationId, pluginKey))) {
        throw new BadRequestException(
          "Install this plugin from the marketplace first",
        );
      }
    }
    return plugin;
  }

  private isCorePlugin(pluginKey: string) {
    try {
      return this.registry.isCorePlugin(pluginKey);
    } catch {
      return false;
    }
  }

  private async syncMarketplaceInstallation(
    organizationId: string,
    pluginKey: string,
    status: "ACTIVE" | "DISABLED",
  ) {
    if (this.isCorePlugin(pluginKey)) return;
    await this.marketplaceDb().pluginInstallation.updateMany({
      where: {
        organizationId,
        listing: { pluginId: pluginKey },
      },
      data: { status },
    });
  }

  private async hasMarketplaceInstallation(
    organizationId: string,
    pluginKey: string,
  ) {
    const installation =
      await this.marketplaceDb().pluginInstallation.findFirst({
        where: {
          organizationId,
          listing: { pluginId: pluginKey },
        },
        select: { id: true },
      });
    return Boolean(installation);
  }

  private marketplaceDb() {
    return this.prisma as unknown as {
      pluginInstallation: {
        findMany(input: {
          where: { organizationId: string };
          select: { listing: { select: { pluginId: true } } };
        }): Promise<Array<{ listing: { pluginId: string } }>>;
        findFirst(input: {
          where: {
            organizationId: string;
            listing: { pluginId: string };
          };
          select: { id: true };
        }): Promise<{ id: string } | null>;
        updateMany(input: {
          where: {
            organizationId: string;
            listing: { pluginId: string };
          };
          data: { status: "ACTIVE" | "DISABLED" };
        }): Promise<unknown>;
      };
    };
  }

  private rejectSecretLikeConfig(config: Record<string, unknown>) {
    for (const key of Object.keys(config)) {
      if (/secret|token|password|apiKey/i.test(key)) {
        throw new BadRequestException(
          "Secret-like plugin config values are not supported in this phase",
        );
      }
    }
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Plugin",
        entityId,
        severity: "INFO",
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
