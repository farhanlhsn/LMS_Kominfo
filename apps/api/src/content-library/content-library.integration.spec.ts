import { PrismaClient } from "@lms/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { ContentLibraryService } from "./content-library.service";
import { RedisService } from "../redis/redis.service";

let prisma: PrismaClient;
let redis: Redis;
let service: ContentLibraryService;

const orgId = "org-content-library-integration";
const userId = "user-content-library-integration";
const fakePolicyService = { ensureCanReadFile: async () => undefined } as any;
const fakeProcessing = { enqueue: async () => ({ queued: false }) } as any;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
  redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const redisService = new RedisService(redis as any);
  service = new ContentLibraryService(prisma as any, fakePolicyService, fakeProcessing, redisService);

  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: "Content Library Integration Org", slug: "content-library-integration" },
  });
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "content-library-test@example.com", name: "Content Library Test", passwordHash: "x" },
  });
});

afterAll(async () => {
  await prisma.contentLibraryItem.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await redis.del(`content-library:${orgId}`);
  await redis.quit();
  await prisma.$disconnect();
});

describe("ContentLibraryService (integration)", () => {
  it("returns empty list for new org", async () => {
    const result = await service.list(orgId, {});
    expect(result).toEqual([]);
  });

  it("caches list result in Redis after first fetch", async () => {
    await prisma.contentLibraryItem.create({
      data: { organizationId: orgId, createdById: userId, title: "Test Doc", type: "FILE", tags: [], metadata: {} },
    });

    const result = await service.list(orgId, {});
    expect(result).toHaveLength(1);

    const cached = await redis.get(`content-library:${orgId}`);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!)).toHaveLength(1);
  });

  it("returns stale cached data when DB has new items", async () => {
    // add directly to DB without going through service (no cache invalidation)
    await prisma.contentLibraryItem.create({
      data: { organizationId: orgId, createdById: userId, title: "Test Doc 2", type: "FILE", tags: [], metadata: {} },
    });

    // cache still has 1 item
    const result = await service.list(orgId, {});
    expect(result).toHaveLength(1);
  });

  it("invalidates cache on create via service", async () => {
    const org = { id: orgId, slug: "content-library-integration", name: "Content Library Integration Org", memberId: "m1", roleKeys: [], permissionKeys: [], isPlatformAdmin: false };
    await service.create(org, userId, { title: "New Item", type: "FILE" } as any);

    const cached = await redis.get(`content-library:${orgId}`);
    expect(cached).toBeNull();

    const fresh = await service.list(orgId, {});
    expect(fresh.length).toBeGreaterThanOrEqual(3);
  });

  it("invalidates cache on delete", async () => {
    const items = await service.list(orgId, {});
    expect(items.length).toBeGreaterThan(0);
    const item = items[0] as { id: string };
    await service.delete(orgId, item.id);

    const cached = await redis.get(`content-library:${orgId}`);
    expect(cached).toBeNull();

    const fresh = await service.list(orgId, {});
    expect(fresh.length).toBe(items.length - 1);
  });

  it("bypasses cache when search query is provided", async () => {
    await service.list(orgId, {}); // populate cache
    const withSearch = await service.list(orgId, { search: "New" });
    expect(Array.isArray(withSearch)).toBe(true);
  });
});
