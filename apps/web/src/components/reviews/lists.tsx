"use client";

import { EmptyState } from "../ui/states";
import type {
  CourseReview,
  FavoriteInstructor,
  RecentlyViewedCourse,
  WishlistItem,
} from "../../lib/lms-types";

export function FavoriteInstructorList({
  favorites,
}: {
  favorites: FavoriteInstructor[];
}) {
  if (favorites.length === 0) {
    return (
      <EmptyState
        description="Instructors you follow will appear here."
        title="No favorite instructors"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {favorites.map((favorite) => (
        <article
          key={favorite.id}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <h3 className="text-sm font-semibold">
            {favorite.instructor?.name ?? favorite.instructor?.email ?? "Instructor"}
          </h3>
          {favorite.instructor?.email ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {favorite.instructor.email}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function RecentlyViewedList({
  items,
}: {
  items: RecentlyViewedCourse[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Courses you have viewed recently will appear here."
        title="No recently viewed courses"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <h3 className="text-sm font-semibold">{item.course.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Viewed {new Date(item.viewedAt).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}

export interface AdminReviewRow extends Omit<CourseReview, "user" | "course"> {
  user?: { id: string; name: string | null; email: string } | null;
  course?: { id: string; title: string; slug: string } | null;
}

export function AdminReviewList({
  reviews,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}: {
  reviews: AdminReviewRow[];
  onApprove: (review: AdminReviewRow) => void;
  onReject: (review: AdminReviewRow) => void;
  approvingId?: string | null;
  rejectingId?: string | null;
}) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        description="No reviews are waiting for moderation."
        title="Queue is empty"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Reviewer</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {reviews.map((review) => (
            <tr key={review.id}>
              <td className="px-4 py-3 font-semibold">
                {review.course?.title ?? review.courseId}
                {review.title ? (
                  <p className="text-xs text-muted-foreground">{review.title}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {review.user?.name ?? review.user?.email ?? "Learner"}
              </td>
              <td className="px-4 py-3">{review.rating}/5</td>
              <td className="px-4 py-3 text-xs uppercase text-muted-foreground">
                {review.status}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-success/40 bg-success/5 px-3 text-xs font-semibold text-success hover:bg-success/10 disabled:opacity-50"
                    disabled={approvingId === review.id}
                    onClick={() => onApprove(review)}
                    type="button"
                  >
                    {approvingId === review.id ? "Approving" : "Approve"}
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    disabled={rejectingId === review.id}
                    onClick={() => onReject(review)}
                    type="button"
                  >
                    {rejectingId === review.id ? "Rejecting" : "Reject"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { WishlistItem };
