"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { WishlistGrid } from "../../components/reviews/wishlist-button";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../components/ui/states";
import { useWishlist } from "../../lib/api-hooks";
import type { WishlistItem } from "../../lib/lms-types";

export default function WishlistPage() {
  const query = useWishlist();
  const items = (query.data ?? []) as WishlistItem[];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="My Learning"
          title="Wishlist"
          description="Courses you have saved for later."
        />

        {query.loading ? (
          <LoadingState title="Loading wishlist" />
        ) : query.error ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load wishlist"
          />
        ) : items.length === 0 ? (
          <EmptyState
            description="Tap the heart on any course detail to add it to your wishlist."
            title="No wishlisted courses"
          />
        ) : (
          <WishlistGrid items={items} />
        )}
      </AppShell>
    </AuthGate>
  );
}
