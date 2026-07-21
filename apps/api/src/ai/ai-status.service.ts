import { Inject, Injectable } from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
} from "./ai-provider.factories";

@Injectable()
export class AiStatusService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly chatFactory: AiChatProviderFactory,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
    private readonly prisma: PrismaService,
  ) {}

  async getStatus(organizationId: string) {
    const chat = this.chatFactory.create().capabilities;
    const embedding = this.embeddingFactory.create().capabilities;
    const needsReindex = await this.detectModelMismatch(
      organizationId,
      embedding.model,
    );

    return {
      enabled: this.config.enabled,
      chatProvider: this.config.chatProvider,
      embeddingProvider: this.config.embeddingProvider,
      chatModel: chat.model,
      embeddingModel: embedding.model,
      localEmbeddingModel: this.config.localEmbedding.model,
      capabilities: { chat, embedding },
      answerMode: this.config.answerMode,
      routerMode: this.config.routerMode,
      cacheEnabled: this.config.cache.enabled,
      followupsEnabled: this.config.followups.enabled,
      localClassifierEnabled: this.config.localClassifier.enabled,
      missingConfiguration: [],
      needsReindex,
      disabledReason: this.config.enabled
        ? null
        : "AI is disabled by AI_ENABLED=false; mock-safe configuration remains available.",
    };
  }

  private async detectModelMismatch(
    organizationId: string,
    model: string | null,
  ): Promise<boolean> {
    if (!model || this.config.embeddingProvider === "mock") return false;

    const expected = {
      embeddingProvider:
        this.config.embeddingProvider === "local"
          ? this.config.localEmbedding.provider
          : this.config.embeddingProvider,
      embeddingModel: model,
      embeddingRevision:
        this.config.embeddingProvider === "local"
          ? (this.config.localEmbedding.revision ?? null)
          : null,
    };
    const dimensions =
      this.config.embeddingProvider === "local"
        ? this.config.localEmbedding.dimensions
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
