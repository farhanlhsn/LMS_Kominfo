"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import type { WishlistItem } from "../../lib/lms-types";

export function WishlistButton({
  courseId,
  initialActive,
  size = "md",
  onChange,
}: {
  courseId: string;
  initialActive?: boolean;
  size?: "sm" | "md";
  onChange?: (active: boolean) => void;
}) {
  const [active, setActive] = useState<boolean>(Boolean(initialActive));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const { api } = await import("../../lib/api-client");
      if (active) {
        await api.removeWishlist(courseId);
        setActive(false);
        onChange?.(false);
      } else {
        await api.addWishlist({ courseId });
        setActive(true);
        onChange?.(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        aria-pressed={active}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          active
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-border bg-card text-foreground hover:bg-muted"
        } ${size === "sm" ? "min-h-9" : "min-h-10"}`}
        disabled={busy}
        onClick={toggle}
        type="button"
        title={active ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          aria-hidden="true"
          className="h-4 w-4"
          fill={active ? "currentColor" : "none"}
        />
        {active ? "Wishlisted" : "Add to wishlist"}
      </button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function WishlistGrid({ items }: { items: WishlistItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <h3 className="text-sm font-semibold">{item.course.title}</h3>
          {item.course.level ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.course.level}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
