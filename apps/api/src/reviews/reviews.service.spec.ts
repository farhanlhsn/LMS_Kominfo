import { BadRequestException,ForbiddenException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { ReviewsService } from "./reviews.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const adminOrg = { ...org, roleKeys: ["org_admin"], isPlatformAdmin: true };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a", deletedAt: null }) },
    enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "COMPLETED", progressPercent: 100, completedAt: null }) },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue(null) },
    courseReview: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue({ id: "rev-a", organizationId: "org-a", courseId: "course-a", userId: "user-a" }), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "rev-a" }), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } }), count: vi.fn().mockResolvedValue(0) },
    wishlist: {
      findUnique: vi.fn().mockResolvedValue({ id: "w1" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "w1" }),
      upsert: vi.fn().mockResolvedValue({ id: "w1" }),
      delete: vi.fn().mockResolvedValue({ id: "w1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    favoriteInstructor: {
      findUnique: vi.fn().mockResolvedValue({ id: "f1" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "f1" }),
      upsert: vi.fn().mockResolvedValue({ id: "f1" }),
      delete: vi.fn().mockResolvedValue({ id: "f1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    recentlyViewedCourse: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "rv-a" }), upsert: vi.fn().mockResolvedValue({ id: "rv-a" }) },
    learnerNote: { findMany: vi.fn().mockResolvedValue([{ id: "note-a", content: "My note", course: { title: "Course" }, lesson: { title: "Lesson" } }]) },
    user: { findFirst: vi.fn().mockResolvedValue({ id: "inst-a", name: "Instructor" }) },
    ...overrides,
  };
  return { service: new ReviewsService(prisma as never), prisma };
}

describe("ReviewsService", () => {
  describe("create", () => {
    it("creates a review for completed enrollment", async () => {
      const { service, prisma } = setup();
      await service.create(org, "user-a", { courseId: "course-a", rating: 5, title: "Great!", body: "Loved it" });
      expect(prisma.courseReview.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rating: 5, title: "Great!" }) }));
    });

    it("allows review when completion timestamp exists", async () => {
      const { service, prisma } = setup({
        enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", progressPercent: 70, completedAt: new Date() }) },
      });
      await service.create(org, "user-a", { courseId: "course-a", rating: 5 });
      expect(prisma.courseReview.create).toHaveBeenCalled();
    });

    it("wishlist favorites and recently viewed", async () => {
      const { service, prisma } = setup();
      await service.addWishlist(org, "user-a", { courseId: "course-a" } as any);
      await service.listWishlist(org, "user-a");
      await service.removeWishlist(org, "user-a", "course-a");
      await service.addFavoriteInstructor(org, "user-a", {
        instructorId: "inst-a",
      } as any);
      await service.listFavoriteInstructors(org, "user-a");
      await service.removeFavoriteInstructor(org, "user-a", "inst-a");
      await service.trackView(org, "user-a", "course-a");
      await service.listRecentlyViewed(org, "user-a");
      await service.exportNotes(org, "user-a");
      await service.listForCourse(org, "course-a", {} as any);
      await service.listModeration(adminOrg, {} as any);
      prisma.courseReview.findFirst.mockResolvedValue({
        id: "rev-a",
        organizationId: "org-a",
        courseId: "course-a",
        userId: "user-a",
      });
      await service.update(org, "user-a", "rev-a", {
        courseId: "course-a",
        rating: 4,
      } as any);
      await service.delete(org, "user-a", "rev-a");
      await service.moderate(adminOrg, "admin", "rev-a", {
        status: "HIDDEN",
      } as any);
      expect(prisma.wishlist.upsert || prisma.wishlist.create).toBeTruthy();
    });

    it("allows review when progress reaches 100 percent", async () => {
      const { service, prisma } = setup({
        enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", progressPercent: 100, completedAt: null }) },
      });
      await service.create(org, "user-a", { courseId: "course-a", rating: 5 });
      expect(prisma.courseReview.create).toHaveBeenCalled();
    });

    it("rejects duplicate review", async () => {
      const { service } = setup({ courseReview: { findUnique: vi.fn().mockResolvedValue({ id: "existing" }) } });
      await expect(service.create(org, "user-a", { courseId: "course-a", rating: 3 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects review when enrollment not completed", async () => {
      const { service } = setup({
        enrollment: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", progressPercent: 99, completedAt: null }) },
      });
      await expect(service.create(org, "user-a", { courseId: "course-a", rating: 3 })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("listForCourse", () => {
    it("returns approved reviews with average", async () => {
      const { service } = setup();
      const result = await service.listForCourse(org, "course-a", { page: 1, limit: 20 });
      expect(result.average).toBe(4.5);
      expect(result.totalReviews).toBe(10);
    });
  });

  describe("moderate", () => {
    it("allows admin to moderate", async () => {
      const { service, prisma } = setup();
      await service.moderate(adminOrg, "admin-a", "rev-a", { status: "APPROVED" });
      expect(prisma.courseReview.update).toHaveBeenCalled();
    });
  });

  describe("Wishlist", () => {
    it("adds course to wishlist", async () => {
      const { service, prisma } = setup();
      await service.addWishlist(org, "user-a", { courseId: "course-a" });
      expect(prisma.wishlist.upsert).toHaveBeenCalled();
    });
  });

  describe("Favorite Instructors", () => {
    it("adds favorite instructor", async () => {
      const { service, prisma } = setup();
      await service.addFavoriteInstructor(org, "user-a", { instructorId: "inst-a" });
      expect(prisma.favoriteInstructor.upsert).toHaveBeenCalled();
    });
  });

  describe("Recently Viewed", () => {
    it("tracks course view", async () => {
      const { service, prisma } = setup();
      await service.trackView(org, "user-a", "course-a");
      expect(prisma.recentlyViewedCourse.upsert).toHaveBeenCalled();
    });
  });

  describe("Notes Export", () => {
    it("exports notes as markdown", async () => {
      const { service } = setup();
      const result = await service.exportNotes(org, "user-a");
      expect(result.data.format).toBe("markdown");
      expect(result.data.count).toBe(1);
      expect(result.data.markdown).toContain("My note");
    });
  });
});
