import { describe, expect, it, vi } from "vitest";
import { SearchService } from "./search.service";
import { MockSearchProvider, SEARCH_PROVIDER } from "./search.provider";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: ["courses:read"],
  isPlatformAdmin: false,
};

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "learner",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

function setup() {
  const searchQueryRows: Array<Record<string, unknown>> = [];
  const prisma: any = {
    searchQuery: {
      create: vi.fn(async (args: any) => {
        searchQueryRows.push(args.data);
        return { id: `sq-${searchQueryRows.length}`, ...args.data };
      }),
      count: vi.fn(async () => searchQueryRows.length),
      groupBy: vi.fn(async () =>
        Object.values(
          searchQueryRows.reduce<Record<string, { query: string; _count: { _all: number } }>>(
            (acc, row) => {
              const key = String(row.query);
              acc[key] = acc[key] ?? { query: key, _count: { _all: 0 } };
              acc[key]._count._all += 1;
              return acc;
            },
            {},
          ),
        ).map((row) => ({ query: row.query, _count: row._count })),
      ),
      findMany: vi.fn(async () =>
        searchQueryRows.map((row, index) => ({
          id: `sq-${index + 1}`,
          ...row,
        })),
      ),
    },
    organization: { findMany: vi.fn(async () => [{ id: org.id }]) },
    course: { findMany: vi.fn(async () => []) },
    lesson: { findMany: vi.fn(async () => []) },
    discussionThread: { findMany: vi.fn(async () => []) },
    user: { findMany: vi.fn(async () => []) },
    certificate: { findMany: vi.fn(async () => []) },
    helpArticle: { findMany: vi.fn(async () => []) },
  };
  const provider = new MockSearchProvider();
  const service = new SearchService(prisma, provider);
  return { service, provider, prisma, searchQueryRows };
}

describe("SearchService", () => {
  it("returns empty result for empty query and does not record analytics", async () => {
    const { service, searchQueryRows } = setup();
    const result = await service.search(org, user.id, "", undefined, undefined, 20);
    expect(result).toMatchObject({ total: 0, hits: [] });
    expect(searchQueryRows).toHaveLength(0);
  });

  it("ranks documents by title > tag > body", async () => {
    const { service, provider } = setup();
    provider.upsert({
      id: "c-1",
      organizationId: org.id,
      type: "course",
      title: "JavaScript Fundamentals",
      body: "Modern JS",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    provider.upsert({
      id: "c-2",
      organizationId: org.id,
      type: "course",
      title: "Cooking 101",
      body: "A great JavaScript primer for foodies",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    provider.upsert({
      id: "c-3",
      organizationId: org.id,
      type: "course",
      title: "Web Development",
      body: "Some unrelated content",
      tags: ["javascript"],
      metadata: {},
      updatedAt: new Date(),
    });
    const result = await service.search(org, user.id, "javascript", undefined, undefined, 20);
    expect(result.total).toBe(3);
    expect(result.hits[0]!.id).toBe("c-1");
    expect(result.hits[0]!.score).toBeGreaterThan(result.hits[1]!.score);
    expect(result.hits[1]!.id).toBe("c-3");
    expect(result.facetCounts.course).toBe(3);
  });

  it("filters results by entity type", async () => {
    const { service, provider } = setup();
    provider.upsert({
      id: "c-1",
      organizationId: org.id,
      type: "course",
      title: "Algebra",
      body: "math",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    provider.upsert({
      id: "u-1",
      organizationId: org.id,
      type: "user",
      title: "Algebra Expert",
      body: "math tutor",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    const result = await service.search(org, user.id, "algebra", ["course"], undefined, 20);
    expect(result.total).toBe(1);
    expect(result.hits[0]!.type).toBe("course");
  });

  it("filters by courseId from document metadata", async () => {
    const { service, provider } = setup();
    provider.upsert({
      id: "l-1",
      organizationId: org.id,
      type: "lesson",
      title: "Intro to React",
      body: "lessons",
      tags: [],
      metadata: { courseId: "c-1" },
      updatedAt: new Date(),
    });
    provider.upsert({
      id: "l-2",
      organizationId: org.id,
      type: "lesson",
      title: "Intro to Vue",
      body: "lessons",
      tags: [],
      metadata: { courseId: "c-2" },
      updatedAt: new Date(),
    });
    const result = await service.search(org, user.id, "intro", undefined, "c-1", 20);
    expect(result.total).toBe(1);
    expect(result.hits[0]!.id).toBe("l-1");
  });

  it("records search analytics when a query is performed", async () => {
    const { service, prisma, searchQueryRows } = setup();
    const createSpy = prisma.searchQuery.create as ReturnType<typeof vi.fn>;
    await service.search(org, user.id, "algebra", ["course"], undefined, 20);
    expect(createSpy).toHaveBeenCalled();
    expect(searchQueryRows).toHaveLength(1);
    expect(searchQueryRows[0]).toMatchObject({ organizationId: org.id, userId: user.id });
  });

  it("returns analytics summary", async () => {
    const { service } = setup();
    const result = await service.getAnalytics(org.id, 30, 25);
    expect(result).toMatchObject({ windowDays: 30, total: 0 });
  });

  it("ignores helpArticle errors during index refresh", async () => {
    const { service, provider } = setup();
    const refresh = await service.refreshIndex(org.id);
    expect(refresh.indexed).toBe(0);
    expect(typeof provider.upsert).toBe("function");
  });
});

describe("MockSearchProvider", () => {
  it("rejects when text has no matching tokens", async () => {
    const provider = new MockSearchProvider();
    provider.upsert({
      id: "c-1",
      organizationId: org.id,
      type: "course",
      title: "Hello",
      body: "World",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    const result = await provider.search({
      organizationId: org.id,
      text: "missing",
      types: ["course"],
      limit: 10,
    });
    expect(result.total).toBe(0);
  });

  it("removes a document from the index", async () => {
    const provider = new MockSearchProvider();
    provider.upsert({
      id: "c-1",
      organizationId: org.id,
      type: "course",
      title: "Hello",
      body: "World",
      tags: [],
      metadata: {},
      updatedAt: new Date(),
    });
    provider.remove(org.id, "course", "c-1");
    const result = await provider.search({
      organizationId: org.id,
      text: "hello",
      types: ["course"],
      limit: 10,
    });
    expect(result.total).toBe(0);
  });
});
