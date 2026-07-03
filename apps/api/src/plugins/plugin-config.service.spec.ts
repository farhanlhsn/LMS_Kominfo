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

function createService() {
  const prisma = {
    plugin: {
      findUnique: vi.fn().mockResolvedValue({
        id: "plugin_1",
        key: "core.text",
      }),
    },
    organizationPlugin: {
      upsert: vi.fn().mockResolvedValue({ id: "org_plugin_1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
    pluginExecutionLog: {
      create: vi.fn().mockResolvedValue({ id: "log_1" }),
    },
  };
  const registry = {
    ensureRegisteredPlugins: vi.fn(),
    getPlugin: vi.fn().mockReturnValue({
      key: "core.text",
      placeholder: false,
    }),
  };
  const logger = {
    log: vi.fn().mockResolvedValue({ id: "log_1" }),
  };
  const service = new PluginConfigService(
    prisma as unknown as ConstructorParameters<typeof PluginConfigService>[0],
    registry as unknown as ConstructorParameters<typeof PluginConfigService>[1],
    logger as unknown as ConstructorParameters<typeof PluginConfigService>[2],
  );
  return { service, prisma, registry, logger };
}

describe("PluginConfigService", () => {
  it("enables plugins per organization and logs the action", async () => {
    const { service, prisma, logger } = createService();

    await service.enablePlugin("org_1", user, "core.text");

    expect(prisma.organizationPlugin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_pluginId: {
            organizationId: "org_1",
            pluginId: "plugin_1",
          },
        },
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        pluginId: "plugin_1",
        action: "plugin.enabled",
        status: "SUCCESS",
      }),
    );
  });

  it("rejects secret-like config in this phase", async () => {
    const { service } = createService();

    await expect(
      service.updateConfig("org_1", user, "core.text", {
        apiKey: "secret",
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
