import { Inject, Injectable, Optional } from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
} from "./ai-provider.factories";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";
import { PluginRegistry } from "../plugins/plugin-registry.service";

@Injectable()
export class AiStatusService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly chatFactory: AiChatProviderFactory,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
    private readonly prisma: PrismaService,
    @Optional()
    private readonly tenantRuntime?: AiTenantRuntimeService,
    @Optional()
    private readonly pluginRegistry?: PluginRegistry,
  ) {}

  async getStatus(organizationId: string) {
    const config =
      (await this.tenantRuntime?.getConfig(organizationId)) ?? this.config;
    const chat = this.chatFactory.create(config).capabilities;
    const embedding = this.embeddingFactory.create(config).capabilities;
    const needsReindex = await this.detectModelMismatch(
      organizationId,
      embedding.model,
      config,
    );
    const featureKeys = [
      "plugin.ai_provider",
      "plugin.ai_course_indexer",
      "plugin.ai_tutor",
      "plugin.ai_content_studio",
      "plugin.ai_question_generator",
      "plugin.ai_grading_assistant",
    ] as const;
    const features = Object.fromEntries(
      await Promise.all(
        featureKeys.map(async (key) => [
          key,
          this.pluginRegistry
            ? await this.pluginRegistry.isEnabledForOrganization(
                organizationId,
                key,
              )
            : true,
        ]),
      ),
    );
    const missingConfiguration =
      features["plugin.ai_provider"] && !config.enabled
        ? ["apiKey or provider model configuration"]
        : [];

    return {
      enabled: config.enabled,
      chatProvider: config.chatProvider,
      embeddingProvider: config.embeddingProvider,
      chatModel: chat.model,
      embeddingModel: embedding.model,
      localEmbeddingModel: config.localEmbedding.model,
      capabilities: { chat, embedding },
      answerMode: config.answerMode,
      routerMode: config.routerMode,
      cacheEnabled: config.cache.enabled,
      followupsEnabled: config.followups.enabled,
      localClassifierEnabled: config.localClassifier.enabled,
      missingConfiguration,
      features,
      needsReindex,
      disabledReason: config.enabled
        ? null
        : features["plugin.ai_provider"]
          ? "AI Provider needs organization configuration."
          : "AI Provider plugin is not installed and enabled for this organization.",
    };
  }

  private async detectModelMismatch(
    organizationId: string,
    model: string | null,
    config: AiConfig,
  ): Promise<boolean> {
    if (!model || config.embeddingProvider === "mock") return false;

    const expected = {
      embeddingProvider:
        config.embeddingProvider === "local"
          ? config.localEmbedding.provider
          : config.embeddingProvider,
      embeddingModel: model,
      embeddingRevision:
        config.embeddingProvider === "local"
          ? (config.localEmbedding.revision ?? null)
          : null,
    };
    const dimensions =
      config.embeddingProvider === "local"
        ? config.localEmbedding.dimensions
        : undefined;
    const mismatch = {
      OR: [
        { embeddingProvider: { not: expected.embeddingProvider } },
        { embeddingModel: { not: expected.embeddingModel } },
        { embeddingRevision: { not: expected.embeddingRevision } },
        ...(dimensions === undefined
          ? []
          : [{ embeddingDimensions: { not: dimensions } }]),
      ],
    };
    const [mismatchedChunks, mismatchedQuestions, mismatchedPrototypes, pendingChunks, pendingQuestions, pendingPrototypes] =
      await this.prisma.$transaction([
        this.prisma.aiDocumentChunk.count({
          where: { organizationId, status: "READY", ...mismatch },
        }),
        this.prisma.aiCanonicalQuestion.count({
          where: { organizationId, status: "READY", ...mismatch },
        }),
        this.prisma.aiClassificationPrototype.count({
          where: { organizationId, status: "READY", ...mismatch },
        }),
        this.prisma.aiDocumentChunk.count({
          where: { organizationId, status: "NEEDS_REINDEX" },
        }),
        this.prisma.aiCanonicalQuestion.count({
          where: { organizationId, status: "NEEDS_REINDEX" },
        }),
        this.prisma.aiClassificationPrototype.count({
          where: { organizationId, status: "NEEDS_REINDEX" },
        }),
      ]);
    return (
      mismatchedChunks +
        mismatchedQuestions +
        mismatchedPrototypes +
        pendingChunks +
        pendingQuestions +
        pendingPrototypes >
      0
    );
  }
}
