"use client";

import { useCallback, useState } from "react";
import { Store } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  useCreatePluginListing,
  useInstallPlugin,
  usePluginListings,
  usePluginReviews,
  useUpdatePluginListingStatus,
} from "../../../lib/api-hooks";
import { PluginListingCard } from "../../../components/plugin-marketplace/plugin-listing-card";
import { ReviewForm } from "../../../components/plugin-marketplace/review-form";
import { PERMISSIONS } from "@lms/shared";
import type { PluginListingRecord, PluginListingStatus } from "../../../lib/lms-types";

const STATUSES: Array<PluginListingStatus | ""> = [
  "PUBLISHED",
  "DRAFT",
  "SUSPENDED",
  "ARCHIVED",
  "",
];

export default function AdminPluginMarketplacePage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/plugin-marketplace">
          <PageHeader
            eyebrow="Admin"
            title="Plugin marketplace"
            description="Curate plugin listings, moderate reviews, and approve installations."
          />
          <MarketplaceBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function MarketplaceBody() {
  const [statusFilter, setStatusFilter] = useState<PluginListingStatus | "PUBLISHED">("PUBLISHED");
  const listingsQuery = usePluginListings(statusFilter || undefined);
  const create = useCreatePluginListing();
  const install = useInstallPlugin();
  const updateStatus = useUpdatePluginListingStatus();
  const [name, setName] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setError(null);
    setStatus(null);
    if (!name || !pluginId || !description) {
      setError("Name, pluginId, and description are required");
      return;
    }
    try {
      await create({
        name,
        pluginId,
        description,
        categories: categories
          ? categories.split(",").map((c) => c.trim()).filter(Boolean)
          : undefined,
      });
      setStatus("Listing created as DRAFT");
      setName("");
      setPluginId("");
      setDescription("");
      setCategories("");
      await listingsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    }
  }, [create, name, pluginId, description, categories, listingsQuery]);

  const handleInstall = useCallback(
    async (listing: PluginListingRecord) => {
      setError(null);
      try {
        await install({ listingId: listing.id });
        setStatus(`Installed ${listing.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to install plugin");
      }
    },
    [install],
  );

  const handleStatus = useCallback(
    async (listing: PluginListingRecord, next: PluginListingStatus) => {
      setError(null);
      try {
        await updateStatus(listing.id, next);
        await listingsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update listing status");
      }
    },
    [updateStatus, listingsQuery],
  );

  return (
    <div className="space-y-6">
      {status ? (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded border border-border px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PluginListingStatus | "PUBLISHED")}
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FormSection title="New listing" description="Submit a new plugin for review.">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm font-medium">
            Plugin ID
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={pluginId}
              onChange={(e) => setPluginId(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Display name
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Short description
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Categories (comma separated)
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            />
          </label>
        </div>
        <div>
          <Button onClick={handleCreate}>Create listing</Button>
        </div>
      </FormSection>

      {listingsQuery.isLoading ? (
        <LoadingState title="Loading listings" />
      ) : listingsQuery.error ? (
        <ApiErrorState error={listingsQuery.error} />
      ) : !listingsQuery.data?.length ? (
        <EmptyState
          title="No plugin listings"
          description="Create a listing to start distributing plugins."
          icon={Store}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {listingsQuery.data.map((listing) => (
            <div key={listing.id} className="space-y-2">
              <PluginListingCard
                listing={listing}
                onInstall={(l: PluginListingRecord) => void handleInstall(l)}
              />
              <ReviewList listingId={listing.id} />
              <div className="flex flex-wrap gap-2 text-xs">
                {(["DRAFT", "PUBLISHED", "SUSPENDED", "ARCHIVED"] as PluginListingStatus[])
                  .filter((s) => s !== listing.status)
                  .map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleStatus(listing, s)}
                    >
                      Set {s}
                    </Button>
                  ))}
              </div>
              {listing.status === "PUBLISHED" ? (
                <ReviewForm
                  listingId={listing.id}
                  onSubmitted={() => listingsQuery.refetch()}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewList({ listingId }: { listingId: string }) {
  const reviewsQuery = usePluginReviews(listingId);
  if (reviewsQuery.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading reviews…</p>;
  }
  if (reviewsQuery.error) {
    return <p className="text-xs text-destructive">Failed to load reviews.</p>;
  }
  const reviews = reviewsQuery.data ?? [];
  if (!reviews.length) {
    return <p className="text-xs text-muted-foreground">No reviews yet.</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {reviews.slice(0, 3).map((review) => (
        <li key={review.id} className="rounded border border-border px-2 py-1">
          <p className="font-medium text-foreground">{review.reviewer?.name ?? review.reviewerId} • {review.rating}/5</p>
          {review.comment ? <p>{review.comment}</p> : null}
          <p>Status: {review.status}</p>
        </li>
      ))}
    </ul>
  );
}
