import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PluginSecretService } from "./plugin-secret.service";

function setup() {
  let stored:
    | {
        organizationId: string;
        pluginId: string;
        key: string;
        encryptedValue: string;
        lastFour: string | null;
        updatedAt: Date;
      }
    | undefined;
  const prisma = {
    plugin: {
      findUnique: vi.fn().mockResolvedValue({ id: "plugin-db" }),
    },
    pluginSecret: {
      upsert: vi.fn(async ({ create, update }: any) => {
        const next = {
          ...(stored ?? create),
          ...update,
          organizationId: create.organizationId,
          pluginId: create.pluginId,
          key: create.key,
          updatedAt: new Date(),
        };
        stored = next;
        return {
          key: next.key,
          lastFour: next.lastFour,
          updatedAt: next.updatedAt,
        };
      }),
      findUnique: vi.fn(async () =>
        stored ? { encryptedValue: stored.encryptedValue } : null,
      ),
      findMany: vi.fn(async () =>
        stored
          ? [
              {
                key: stored.key,
                lastFour: stored.lastFour,
                updatedAt: stored.updatedAt,
              },
            ]
          : [],
      ),
      deleteMany: vi.fn(async () => {
        stored = undefined;
        return { count: 1 };
      }),
    },
  };
  const registry = {
    ensureRegisteredPlugins: vi.fn(),
    getPlugin: vi.fn().mockReturnValue({
      key: "plugin.ai_provider",
      secretConfig: [{ key: "apiKey", label: "API key" }],
    }),
  };
  return {
    service: new PluginSecretService(prisma as any, registry as any),
    stored: () => stored,
  };
}

describe("PluginSecretService", () => {
  it("encrypts tenant secret and only exposes masked metadata", async () => {
    const { service, stored } = setup();
    await service.set(
      "org-a",
      "plugin.ai_provider",
      "apiKey",
      "sk-tenant-secret",
    );

    expect(stored()?.encryptedValue).not.toContain("sk-tenant-secret");
    expect(stored()?.lastFour).toBe("cret");
    await expect(
      service.get("org-a", "plugin.ai_provider", "apiKey"),
    ).resolves.toBe("sk-tenant-secret");
    await expect(
      service.listMetadata("org-a", "plugin.ai_provider"),
    ).resolves.toEqual([
      expect.objectContaining({
        key: "apiKey",
        lastFour: "cret",
        configured: true,
      }),
    ]);
  });

  it("rejects secret keys not declared by manifest", async () => {
    const { service } = setup();
    await expect(
      service.set("org-a", "plugin.ai_provider", "password", "secret"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
