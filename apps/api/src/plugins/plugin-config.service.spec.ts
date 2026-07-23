import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import { PluginConfigService } from "./plugin-config.service";

const user: AuthenticatedUser = {
  id: "user_1",
  email: "admin@example.com",
  name: "Admin",
  sessionId: "session_1",
  activeOrganizationId: "org_1",
};

function createService(options: { installed?: boolean } = {}) {
  const installed = options.installed ?? true;
  const plugins = [
    {
      id: "core_1",
      key: "core.text",
      category: "ACTIVITY",
      organizationPlugins: [],
    },
    {
      id: "plugin_1",
      key: "plugin.3d_viewer",
      category: "ACTIVITY",
      organizationPlugins: installed ? [{ enabled: false }] : [],
    },
  ];
  const prisma = {
    plugin: {
      findUnique: vi.fn(async ({ where }: any) => {
        const plugin = plugins.find((item) => item.key === where.key);
        return plugin ? { ...plugin, pluginPermissions: [] } : null;
      }),
      findMany: vi.fn().mockResolvedValue(plugins),
    },
    organizationPlugin: {
      findUnique: vi
        .fn()
        .mockResolvedValue(installed ? { id: "org_plugin_1" } : null),
      upsert: vi.fn().mockResolvedValue({ id: "org_plugin_1", enabled: true }),
    },
    pluginInstallation: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          installed ? [{ listing: { pluginId: "plugin.3d_viewer" } }] : [],
        ),
      findFirst: vi
        .fn()
        .mockResolvedValue(installed ? { id: "installation_1" } : null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
    pluginExecutionLog: {
      findMany: vi.fn().mockResolvedValue([{ id: "log_1" }]),
    },
  };
  const registry = {
    ensureRegisteredPlugins: vi.fn(),
    getPlugin: vi.fn((key: string) => ({
      key,
      name: key,
      placeholder: false,
      distribution: key.startsWith("core.") ? "CORE" : "MARKETPLACE",
    })),
    isCorePlugin: vi.fn((key: string) => key.startsWith("core.")),
  };
  const logger = {
    log: vi.fn().mockResolvedValue({ id: "log_1" }),
  };
  const service = new PluginConfigService(
    prisma as any,
    registry as any,
    logger as any,
  );
  return { service, prisma, registry, logger };
}

describe("PluginConfigService", () => {
  it("lists core plugins and installed marketplace plugins only", async () => {
    const { service } = createService();
    const listed = await service.listPlugins("org_1");

    expect(listed).toHaveLength(2);
    expect(listed.find((plugin) => plugin.key === "core.text")?.enabled).toBe(
      true,
    );
    expect(
      listed.find((plugin) => plugin.key === "plugin.3d_viewer")?.enabled,
    ).toBe(false);
  });

  it("enables installed marketplace plugins and synchronizes marketplace status", async () => {
    const { service, prisma, logger } = createService();

    await service.enablePlugin("org_1", user, "plugin.3d_viewer");

    expect(prisma.organizationPlugin.upsert).toHaveBeenCalled();
    expect(prisma.pluginInstallation.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        listing: { pluginId: "plugin.3d_viewer" },
      },
      data: { status: "ACTIVE" },
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "plugin.enabled" }),
    );
  });

  it("rejects direct marketplace enablement before installation", async () => {
    const { service } = createService({ installed: false });

    await expect(
      service.enablePlugin("org_1", user, "plugin.3d_viewer"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps core plugins enabled and rejects secret-like config", async () => {
    const { service } = createService();

    await expect(
      service.disablePlugin("org_1", user, "core.text"),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateConfig("org_1", user, "plugin.3d_viewer", {
        apiKey: "secret",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
