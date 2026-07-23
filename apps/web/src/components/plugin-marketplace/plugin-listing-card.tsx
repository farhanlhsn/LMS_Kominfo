"use client";

import { Star, Store } from "lucide-react";
import type {
  PluginListingRecord,
  PluginListingStatus,
} from "../../lib/lms-types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";

const STATUS_TONES: Record<
  PluginListingStatus,
  "success" | "info" | "warning" | "neutral"
> = {
  PUBLISHED: "success",
  DRAFT: "info",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
};

export interface PluginListingCardProps {
  listing: PluginListingRecord;
  onSelect?: (listing: PluginListingRecord) => void;
  onInstall?: (listing: PluginListingRecord) => void;
  missingDependencies?: string[];
}

export function PluginListingCard({
  listing,
  onSelect,
  onInstall,
  missingDependencies = [],
}: PluginListingCardProps) {
  const categories = listing.categories ?? [];
  const installation = listing.currentInstallation;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">{listing.name}</h3>
          </div>
          <StatusBadge
            tone={STATUS_TONES[listing.status]}
            value={installation?.status ?? listing.status}
          />
        </div>
        <p className="text-sm text-muted-foreground">{listing.description}</p>
        <p className="text-xs text-muted-foreground">
          {listing.pluginId}
          {typeof listing.pricing?.version === "string"
            ? ` | v${listing.pricing.version}`
            : ""}
        </p>
        {listing.dependencies?.length ? (
          <p className="text-xs text-muted-foreground">
            Requires: {listing.dependencies.join(" | ")}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {categories.length ? (
            <span className="rounded border border-border bg-muted/40 px-2 py-0.5">
              {categories.join(" | ")}
            </span>
          ) : null}
          {listing._count ? (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {listing._count.reviews ?? 0} reviews |{" "}
              {listing._count.installations ?? 0} installs
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onSelect ? (
            <button
              className="rounded-md border border-border px-3 py-1 text-sm font-medium hover:bg-muted"
              onClick={() => onSelect(listing)}
              type="button"
            >
              Details
            </button>
          ) : null}
          {onInstall ? (
            <button
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                listing.status !== "PUBLISHED" ||
                Boolean(installation) ||
                missingDependencies.length > 0
              }
              onClick={() => onInstall(listing)}
              title={
                missingDependencies.length
                  ? `Install first: ${missingDependencies.join(", ")}`
                  : undefined
              }
              type="button"
            >
              {installation
                ? installation.status === "ACTIVE"
                  ? "Installed"
                  : "Installed, disabled"
                : missingDependencies.length
                  ? "Requires dependencies"
                  : listing.status === "PUBLISHED"
                  ? "Install"
                  : "Unavailable"}
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
