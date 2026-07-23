import { createHash } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import { AiEmbeddingProviderFactory } from "./ai-provider.factories";
import type { LocalEmbeddingProvider } from "./ai-provider.types";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

function cosine(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return -1;
  return left.reduce(
    (sum, value, index) => sum + value * (right[index] ?? 0),
    0,
  );
}

@Injectable()
export class AiCanonicalCacheService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly prisma: PrismaService,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
    @Optional()
    private readonly tenantRuntime?: AiTenantRuntimeService,
  ) {}

  async canonicalize(
    organizationId: string,
    courseId: string | null,
    question: string,
  ) {
    const normalized = this.normalize(question);
    if (!this.config.canonicalization.enabled) {
      return { text: normalized, key: this.hash(normalized) };
    }
    const tenantConfig = await this.tenantRuntime?.assertReady(organizationId);
    const provider = this.embeddingFactory.create(tenantConfig);
    const vector = await provider.embedText(
      `${this.config.localEmbedding.queryPrefix} ${normalized}`,
    );
    const candidates = await this.prisma.aiCanonicalQuestion.findMany({
      where: {
        organizationId,
        courseId,
        status: "READY",
        embeddingProvider: provider.capabilities.providerName,
        embeddingModel: provider.capabilities.model ?? "unknown",
        embeddingDimensions: vector.length,
      },
      take: 100,
    });
    const best = candidates
      .map((candidate) => ({
        candidate,
        score: cosine(
          vector,
          Array.isArray(candidate.embedding)
            ? candidate.embedding.filter(
                (value): value is number => typeof value === "number",
              )
            : [],
        ),
      }))
      .sort((left, right) => right.score - left.score)[0];
    if (
      best &&
      best.score >= this.config.canonicalization.similarityThreshold
    ) {
      return { text: best.candidate.canonicalText, key: best.candidate.id };
    }
    const created = await this.prisma.aiCanonicalQuestion.create({
      data: {
        organizationId,
        courseId,
        canonicalText: normalized,
        embedding: vector as Prisma.InputJsonArray,
        embeddingProvider: provider.capabilities.providerName,
        embeddingModel: provider.capabilities.model ?? "unknown",
        embeddingDimensions: vector.length,
        embeddingRevision:
          (provider as Partial<LocalEmbeddingProvider>).revision ?? null,
        status: "READY",
        metadata: {},
      },
    });
    return { text: normalized, key: created.id };
  }

  contextHash(parts: string[]) {
    return this.hash(parts.join("|"));
  }

  async get(
    organizationId: string,
    courseId: string | null,
    canonicalKey: string,
    contextHash: string,
  ) {
    if (!this.config.cache.enabled) return null;
    const cached = await this.prisma.aiAnswerCache.findFirst({
      where: {
        organizationId,
        courseId,
        canonicalKey,
        contextHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (!cached) return null;
    await this.prisma.aiAnswerCache.update({
      where: { id: cached.id },
      data: { hitCount: { increment: 1 } },
    });
    return cached;
  }

  async put(input: {
    organizationId: string;
    courseId: string | null;
    canonicalQuestion: string;
    canonicalKey: string;
    contextHash: string;
    sourceType: "COURSE_MATERIAL" | "GENERAL_EDUCATIONAL";
    answer: string;
    citations: unknown[];
    suggestions: string[];
    provider: string;
    model: string | null;
  }) {
    if (!this.config.cache.enabled) return;
    const existing = await this.prisma.aiAnswerCache.findFirst({
      where: {
        organizationId: input.organizationId,
        courseId: input.courseId,
        canonicalKey: input.canonicalKey,
        contextHash: input.contextHash,
      },
    });
    const data = {
      canonicalQuestion: input.canonicalQuestion,
      sourceType: input.sourceType,
      answer: input.answer,
      citations: input.citations as Prisma.InputJsonArray,
      suggestions: input.suggestions as Prisma.InputJsonArray,
      provider: input.provider,
      model: input.model,
      expiresAt: new Date(Date.now() + this.config.cache.ttlSeconds * 1000),
    };
    if (existing) {
      await this.prisma.aiAnswerCache.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.aiAnswerCache.create({ data: { ...input, ...data } });
    }
  }

  private normalize(question: string) {
    const tokens = question
      .toLocaleLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token &&
          ![
            "apa",
            "itu",
            "yang",
            "dan",
            "tentang",
            "jelaskan",
            "tolong",
          ].includes(token),
      );
    const keyTerms = tokens
      .filter((token) => ["tcp", "udp", "http", "api"].includes(token))
      .sort();
    return (
      (keyTerms.length ? keyTerms : tokens).join(" ").trim() ||
      question.trim().toLocaleLowerCase()
    );
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
}
