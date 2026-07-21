import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { PluginExecutionLogger } from "./plugin-execution-logger.service";
import { PluginRegistry } from "./plugin-registry.service";

@Injectable()
export class PluginConfigService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
    @Inject(PluginExecutionLogger)
    private readonly executionLogger: PluginExecutionLogger,
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

    return plugins.map((plugin) => ({
      ...plugin,
      organizationPlugin: plugin.organizationPlugins[0] ?? null,
      enabled: Boolean(plugin.organizationPlugins[0]?.enabled),
    }));
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
    return {
      ...plugin,
      organizationPlugin: plugin.organizationPlugins[0] ?? null,
      enabled: Boolean(plugin.organizationPlugins[0]?.enabled),
    };
  }

  async enablePlugin(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
  ) {
    const plugin = await this.findConfigurablePlugin(pluginKey);
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
    return organizationPlugin;
  }

  async disablePlugin(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
  ) {
    const plugin = await this.findConfigurablePlugin(pluginKey);
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
    return organizationPlugin;
  }

  async updateConfig(
    organizationId: string,
    user: AuthenticatedUser,
    pluginKey: string,
    config: Record<string, unknown>,
  ) {
    this.rejectSecretLikeConfig(config);
    const plugin = await this.findConfigurablePlugin(pluginKey);
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
    await this.audit(organizationId, user.id, "plugin.config_updated", plugin.id, {
      pluginKey,
    });
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

  private async findConfigurablePlugin(pluginKey: string) {
    const manifest = this.registry.getPlugin(pluginKey);
    if (manifest.placeholder) {
      throw new BadRequestException("Placeholder plugins cannot be enabled");
    }
    const plugin = await this.prisma.plugin.findUnique({ where: { key: pluginKey } });
    if (!plugin) throw new NotFoundException("Plugin not found");
    return plugin;
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
