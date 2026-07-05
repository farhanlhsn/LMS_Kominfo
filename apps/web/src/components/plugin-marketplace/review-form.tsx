"use client";

import { useCallback, useState } from "react";
import { Star } from "lucide-react";
import { useCreatePluginReview } from "../../lib/api-hooks";
import { Button } from "../ui/button";

export interface ReviewFormProps {
  listingId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ listingId, onSubmitted }: ReviewFormProps) {
  const createReview = useCreatePluginReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await createReview({ listingId, rating, comment: comment || undefined });
      setSuccess(true);
      setComment("");
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setBusy(false);
    }
  }, [createReview, listingId, rating, comment, onSubmitted]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Rating</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`Set rating to ${value}`}
              className="rounded p-1 hover:bg-muted"
              key={value}
              onClick={() => setRating(value)}
              type="button"
            >
              <Star
                aria-hidden="true"
                className={`h-4 w-4 ${value <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{rating} / 5</span>
      </div>
      <label className="block text-sm font-medium">
        Comment (optional)
        <textarea
          className="mt-1 w-full rounded border border-border px-2 py-1 text-sm"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-xs text-emerald-600" role="status">
          Review submitted. Thanks for your feedback!
        </p>
      ) : null}
      <Button onClick={handleSubmit} disabled={busy}>
        {busy ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}
