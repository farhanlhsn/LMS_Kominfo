import { PrismaClient } from "@lms/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { CoreLmsService } from "./core-lms.service";
import { RedisService } from "../redis/redis.service";

let prisma: PrismaClient;
let redis: Redis;
let service: CoreLmsService;

const orgId = "org-corelms-integration";
const userId = "user-corelms-integration";
const org = {
  id: orgId, slug: "corelms-integration", name: "CoreLms Integration Org",
  memberId: "m1", roleKeys: ["instructor"], permissionKeys: [], isPlatformAdmin: true,
};

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
  redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const redisService = new RedisService(redis as any);
  service = new CoreLmsService(prisma as any, undefined, redisService);

  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: "CoreLms Integration Org", slug: "corelms-integration" },
  });
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "corelms-test@example.com", name: "CoreLms Test", passwordHash: "x" },
  });
  // OrganizationMember has no unique constraint — create only if not exists
  const existing = await prisma.organizationMember.findFirst({ where: { userId, organizationId: orgId } });
  if (!existing) {
    await prisma.organizationMember.create({ data: { userId, organizationId: orgId, status: "ACTIVE" } });
  }
});

afterAll(async () => {
  const courses = await prisma.course.findMany({ where: { organizationId: orgId } });
  for (const c of courses) {
    await redis.del(`instructor:course:${c.id}`);
  }
  await redis.del(`instructor:courses:${orgId}:admin`);
  await redis.del(`instructor:courses:${orgId}:${userId}`);

  await prisma.course.deleteMany({ where: { organizationId: orgId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await redis.quit();
  await prisma.$disconnect();
});

describe("CoreLmsService (integration)", () => {
  let courseId: string;

  it("creates a course and stores it in DB", async () => {
    const course = await service.createCourse(org, userId, { title: "Integration Course", slug: "integration-course" } as any) as any;
    courseId = course.id;
    expect(course.title).toBe("Integration Course");
    expect(course.organizationId).toBe(orgId);
  });

  it("fetches instructor course and caches it", async () => {
    const result = await service.getInstructorCourse(org, userId, courseId) as any;
    expect(result.id).toBe(courseId);

    const cached = await redis.get(`instructor:course:${courseId}`);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!).id).toBe(courseId);
  });

  it("serves course from cache on second call (stale read)", async () => {
    await prisma.course.update({ where: { id: courseId }, data: { title: "Modified Directly" } });

    const result = await service.getInstructorCourse(org, userId, courseId) as any;
    expect(result.title).toBe("Integration Course");
  });

  it("invalidates cache after updateCourse", async () => {
    await service.updateCourse(org, userId, courseId, { title: "Updated via Service" } as any);

    const cached = await redis.get(`instructor:course:${courseId}`);
    expect(cached).toBeNull();

    const fresh = await service.getInstructorCourse(org, userId, courseId) as any;
    expect(fresh.title).toBe("Updated via Service");
  });

  it("creates module and invalidates course cache", async () => {
    await service.getInstructorCourse(org, userId, courseId);
    const before = await redis.get(`instructor:course:${courseId}`);
    expect(before).not.toBeNull();

    await service.createModule(org, userId, courseId, { title: "Module 1" } as any);

    const after = await redis.get(`instructor:course:${courseId}`);
    expect(after).toBeNull();
  });
});
