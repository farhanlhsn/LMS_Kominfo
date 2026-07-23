import { ForbiddenException,NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { ReviewsController } from "./reviews.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const reviews = {
    create: vi.fn().mockResolvedValue({ id: "r-1" }),
    update: vi.fn().mockResolvedValue({ id: "r-1", status: "PENDING" }),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    listForCourse: vi.fn().mockResolvedValue({ data: [{ id: "r-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 }, average: 4.5, totalReviews: 1 }),
    listModeration: vi.fn().mockResolvedValue({ data: [{ id: "r-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    moderate: vi.fn().mockResolvedValue({ id: "r-1", status: "APPROVED" }),
    addWishlist: vi.fn().mockResolvedValue({ id: "w-1" }),
    removeWishlist: vi.fn().mockResolvedValue({ deleted: true }),
    listWishlist: vi.fn().mockResolvedValue([{ id: "w-1" }]),
    addFavoriteInstructor: vi.fn().mockResolvedValue({ id: "fav-1" }),
    removeFavoriteInstructor: vi.fn().mockResolvedValue({ deleted: true }),
    listFavoriteInstructors: vi.fn().mockResolvedValue([{ id: "fav-1" }]),
    trackView: vi.fn().mockResolvedValue({ id: "rv-1" }),
    listRecentlyViewed: vi.fn().mockResolvedValue([{ id: "rv-1" }]),
    exportNotes: vi.fn().mockResolvedValue({ data: { markdown: "# Notes", count: 1, format: "markdown" } }),
    ...overrides,
  };
  return { controller: new ReviewsController(reviews as any), reviews };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("ReviewsController", () => {
  it("creates, updates, and deletes reviews", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();

    const createResult = await controller.create(req, { courseId: "c-1", rating: 5 } as any);
    expect(reviews.create).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ courseId: "c-1" }));
    expect(createResult).toEqual({ data: { id: "r-1" } });

    await controller.update(req, "r-1", { courseId: "c-1", rating: 4 } as any);
    expect(reviews.update).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ rating: 4 }));

    const deleteResult = await controller.delete(req, "r-1");
    expect(reviews.delete).toHaveBeenCalledWith(org, "u-1", "r-1");
    expect(deleteResult).toEqual({ deleted: true });
  });

  it("lists reviews for a course and for moderation", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();

    const forCourse = await controller.listForCourse(req, "c-1", { page: 1 } as any);
    expect(reviews.listForCourse).toHaveBeenCalledWith(org, "c-1", expect.objectContaining({ page: 1 }));
    expect(forCourse).toEqual({ data: [{ id: "r-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 }, average: 4.5, totalReviews: 1 });

    const moderation = await controller.listModeration(req, { page: 1 } as any);
    expect(reviews.listModeration).toHaveBeenCalledWith(org, expect.objectContaining({ page: 1 }));
    expect(moderation).toEqual({ data: [{ id: "r-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it("moderates a review", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();
    const result = await controller.moderate(req, "r-1", { status: "APPROVED" } as any);
    expect(reviews.moderate).toHaveBeenCalledWith(org, "u-1", "r-1", expect.objectContaining({ status: "APPROVED" }));
    expect(result).toEqual({ data: { id: "r-1", status: "APPROVED" } });
  });

  it("manages wishlist items: add, remove, list", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();

    const addResult = await controller.addWishlist(req, { courseId: "c-1" } as any);
    expect(reviews.addWishlist).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ courseId: "c-1" }));
    expect(addResult).toEqual({ data: { id: "w-1" } });

    const removeResult = await controller.removeWishlist(req, "c-1");
    expect(reviews.removeWishlist).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(removeResult).toEqual({ deleted: true });

    const listResult = await controller.listWishlist(req);
    expect(reviews.listWishlist).toHaveBeenCalledWith(org, "u-1");
    expect(listResult).toEqual({ data: [{ id: "w-1" }] });
  });

  it("manages favorite instructors: add, remove, list", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();

    const addResult = await controller.addFavorite(req, { instructorId: "u-2" } as any);
    expect(reviews.addFavoriteInstructor).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ instructorId: "u-2" }));
    expect(addResult).toEqual({ data: { id: "fav-1" } });

    const removeResult = await controller.removeFavorite(req, "u-2");
    expect(reviews.removeFavoriteInstructor).toHaveBeenCalledWith(org, "u-1", "u-2");
    expect(removeResult).toEqual({ deleted: true });

    const listResult = await controller.listFavorites(req);
    expect(reviews.listFavoriteInstructors).toHaveBeenCalledWith(org, "u-1");
    expect(listResult).toEqual({ data: [{ id: "fav-1" }] });
  });

  it("tracks and lists recently viewed courses", async () => {
    const { controller, reviews } = setup();
    const req = createRequest();

    const trackResult = await controller.trackView(req, "c-1");
    expect(reviews.trackView).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(trackResult).toEqual({ data: { id: "rv-1" } });

    const listResult = await controller.listRecentlyViewed(req);
    expect(reviews.listRecentlyViewed).toHaveBeenCalledWith(org, "u-1");
    expect(listResult).toEqual({ data: [{ id: "rv-1" }] });
  });

  it("returns the notes export payload (raw, not wrapped)", async () => {
    const { controller, reviews } = setup();
    const result = await controller.exportNotes(createRequest());
    expect(reviews.exportNotes).toHaveBeenCalledWith(org, "u-1");
    expect(result).toEqual({ data: { markdown: "# Notes", count: 1, format: "markdown" } });
  });

  it("propagates not found errors from the service", async () => {
    const { controller } = setup({
      update: vi.fn().mockRejectedValue(new NotFoundException("Review not found")),
    });
    await expect(controller.update(createRequest(), "missing", { courseId: "c-1", rating: 5 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("propagates forbidden exceptions from the service", async () => {
    const { controller } = setup({
      delete: vi.fn().mockRejectedValue(new ForbiddenException("Not allowed")),
    });
    await expect(controller.delete(createRequest(), "r-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
