import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminReviewList,
  FavoriteInstructorList,
  RecentlyViewedList,
  type AdminReviewRow,
} from "./lists";
import { ReviewList, ReviewSummary } from "./review-list";
import { WishlistButton } from "./wishlist-button";
import type { CourseReview } from "../../lib/lms-types";

function makeReview(overrides: Partial<CourseReview> = {}): CourseReview {
  return {
    id: overrides.id ?? "review_1",
    courseId: overrides.courseId ?? "course_1",
    userId: overrides.userId ?? "user_1",
    rating: overrides.rating ?? 5,
    title: overrides.title ?? "Great",
    body: overrides.body ?? "Loved it",
    status: overrides.status ?? "APPROVED",
    createdAt: overrides.createdAt ?? "2026-07-01T00:00:00.000Z",
    user: overrides.user,
    course: overrides.course,
  };
}

function makeAdminReview(overrides: Partial<AdminReviewRow> = {}): AdminReviewRow {
  return {
    id: overrides.id ?? "admin_review_1",
    courseId: overrides.courseId ?? "course_1",
    userId: overrides.userId ?? "user_1",
    rating: overrides.rating ?? 4,
    title: overrides.title ?? "Solid",
    body: overrides.body ?? "Pretty good",
    status: overrides.status ?? "PENDING",
    createdAt: overrides.createdAt ?? "2026-07-01T00:00:00.000Z",
    user: overrides.user ?? { id: "user_1", name: "Ayu", email: "ayu@example.com" },
    course:
      "course" in overrides
        ? overrides.course ?? undefined
        : { id: "course_1", title: "LMS 101", slug: "lms-101" },
  };
}

describe("FavoriteInstructorList", () => {
  it("renders empty state when no favorites", () => {
    const html = renderToStaticMarkup(
      createElement(FavoriteInstructorList, { favorites: [] }),
    );
    expect(html).toContain("No favorite instructors");
  });

  it("renders favorite instructor cards", () => {
    const html = renderToStaticMarkup(
      createElement(FavoriteInstructorList, {
        favorites: [
          {
            id: "fav_1",
            instructorId: "instr_1",
            instructor: { id: "instr_1", name: "Budi", email: "budi@x.com" },
          },
        ],
      }),
    );
    expect(html).toContain("Budi");
    expect(html).toContain("budi@x.com");
  });

  it("falls back to email when name is missing", () => {
    const html = renderToStaticMarkup(
      createElement(FavoriteInstructorList, {
        favorites: [
          {
            id: "fav_1",
            instructorId: "instr_1",
            instructor: { id: "instr_1", name: null, email: "anon@x.com" },
          },
        ],
      }),
    );
    expect(html).toContain("anon@x.com");
  });
});

describe("RecentlyViewedList", () => {
  it("renders empty state when no items", () => {
    const html = renderToStaticMarkup(
      createElement(RecentlyViewedList, { items: [] }),
    );
    expect(html).toContain("No recently viewed courses");
  });

  it("renders recent course items with formatted date", () => {
    const html = renderToStaticMarkup(
      createElement(RecentlyViewedList, {
        items: [
          {
            id: "rv_1",
            courseId: "course_1",
            viewedAt: "2026-07-01T10:00:00.000Z",
            course: { id: "course_1", title: "React Basics", slug: "react-basics" },
          },
        ],
      }),
    );
    expect(html).toContain("React Basics");
    expect(html).toContain("Viewed");
  });
});

describe("AdminReviewList", () => {
  it("renders empty state when queue is empty", () => {
    const html = renderToStaticMarkup(
      createElement(AdminReviewList, {
        reviews: [],
        onApprove: () => undefined,
        onReject: () => undefined,
      }),
    );
    expect(html).toContain("Queue is empty");
  });

  it("renders pending reviews with approve/reject controls", () => {
    const html = renderToStaticMarkup(
      createElement(AdminReviewList, {
        reviews: [makeAdminReview({ id: "r1" }), makeAdminReview({ id: "r2" })],
        onApprove: () => undefined,
        onReject: () => undefined,
      }),
    );
    expect(html).toContain("LMS 101");
    expect(html).toContain("Ayu");
    expect(html).toContain("Approve");
    expect(html).toContain("Reject");
    expect(html).toContain("PENDING");
  });

  it("falls back to courseId when course object is missing", () => {
    const html = renderToStaticMarkup(
      createElement(AdminReviewList, {
        reviews: [
          makeAdminReview({ id: "r1", course: null, courseId: "fallback_id" }),
        ],
        onApprove: () => undefined,
        onReject: () => undefined,
      }),
    );
    expect(html).toContain("fallback_id");
    expect(html).not.toContain("LMS 101");
  });
});

describe("ReviewSummary", () => {
  it("renders average and review count", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewSummary, { average: 4.5, total: 12 }),
    );
    expect(html).toContain("4.5");
    expect(html).toContain("Based on 12 reviews");
  });

  it("uses singular noun when total is 1", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewSummary, { average: 5, total: 1 }),
    );
    expect(html).toContain("Based on 1 review");
  });
});

describe("ReviewList", () => {
  it("renders empty state when no reviews", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewList, { reviews: [] }),
    );
    expect(html).toContain("No reviews yet");
  });

  it("renders review entries with author and body", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [
          makeReview({
            id: "r1",
            title: "Helpful",
            body: "Loved the pacing",
            user: { id: "u1", name: "Citra" },
          }),
        ],
      }),
    );
    expect(html).toContain("Citra");
    expect(html).toContain("Helpful");
    expect(html).toContain("Loved the pacing");
  });

  it("hides edit/delete controls when reviewer is not current user", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r1", userId: "user_other" })],
        currentUserId: "user_me",
        onEdit: () => undefined,
        onDelete: () => undefined,
      }),
    );
    expect(html).not.toContain("Edit");
    expect(html).not.toContain("Delete");
  });

  it("shows edit/delete controls when reviewer matches current user", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r1", userId: "user_me" })],
        currentUserId: "user_me",
        onEdit: () => undefined,
        onDelete: () => undefined,
      }),
    );
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
  });

  it("uses status badge with correct tone for each status", () => {
    const approved = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r1", status: "APPROVED" })],
      }),
    );
    expect(approved).toContain("approved");

    const pending = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r2", status: "PENDING" })],
      }),
    );
    expect(pending).toContain("pending");

    const rejected = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r3", status: "REJECTED" })],
      }),
    );
    expect(rejected).toContain("rejected");
  });

  it("falls back to 'Learner' when reviewer name missing", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewList, {
        reviews: [makeReview({ id: "r1", user: undefined })],
      }),
    );
    expect(html).toContain("Learner");
  });
});

describe("WishlistButton", () => {
  it("renders persisted wishlist state", () => {
    const html = renderToStaticMarkup(
      createElement(WishlistButton, {
        courseId: "course_1",
        initialActive: true,
      }),
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Remove from wishlist");
  });
});
