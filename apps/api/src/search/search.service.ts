import { Inject, Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  MockSearchProvider,
  SEARCH_PROVIDER,
  type SearchableDocument,
  type SearchEntityType,
  type SearchProvider,
} from "./search.provider";

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(SEARCH_PROVIDER)
    private readonly provider?: SearchProvider,
  ) {}

  get activeProvider(): SearchProvider {
    return this.provider ?? this.fallbackProvider;
  }

  private readonly fallbackProvider = new MockSearchProvider();

  async onModuleInit() {
    if (process.env.SKIP_DATABASE_CONNECT === "true") {
      return;
    }
    if (this.provider) {
      const provider = this.provider as MockSearchProvider;
      if (typeof (provider as MockSearchProvider).registerSource === "function") {
        const orgs = await this.prisma.organization.findMany({
          select: { id: true },
        });
        for (const org of orgs) {
          await this.refreshIndex(org.id);
        }
      }
    }
  }

  async search(
    organization: OrganizationContext,
    userId: string,
    text: string,
    types: SearchEntityType[] | undefined,
    courseId: string | undefined,
    limit: number | undefined,
  ) {
    const trimmed = (text ?? "").trim();
    if (!trimmed) {
      return {
        query: "",
        total: 0,
        hits: [],
        facetCounts: this.emptyFacetCounts(),
      };
    }
    const result = await this.activeProvider.search({
      organizationId: organization.id,
      text: trimmed,
      types: types && types.length ? types : undefined,
      courseId,
      limit: limit ?? 20,
      userId,
    });
    // Audit/log the query for analytics.
    try {
      await this.prisma.searchQuery.create({
        data: {
          organizationId: organization.id,
          userId,
          query: trimmed,
          types: ((types ?? []) as string[]) as unknown as Prisma.InputJsonValue,
          resultsCount: result.total,
        },
      });
    } catch {
      // Ignore analytics persistence failures to avoid impacting UX.
    }
    return {
      query: trimmed,
      total: result.total,
      hits: result.hits,
      facetCounts: result.facetCounts,
    };
  }

  async getAnalytics(organizationId: string, days: number, limit: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, topQueries, recent] = await Promise.all([
      this.prisma.searchQuery.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      this.prisma.searchQuery.groupBy({
        by: ["query"],
        where: { organizationId, createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { query: "desc" } },
        take: limit,
      }),
      this.prisma.searchQuery.findMany({
        where: { organizationId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return {
      windowDays: days,
      total,
      topQueries: topQueries.map((row) => ({
        query: row.query,
        count: row._count._all,
      })),
      recent: recent.map((row) => ({
        id: row.id,
        query: row.query,
        types: row.types,
        resultsCount: row.resultsCount,
        createdAt: row.createdAt,
      })),
    };
  }

  async refreshIndex(organizationId: string) {
    const provider = this.activeProvider as MockSearchProvider;
    if (typeof provider.upsert !== "function") {
      return { indexed: 0 };
    }
    const documents = await this.loadDocuments(organizationId);
    for (const doc of documents) {
      provider.upsert(doc);
    }
    return { indexed: documents.length };
  }

  private async loadDocuments(
    organizationId: string,
  ): Promise<SearchableDocument[]> {
    const [courses, lessons, discussions, users, certificates, helpArticles] =
      await Promise.all([
        this.prisma.course.findMany({
          where: { organizationId, deletedAt: null },
          select: {
            id: true,
            title: true,
            subtitle: true,
            description: true,
            updatedAt: true,
          },
          take: 200,
        }),
        this.prisma.lesson.findMany({
          where: { organizationId },
          select: {
            id: true,
            title: true,
            summary: true,
            updatedAt: true,
            moduleId: true,
            courseId: true,
          },
          take: 500,
        }),
        this.prisma.discussionThread.findMany({
          where: { organizationId },
          select: {
            id: true,
            title: true,
            body: true,
            updatedAt: true,
          },
          take: 200,
        }),
        this.prisma.user.findMany({
          where: {
            memberships: { some: { organizationId } },
          },
          select: { id: true, name: true, email: true, updatedAt: true },
          take: 200,
        }),
        this.prisma.certificate.findMany({
          where: { organizationId },
          select: {
            id: true,
            certificateNumber: true,
            verificationCode: true,
            issuedAt: true,
            user: { select: { name: true, email: true } },
            template: { select: { name: true } },
          },
          take: 200,
        }),
        this.prisma.helpArticle
          .findMany({
            where: { organizationId },
            select: {
              id: true,
              title: true,
              excerpt: true,
              body: true,
              tags: true,
              updatedAt: true,
            },
            take: 200,
          })
          .catch(() => [] as Awaited<ReturnType<typeof this.prisma.helpArticle.findMany>>),
      ]);

    const docs: SearchableDocument[] = [];
    for (const course of courses) {
      docs.push({
        id: course.id,
        organizationId,
        type: "course",
        title: course.title,
        body: [course.subtitle, course.description].filter(Boolean).join("\n"),
        tags: [],
        metadata: {},
        updatedAt: course.updatedAt,
      });
    }
    for (const lesson of lessons) {
      docs.push({
        id: lesson.id,
        organizationId,
        type: "lesson",
        title: lesson.title,
        body: lesson.summary ?? "",
        tags: [],
        metadata: { courseId: lesson.courseId, moduleId: lesson.moduleId },
        updatedAt: lesson.updatedAt,
      });
    }
    for (const thread of discussions) {
      docs.push({
        id: thread.id,
        organizationId,
        type: "discussion",
        title: thread.title,
        body: thread.body ?? "",
        tags: [],
        metadata: {},
        updatedAt: thread.updatedAt,
      });
    }
    for (const user of users) {
      docs.push({
        id: user.id,
        organizationId,
        type: "user",
        title: user.name ?? user.email,
        body: user.email,
        tags: [],
        metadata: {},
        updatedAt: user.updatedAt,
      });
    }
    for (const certificate of certificates) {
      docs.push({
        id: certificate.id,
        organizationId,
        type: "certificate",
        title: certificate.template?.name ?? "Certificate",
        body: [
          certificate.certificateNumber,
          certificate.verificationCode,
          certificate.user?.name,
          certificate.user?.email,
        ]
          .filter(Boolean)
          .join(" "),
        tags: [],
        metadata: {},
        updatedAt: certificate.issuedAt,
      });
    }
    for (const article of helpArticles) {
      const tagList = Array.isArray(article.tags)
        ? (article.tags as unknown[]).filter(
            (tag): tag is string => typeof tag === "string",
          )
        : [];
      docs.push({
        id: article.id,
        organizationId,
        type: "help_article",
        title: article.title,
        body: [article.excerpt, article.body].filter(Boolean).join("\n"),
        tags: tagList,
        metadata: {},
        updatedAt: article.updatedAt,
      });
    }
    return docs;
  }

  private emptyFacetCounts(): Record<SearchEntityType, number> {
    return {
      course: 0,
      lesson: 0,
      discussion: 0,
      user: 0,
      certificate: 0,
      help_article: 0,
    };
  }
}
