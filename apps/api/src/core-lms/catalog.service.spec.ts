import { describe, expect, it, vi } from "vitest";
import { CoreLmsService } from "./core-lms.service";

const organizationId = "org-1";

function setupCatalog(overrides: Record<string, any> = {}) {
  const courses = [
    { id: "c1", title: "A", category: { id: "cat" }, _count: { enrollments: 1, modules: 2, lessons: 4, activities: 3 } },
  ];
  const prisma = {
    course: {
      findMany: vi.fn().mockResolvedValue(courses),
      count: vi.fn().mockResolvedValue(1),
    },
    ...overrides,
  };
  return { service: new CoreLmsService(prisma as never), prisma };
}

describe("CoreLmsService.listCatalog", () => {
  it("returns paginated published courses scoped to org", async () => {
    const { service, prisma } = setupCatalog();
    const result = await service.listCatalog(organizationId, { page: 1, limit: 10 });
    expect(result).toMatchObject({ meta: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId, status: "PUBLISHED" }),
        skip: 0,
        take: 10,
      })
    );
    expect(prisma.course.findMany.mock.calls[0]?.[0].include?._count?.select).toMatchObject({
      lessons: true,
    });
  });

  it("clamps limit to a maximum of 50", async () => {
    const { service, prisma } = setupCatalog();
    await service.listCatalog(organizationId, { limit: 9999 });
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it("clamps page to at least 1", async () => {
    const { service, prisma } = setupCatalog();
    await service.listCatalog(organizationId, { page: 0, limit: 5 });
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 5 })
    );
  });

  it("adds search OR clause when query is provided", async () => {
    const { service, prisma } = setupCatalog();
    await service.listCatalog(organizationId, { search: "kotlin" });
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });
});
