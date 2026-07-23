import { createAiConfig } from "@lms/config";
import { describe, expect, it, vi } from "vitest";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

describe("AiTenantRuntimeService", () => {
  it("builds provider configuration from active organization only", async () => {
    const prisma = {
      organizationPlugin: {
        findFirst: vi.fn().mockResolvedValue({
          config: {
            chatProvider: "openai",
            embeddingProvider: "openai",
            chatModel: "tenant-chat",
            embeddingModel: "tenant-embedding",
          },
        }),
      },
    };
    const registry = {
      isEnabledForOrganization: vi.fn().mockResolvedValue(true),
    };
    const secrets = {
      get: vi.fn().mockResolvedValue("sk-org-a"),
    };
    const service = new AiTenantRuntimeService(
      createAiConfig({}),
      prisma as any,
      registry as any,
      secrets as any,
    );

    const config = await service.assertReady("org-a");

    expect(config.enabled).toBe(true);
    expect(config.providers.openai).toEqual(
      expect.objectContaining({
        apiKey: "sk-org-a",
        chatModel: "tenant-chat",
        embeddingModel: "tenant-embedding",
      }),
    );
    expect(secrets.get).toHaveBeenCalledWith(
      "org-a",
      "plugin.ai_provider",
      "apiKey",
    );
  });

  it("keeps external provider disabled when organization key is missing", async () => {
    const service = new AiTenantRuntimeService(
      createAiConfig({}),
      {
        organizationPlugin: {
          findFirst: vi.fn().mockResolvedValue({
            config: {
              chatProvider: "openai",
              embeddingProvider: "openai",
              chatModel: "chat",
              embeddingModel: "embedding",
            },
          }),
        },
      } as any,
      { isEnabledForOrganization: vi.fn().mockResolvedValue(true) } as any,
      { get: vi.fn().mockResolvedValue(null) } as any,
    );

    await expect(service.assertReady("org-a")).rejects.toThrow(
      "missing required organization credentials",
    );
  });
});
