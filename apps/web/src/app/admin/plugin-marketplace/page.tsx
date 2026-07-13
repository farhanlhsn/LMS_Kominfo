"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Package, Settings2, ShieldCheck, Star, Store, Users, XCircle } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  useCreatePluginListing,
  useInstallPlugin,
  usePluginInstallations,
  usePluginListings,
  usePluginPolicy,
  usePluginReviews,
  useUninstallPlugin,
  useUpdatePluginListing,
  useUpdatePluginListingStatus,
  useUpdatePluginPolicy,
  useUpdatePluginReviewStatus,
} from "../../../lib/api-hooks";
import { PluginListingCard } from "../../../components/plugin-marketplace/plugin-listing-card";
import { ReviewForm } from "../../../components/plugin-marketplace/review-form";
import type { PluginListingRecord, PluginListingStatus, PluginReviewStatus } from "../../../lib/lms-types";

type Tab = "listings" | "reviews" | "installations" | "policy";

const TABS: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: "listings",      label: "Listings",      icon: Store },
  { key: "reviews",       label: "Reviews",       icon: Star },
  { key: "installations", label: "Installations", icon: Package },
  { key: "policy",        label: "Policy",        icon: Settings2 },
];

const STATUS_TONE: Record<PluginListingStatus, "success" | "warning" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  DRAFT:     "neutral",
  SUSPENDED: "warning",
  ARCHIVED:  "danger",
};

export default function AdminPluginMarketplacePage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/plugin-marketplace">
          <PageHeader
            eyebrow="Admin"
            title="Plugin marketplace"
            description="Curate listings, moderate reviews, manage installations, and set governance policy."
          />
          <MarketplaceBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function MarketplaceBody() {
  const [tab, setTab] = useState<Tab>("listings");
  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "listings"      && <ListingsTab />}
      {tab === "reviews"       && <ReviewsTab />}
      {tab === "installations" && <InstallationsTab />}
      {tab === "policy"        && <PolicyTab />}
    </div>
  );
}

function ListingsTab() {
  const [statusFilter, setStatusFilter] = useState<PluginListingStatus | "">("");
  const listingsQuery = usePluginListings(statusFilter || undefined);
  const create = useCreatePluginListing();
  const install = useInstallPlugin();
  const updateStatus = useUpdatePluginListingStatus();
  const [form, setForm] = useState({ pluginId: "", name: "", description: "", categories: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await create({
        pluginId: form.pluginId,
        name: form.name,
        description: form.description,
        categories: form.categories ? form.categories.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
      });
      setMsg({ text: "Listing created as DRAFT.", type: "ok" });
      setForm({ pluginId: "", name: "", description: "", categories: "" });
      setShowCreate(false);
      await listingsQuery.reload();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", type: "err" });
    }
  }

  async function handleInstall(listing: PluginListingRecord) {
    try {
      await install({ listingId: listing.id });
      setMsg({ text: `Installed "${listing.name}".`, type: "ok" });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", type: "err" });
    }
  }

  async function handleStatus(listing: PluginListingRecord, next: PluginListingStatus) {
    try {
      await updateStatus(listing.id, next);
      await listingsQuery.reload();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", type: "err" });
    }
  }

  const listings = listingsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {(["", "PUBLISHED", "DRAFT", "SUSPENDED", "ARCHIVED"] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New listing"}
        </Button>
      </div>

      {msg && (
        <p className={`rounded-md border px-3 py-2 text-sm ${msg.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
          {msg.text}
        </p>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold">New plugin listing</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">
                Plugin ID
                <input required className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.pluginId} onChange={setField("pluginId")} />
              </label>
              <label className="text-sm font-medium">
                Display name
                <input required className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.name} onChange={setField("name")} />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Description
                <textarea required rows={2} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={form.description} onChange={setField("description")} />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Categories <span className="text-muted-foreground">(comma separated)</span>
                <input className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.categories} onChange={setField("categories")} placeholder="ACTIVITY, ASSESSMENT" />
              </label>
              <div className="md:col-span-2">
                <Button type="submit">Create listing</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listings grid */}
      {listingsQuery.loading ? (
        <LoadingState title="Loading listings" />
      ) : listingsQuery.error ? (
        <ApiErrorState error={listingsQuery.error} fallbackTitle="Could not load listings" />
      ) : listings.length === 0 ? (
        <EmptyState title="No listings" description="Create the first plugin listing." icon={Store} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => (
            <Card key={listing.id} className="flex flex-col gap-0">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold">{listing.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                  </div>
                  <StatusBadge value={listing.status} tone={STATUS_TONE[listing.status]} />
                </div>
                {listing.categories?.length ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {listing.categories.map((c) => (
                      <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{c}</span>
                    ))}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="flex flex-wrap gap-1">
                  {(["DRAFT", "PUBLISHED", "SUSPENDED", "ARCHIVED"] as PluginListingStatus[])
                    .filter((s) => s !== listing.status)
                    .map((s) => (
                      <button key={s} type="button"
                        onClick={() => void handleStatus(listing, s)}
                        className="rounded border border-border px-2 py-0.5 text-xs font-medium hover:bg-muted">
                        → {s}
                      </button>
                    ))}
                  {listing.status === "PUBLISHED" && (
                    <button type="button"
                      onClick={() => void handleInstall(listing)}
                      className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      Install
                    </button>
                  )}
                </div>
                {listing.status === "PUBLISHED" && (
                  <ReviewForm listingId={listing.id} onSubmitted={() => void listingsQuery.reload()} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsTab() {
  const reviewsQuery = usePluginReviews();
  const updateReviewStatus = useUpdatePluginReviewStatus();
  const [msg, setMsg] = useState<string | null>(null);

  const reviews = reviewsQuery.data ?? [];

  async function moderate(id: string, status: PluginReviewStatus) {
    try {
      await updateReviewStatus(id, status);
      setMsg(`Review ${status.toLowerCase()}.`);
      await reviewsQuery.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{msg}</p>}
      {reviewsQuery.loading ? (
        <LoadingState title="Loading reviews" />
      ) : reviewsQuery.error ? (
        <ApiErrorState error={reviewsQuery.error} fallbackTitle="Could not load reviews" />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews" description="Reviews will appear here after users rate plugins." icon={Star} />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.reviewer?.name ?? "Unknown"}</span>
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                      <StatusBadge
                        value={review.status}
                        tone={review.status === "APPROVED" ? "success" : review.status === "REJECTED" ? "danger" : "neutral"}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Plugin: {review.listing?.name ?? review.listingId}</p>
                    {review.comment && <p className="mt-1 text-sm">{review.comment}</p>}
                  </div>
                  {review.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void moderate(review.id, "APPROVED")}
                        className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button type="button" onClick={() => void moderate(review.id, "REJECTED")}
                        className="flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InstallationsTab() {
  const installationsQuery = usePluginInstallations();
  const uninstall = useUninstallPlugin();
  const [msg, setMsg] = useState<string | null>(null);

  const installations = installationsQuery.data ?? [];

  async function handleUninstall(id: string, name: string) {
    if (!window.confirm(`Uninstall "${name}"? This may affect active learners.`)) return;
    try {
      await uninstall(id);
      setMsg(`Uninstalled "${name}".`);
      await installationsQuery.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{msg}</p>}
      {installationsQuery.loading ? (
        <LoadingState title="Loading installations" />
      ) : installationsQuery.error ? (
        <ApiErrorState error={installationsQuery.error} fallbackTitle="Could not load installations" />
      ) : installations.length === 0 ? (
        <EmptyState title="No installations" description="Installed plugins will appear here." icon={Package} />
      ) : (
        <div className="flex flex-col gap-3">
          {installations.map((inst) => (
            <Card key={inst.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{inst.listingId}</span>
                    <StatusBadge
                      value={inst.status}
                      tone={inst.status === "ACTIVE" ? "success" : "neutral"}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Installed {new Date(inst.installedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleUninstall(inst.id, inst.listingId)}
                  className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  Uninstall
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyTab() {
  const policyQuery = usePluginPolicy();
  const updatePolicy = useUpdatePluginPolicy();
  const [maxInstalls, setMaxInstalls] = useState<string>("");
  const [allowedCategories, setAllowedCategories] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  if (policyQuery.data && !initialized) {
    const p = policyQuery.data;
    setMaxInstalls(p.maxInstalls != null ? String(p.maxInstalls) : "");
    setAllowedCategories(p.allowedCategories?.join(", ") ?? "");
    setRequireApproval(p.requireApproval ?? false);
    setInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await updatePolicy({
        maxInstalls: maxInstalls ? Number(maxInstalls) : undefined,
        allowedCategories: allowedCategories ? allowedCategories.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
        requireApproval,
      });
      setMsg({ text: "Policy updated.", type: "ok" });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed", type: "err" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Governance policy</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Control which plugins can be installed and whether admin approval is required.
          </p>
        </CardHeader>
        <CardContent>
          {policyQuery.loading ? (
            <LoadingState title="Loading policy" />
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {msg && (
                <p className={`rounded-md border px-3 py-2 text-sm ${msg.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                  {msg.text}
                </p>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max installations <span className="font-normal text-muted-foreground">(leave blank for unlimited)</span>
                <input
                  type="number"
                  min={0}
                  className="h-9 w-40 rounded-md border border-input bg-card px-3 text-sm"
                  value={maxInstalls}
                  onChange={(e) => setMaxInstalls(e.target.value)}
                  placeholder="Unlimited"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Allowed categories <span className="font-normal text-muted-foreground">(comma separated, blank = all)</span>
                <input
                  className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                  value={allowedCategories}
                  onChange={(e) => setAllowedCategories(e.target.value)}
                  placeholder="ACTIVITY, ASSESSMENT, AI_TOOL"
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                />
                Require admin approval before installation
              </label>
              <div>
                <Button type="submit">Save policy</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
