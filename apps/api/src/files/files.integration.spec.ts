import { PrismaClient } from "@lms/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { FilesService } from "./files.service";
import { RedisService } from "../redis/redis.service";

let prisma: PrismaClient;
let redis: Redis;
let service: FilesService;

const orgId = "org-files-integration";
const userId = "user-files-integration";

const fakeStorage = {
  uploadFile: async () => undefined,
  deleteFile: async () => undefined,
  getSignedUrl: async () => "https://example.com/signed",
  getPublicUrl: () => "https://example.com/public",
} as any;

const fakeAccessPolicy = {
  ensureCanReadFile: async (org: any, uid: any, fileId: any) => {
    return prisma.file.findFirstOrThrow({ where: { id: fileId } });
  },
  ensureCanManageFile: async (org: any, uid: any, fileId: any) => {
    return prisma.file.findFirstOrThrow({ where: { id: fileId } });
  },
} as any;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
  redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const redisService = new RedisService(redis as any);
  service = new FilesService(prisma as any, fakeStorage, fakeAccessPolicy, redisService);

  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: "Files Integration Org", slug: "files-integration-org" },
  });
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "files-test@example.com", name: "Files Test User", passwordHash: "x" },
  });
});

afterAll(async () => {
  await prisma.file.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await redis.del(`files:list:${orgId}`);
  await redis.quit();
  await prisma.$disconnect();
});

describe("FilesService (integration)", () => {
  it("returns empty list for new org", async () => {
    const result = await service.list(orgId, {});
    expect(result.data).toEqual([]);
    expect((result.meta as any).total).toBe(0);
  });

  it("caches list result in Redis", async () => {
    await prisma.file.create({
      data: {
        organizationId: orgId, ownerId: userId,
        bucket: "test-bucket", key: "test/file.pdf",
        filename: "file.pdf", originalFilename: "file.pdf",
        mimeType: "application/pdf", extension: "pdf",
        size: 1024, checksum: "abc123",
        storageProvider: "MINIO", visibility: "PRIVATE",
        accessLevel: "OWNER", purpose: "DOCUMENT",
        processingStatus: "READY", metadata: {},
      },
    });

    const result = await service.list(orgId, {});
    expect(result.data).toHaveLength(1);

    const cached = await redis.get(`files:list:${orgId}`);
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!);
    expect(parsed.data).toHaveLength(1);
  });

  it("serves stale cache without re-querying DB", async () => {
    // add file directly to DB
    await prisma.file.create({
      data: {
        organizationId: orgId, ownerId: userId,
        bucket: "test-bucket", key: "test/file2.pdf",
        filename: "file2.pdf", originalFilename: "file2.pdf",
        mimeType: "application/pdf", extension: "pdf",
        size: 2048, checksum: "def456",
        storageProvider: "MINIO", visibility: "PRIVATE",
        accessLevel: "OWNER", purpose: "DOCUMENT",
        processingStatus: "READY", metadata: {},
      },
    });

    // still returns cached 1 item
    const result = await service.list(orgId, {});
    expect(result.data).toHaveLength(1);
  });

  it("bypasses cache when filter is applied", async () => {
    const result = await service.list(orgId, { search: "file2" });
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as any)!.filename).toBe("file2.pdf");
  });
});
