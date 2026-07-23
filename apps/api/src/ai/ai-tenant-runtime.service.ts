import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  AI_CONFIG,
  type AiChatProviderName,
  type AiConfig,
  type AiEmbeddingProviderName,
} from "@lms/config";
import { PrismaService } from "../prisma/prisma.service";
import { PluginRegistry } from "../plugins/plugin-registry.service";
import { PluginSecretService } from "../plugins/plugin-secret.service";

const chatProviders = new Set<AiChatProviderName>([
  "mock",
  "openai",
  "openai_compatible",
  "gemini_openai_compatible",
]);
const embeddingProviders = new Set<AiEmbeddingProviderName>([
  ...chatProviders,
  "local",
]);

type ProviderPluginConfig = {
  chatProvider?: unknown;
  embeddingProvider?: unknown;
  baseUrl?: unknown;
  chatModel?: unknown;
  embeddingModel?: unknown;
  providerOrganizationId?: unknown;
};

@Injectable()
export class AiTenantRuntimeService {
  constructor(
    @Inject(AI_CONFIG) private readonly baseConfig: AiConfig,
    private readonly prisma: PrismaService,
    private readonly registry: PluginRegistry,
    private readonly secrets: PluginSecretService,
  ) {}

  async getConfig(organizationId: string): Promise<AiConfig> {
    const enabled = await this.registry.isEnabledForOrganization(
      organizationId,
      "plugin.ai_provider",
    );
    const organizationPlugin = await this.prisma.organizationPlugin.findFirst({
      where: {
        organizationId,
        enabled: true,
        plugin: { key: "plugin.ai_provider" },
      },
      select: { config: true },
    });
    const raw = (organizationPlugin?.config ?? {}) as ProviderPluginConfig;
    const chatProvider = this.chatProvider(raw.chatProvider);
    const embeddingProvider = this.embeddingProvider(raw.embeddingProvider);
    const apiKey = await this.secrets.get(
      organizationId,
      "plugin.ai_provider",
      "apiKey",
    );
    const connection = {
      apiKey: apiKey ?? undefined,
      baseUrl:
        this.string(raw.baseUrl) ??
        this.defaultConnection(chatProvider).baseUrl,
      chatModel:
        this.string(raw.chatModel) ??
        this.defaultConnection(chatProvider).chatModel,
      embeddingModel:
        this.string(raw.embeddingModel) ??
        this.defaultConnection(embeddingProvider).embeddingModel,
      organizationId: this.string(raw.providerOrganizationId),
    };
    const requiresApiKey =
      chatProvider !== "mock" ||
      !["mock", "local"].includes(embeddingProvider);
    const configured = !requiresApiKey || Boolean(apiKey);

    return {
      ...this.baseConfig,
      enabled: enabled && configured,
      chatProvider,
      embeddingProvider,
      providers: {
        openai:
          chatProvider === "openai" || embeddingProvider === "openai"
            ? connection
            : this.baseConfig.providers.openai,
        openaiCompatible:
          chatProvider === "openai_compatible" ||
          embeddingProvider === "openai_compatible"
            ? connection
            : this.baseConfig.providers.openaiCompatible,
        geminiOpenAiCompatible:
          chatProvider === "gemini_openai_compatible" ||
          embeddingProvider === "gemini_openai_compatible"
            ? connection
            : this.baseConfig.providers.geminiOpenAiCompatible,
      },
    };
  }

  async assertReady(organizationId: string) {
    const config = await this.getConfig(organizationId);
    if (!config.enabled) {
      throw new BadRequestException(
        "AI Provider plugin is disabled or missing required organization credentials",
      );
    }
    if (
      config.chatProvider !== "mock" &&
      !this.connection(config, config.chatProvider).chatModel
    ) {
      throw new BadRequestException("AI chat model is required");
    }
    if (
      !["mock", "local"].includes(config.embeddingProvider) &&
      !this.connection(config, config.embeddingProvider).embeddingModel
    ) {
      throw new BadRequestException("AI embedding model is required");
    }
    return config;
  }

  private chatProvider(value: unknown): AiChatProviderName {
    return typeof value === "string" &&
      chatProviders.has(value as AiChatProviderName)
      ? (value as AiChatProviderName)
      : "mock";
  }

  private embeddingProvider(value: unknown): AiEmbeddingProviderName {
    return typeof value === "string" &&
      embeddingProviders.has(value as AiEmbeddingProviderName)
      ? (value as AiEmbeddingProviderName)
      : "mock";
  }

  private defaultConnection(
    provider: AiChatProviderName | AiEmbeddingProviderName,
  ) {
    if (provider === "openai") return this.baseConfig.providers.openai;
    if (provider === "openai_compatible") {
      return this.baseConfig.providers.openaiCompatible;
    }
    if (provider === "gemini_openai_compatible") {
      return this.baseConfig.providers.geminiOpenAiCompatible;
    }
    return {};
  }

  private connection(
    config: AiConfig,
    provider: AiChatProviderName | AiEmbeddingProviderName,
  ) {
    if (provider === "openai") return config.providers.openai;
    if (provider === "openai_compatible") {
      return config.providers.openaiCompatible;
    }
    return config.providers.geminiOpenAiCompatible;
  }

  private string(value: unknown) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : undefined;
  }
}
