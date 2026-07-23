"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Package,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PluginListingCard } from "../../../components/plugin-marketplace/plugin-listing-card";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../../components/ui/states";
import {
  useInstallPlugin,
  usePluginInstallations,
  usePluginListings,
  usePluginPolicy,
  usePluginReviews,
  useUninstallPlugin,
  useUpdatePluginInstallationStatus,
  useUpdatePluginPolicy,
  useUpdatePluginReviewStatus,
} from "../../../lib/api-hooks";
import type {
  PluginInstallationStatus,
  PluginListingRecord,
  PluginReviewStatus,
} from "../../../lib/lms-types";

type Tab = "catalog" | "installed" | "reviews" | "policy";

const TABS: Array<{
  key: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "catalog", label: "Catalog", icon: Store },
  { key: "installed", label: "Installed", icon: Package },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "policy", label: "Policy", icon: Settings2 },
];

export default function AdminPluginMarketplacePage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.pluginsConfigure]}>
        <AppShell currentPath="/admin/plugin-marketplace">
          <PageHeader
            eyebrow="Admin"
            title="Plugin marketplace"
            description="Install and govern optional LMS packages."
          />
          <MarketplaceBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function MarketplaceBody() {
  const [tab, setTab] = useState<Tab>("catalog");

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 md:grid-cols-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            key={key}
            onClick={() => setTab(key)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "catalog" ? <CatalogTab /> : null}
      {tab === "installed" ? <InstalledTab /> : null}
      {tab === "reviews" ? <ReviewsTab /> : null}
      {tab === "policy" ? <PolicyTab /> : null}
    </div>
  );
}

function CatalogTab() {
  const listingsQuery = usePluginListings("PUBLISHED");
  const installationsQuery = usePluginInstallations();
  const install = useInstallPlugin();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "error";
  } | null>(null);

  const listings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = listingsQuery.data ?? [];
    if (!query) return items;
    return items.filter(
      (listing) =>
        listing.name.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.pluginId.toLowerCase().includes(query),
    );
  }, [listingsQuery.data, search]);
  const activePluginKeys = useMemo(
    () =>
      new Set(
        (installationsQuery.data ?? [])
          .filter((installation) => installation.status === "ACTIVE")
          .map((installation) => installation.listing?.pluginId)
          .filter((key): key is string => Boolean(key)),
      ),
    [installationsQuery.data],
  );

  async function handleInstall(listing: PluginListingRecord) {
    setBusyId(listing.id);
    setMessage(null);
    try {
      const result = await install({ listingId: listing.id });
      setMessage({
        text:
          result.status === "ACTIVE"
            ? `${listing.name} installed and enabled.`
            : `${listing.name} installed. Approval required before activation.`,
        type: "ok",
      });
      await Promise.all([listingsQuery.reload(), installationsQuery.reload()]);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Installation failed",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <label className="relative block max-w-md">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <span className="sr-only">Search plugin catalog</span>
        <input
          className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search plugins"
          type="search"
          value={search}
        />
      </label>

      {message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {listingsQuery.loading ? (
        <LoadingState title="Loading plugin catalog" />
      ) : listingsQuery.error ? (
        <ApiErrorState
          error={listingsQuery.error}
          fallbackTitle="Could not load plugin catalog"
        />
      ) : listings.length === 0 ? (
        <EmptyState
          description="No package matches current search."
          icon={Store}
          title="No plugins found"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <div
              className={
                busyId === listing.id ? "pointer-events-none opacity-60" : ""
              }
              key={listing.id}
            >
              <PluginListingCard
                listing={listing}
                missingDependencies={(listing.dependencies ?? []).filter(
                  (dependency) => !activePluginKeys.has(dependency),
                )}
                onInstall={(item) => void handleInstall(item)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InstalledTab() {
  const installationsQuery = usePluginInstallations();
  const updateStatus = useUpdatePluginInstallationStatus();
  const uninstall = useUninstallPlugin();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function setStatus(id: string, status: PluginInstallationStatus) {
    setBusyId(id);
    setMessage(null);
    try {
      await updateStatus(id, status);
      await installationsQuery.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Uninstall "${name}"? Existing activity data will remain unavailable.`,
      )
    ) {
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      await uninstall(id);
      await installationsQuery.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uninstall failed");
    } finally {
      setBusyId(null);
    }
  }

  if (installationsQuery.loading) {
    return <LoadingState title="Loading installed plugins" />;
  }
  if (installationsQuery.error) {
    return (
      <ApiErrorState
        error={installationsQuery.error}
        fallbackTitle="Could not load installed plugins"
      />
    );
  }

  const installations = installationsQuery.data ?? [];
  if (installations.length === 0) {
    return (
      <EmptyState
        description="Install optional packages from catalog."
        icon={Package}
        title="No plugins installed"
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {installations.map((installation) => {
        const name = installation.listing?.name ?? installation.listingId;
        const active = installation.status === "ACTIVE";
        return (
          <Card key={installation.id}>
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{name}</h2>
                  <StatusBadge
                    tone={active ? "success" : "neutral"}
                    value={installation.status}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {installation.listing?.pluginId ?? installation.listingId} |{" "}
                  installed{" "}
                  {new Date(installation.installedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-muted"
                  href={`/admin/plugins/${encodeURIComponent(
                    installation.listing?.pluginId ??
                      installation.listingId,
                  )}`}
                >
                  <Settings2 className="h-4 w-4" />
                  Configure
                </a>
                <Button
                  disabled={busyId === installation.id}
                  onClick={() =>
                    void setStatus(
                      installation.id,
                      active ? "DISABLED" : "ACTIVE",
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  {active ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {active ? "Disable" : "Enable"}
                </Button>
                <Button
                  aria-label={`Uninstall ${name}`}
                  disabled={busyId === installation.id}
                  onClick={() => void remove(installation.id, name)}
                  size="icon"
                  title={`Uninstall ${name}`}
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function ReviewsTab() {
  const reviewsQuery = usePluginReviews();
  const updateReviewStatus = useUpdatePluginReviewStatus();
  const [message, setMessage] = useState<string | null>(null);

  async function moderate(id: string, status: PluginReviewStatus) {
    try {
      await updateReviewStatus(id, status);
      await reviewsQuery.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Moderation failed");
    }
  }

  if (reviewsQuery.loading) return <LoadingState title="Loading reviews" />;
  if (reviewsQuery.error) {
    return (
      <ApiErrorState
        error={reviewsQuery.error}
        fallbackTitle="Could not load reviews"
      />
    );
  }
  const reviews = reviewsQuery.data ?? [];
  if (reviews.length === 0) {
    return (
      <EmptyState
        description="Submitted plugin reviews appear here."
        icon={Star}
        title="No reviews"
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {review.reviewer?.name ?? "Unknown reviewer"}
                </span>
                <StatusBadge
                  tone={
                    review.status === "APPROVED"
                      ? "success"
                      : review.status === "REJECTED"
                        ? "danger"
                        : "neutral"
                  }
                  value={review.status}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {review.listing?.name ?? review.listingId} | {review.rating}/5
              </p>
              {review.comment ? (
                <p className="mt-2 text-sm">{review.comment}</p>
              ) : null}
            </div>
            {review.status === "PENDING" ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => void moderate(review.id, "APPROVED")}
                  size="sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => void moderate(review.id, "REJECTED")}
                  size="sm"
                  variant="outline"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function PolicyTab() {
  const policyQuery = usePluginPolicy();
  const updatePolicy = useUpdatePluginPolicy();
  const [maxInstalls, setMaxInstalls] = useState("50");
  const [allowedCategories, setAllowedCategories] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "error";
  } | null>(null);

  useEffect(() => {
    if (!policyQuery.data) return;
    setMaxInstalls(String(policyQuery.data.maxInstalls));
    setAllowedCategories(policyQuery.data.allowedCategories?.join(", ") ?? "");
    setRequireApproval(policyQuery.data.requireApproval);
  }, [policyQuery.data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await updatePolicy({
        maxInstalls: Number(maxInstalls),
        allowedCategories: allowedCategories
          .split(",")
          .map((category) => category.trim().toUpperCase())
          .filter(Boolean),
        requireApproval,
      });
      setMessage({ text: "Plugin policy updated.", type: "ok" });
      await policyQuery.reload();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Policy update failed",
        type: "error",
      });
    }
  }

  if (policyQuery.loading)
    return <LoadingState title="Loading plugin policy" />;
  if (policyQuery.error) {
    return (
      <ApiErrorState
        error={policyQuery.error}
        fallbackTitle="Could not load plugin policy"
      />
    );
  }

  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Installation policy</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-2xl gap-4" onSubmit={save}>
            {message ? (
              <p
                className={`rounded-md border px-3 py-2 text-sm ${
                  message.type === "ok"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {message.text}
              </p>
            ) : null}
            <label className="grid gap-1.5 text-sm font-medium">
              Maximum active plugins
              <input
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                min={0}
                onChange={(event) => setMaxInstalls(event.target.value)}
                required
                type="number"
                value={maxInstalls}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Allowed categories
              <input
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                onChange={(event) => setAllowedCategories(event.target.value)}
                placeholder="ACTIVITY, CONTENT, ASSESSMENT"
                value={allowedCategories}
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                checked={requireApproval}
                className="h-4 w-4 rounded"
                onChange={(event) => setRequireApproval(event.target.checked)}
                type="checkbox"
              />
              Install packages in disabled state
            </label>
            <div>
              <Button type="submit">Save policy</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
