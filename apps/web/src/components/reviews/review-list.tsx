"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { CourseReview } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

type ReviewTone = "neutral" | "success" | "warning" | "danger" | "info";

function statusTone(status: string | null | undefined): ReviewTone {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((index) => {
        const active = index <= value;
        return (
          <button
            aria-checked={active}
            aria-label={`${index} star${index > 1 ? "s" : ""}`}
            className={`rounded-md p-1 ${active ? "text-warning" : "text-muted-foreground"}`}
            disabled={!onChange}
            key={index}
            onClick={() => onChange?.(index)}
            role="radio"
            type="button"
          >
            <Star aria-hidden="true" className="h-4 w-4" fill={active ? "currentColor" : "none"} />
          </button>
        );
      })}
    </div>
  );
}

function StarsReadOnly({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill={index <= value ? "currentColor" : "none"}
          key={index}
        />
      ))}
    </span>
  );
}

export interface ReviewListItem extends Omit<CourseReview, "user"> {
  user?: { id: string; name: string | null; email?: string | null } | null;
}

export function ReviewSummary({
  average,
  total,
  averageMax = 5,
}: {
  average: number;
  total: number;
  averageMax?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="text-3xl font-semibold">{average.toFixed(1)}</div>
      <div>
        <StarsReadOnly value={Math.round(average)} />
        <p className="text-xs text-muted-foreground">
          Based on {total} review{total === 1 ? "" : "s"}
        </p>
      </div>
      <span className="ml-auto text-xs text-muted-foreground">
        Scale {averageMax}/{averageMax}
      </span>
    </div>
  );
}

export function ReviewList({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
  emptyTitle = "No reviews yet",
  emptyDescription = "Be the first to review this course.",
}: {
  reviews: ReviewListItem[];
  currentUserId?: string | null;
  onEdit?: (review: ReviewListItem) => void;
  onDelete?: (review: ReviewListItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (reviews.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const isOwn = Boolean(
          currentUserId && review.userId === currentUserId,
        );
        return (
          <article
            key={review.id}
            className="rounded-lg border border-border bg-card p-4 shadow-subtle"
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StarsReadOnly value={review.rating} />
                <span className="text-sm font-semibold">
                  {review.user?.name ?? "Learner"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {review.status ? (
                  <StatusBadge
                    tone={statusTone(review.status)}
                    value={(review.status ?? "").toLowerCase()}
                  />
                ) : null}
                {isOwn ? (
                  <>
                    {onEdit ? (
                      <button
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                        onClick={() => onEdit(review)}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(review)}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </header>
            {review.title ? (
              <h4 className="mt-2 text-sm font-semibold">{review.title}</h4>
            ) : null}
            {review.body ? (
              <p className="mt-1 text-sm leading-6 text-foreground">
                {review.body}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function ReviewComposer({
  initial,
  submitLabel = "Submit review",
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  initial?: { rating?: number; title?: string; body?: string };
  submitLabel?: string;
  onSubmit: (input: { rating: number; title: string; body: string }) => void;
  onCancel?: () => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [body, setBody] = useState<string>(initial?.body ?? "");

  const canSubmit = useMemo(
    () => rating > 0 && !submitting,
    [rating, submitting],
  );

  return (
    <form
      className="rounded-lg border border-border bg-card p-4 shadow-subtle"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onSubmit({ rating, title, body });
      }}
    >
      <h3 className="text-sm font-semibold">Your review</h3>
      <div className="mt-2">
        <StarRating onChange={setRating} value={rating} />
      </div>
      <label className="mt-3 block text-sm">
        <span className="block text-muted-foreground">Title</span>
        <input
          className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
          onChange={(event) => setTitle(event.target.value)}
          type="text"
          value={title}
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="block text-muted-foreground">Body</span>
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-input bg-card p-3 text-sm text-foreground outline-none"
          onChange={(event) => setBody(event.target.value)}
          value={body}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          disabled={!canSubmit}
          type="submit"
        >
          {submitting ? "Submitting" : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export { StarsReadOnly, StarRating };
