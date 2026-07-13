"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useNetworkStatus } from "../../lib/pwa-hooks";
import { cn } from "../../lib/utils";

/**
 * Top-of-page banner that surfaces the current online/offline state and the
 * effective connection type. Hidden while online by default to keep the
 * layout calm; shows a compact pill otherwise.
 */
export function NetworkStatusPill({
  className,
  showWhenOnline = false,
}: {
  className?: string;
  showWhenOnline?: boolean;
}) {
  const { status, isOnline, effectiveType, lastChangedAt } = useNetworkStatus();
  const [lastLabel, setLastLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!lastChangedAt) return;
    const date = new Date(lastChangedAt);
    setLastLabel(date.toLocaleTimeString());
  }, [lastChangedAt]);

  if (status === "unknown" || (isOnline && !showWhenOnline)) return null;

  const tone = isOnline
    ? "border-info/30 bg-info/10 text-info"
    : "border-warning/30 bg-warning/10 text-warning";
  const Icon = isOnline ? Wifi : CloudOff;
  const headline = isOnline
    ? effectiveType
      ? `Online · ${effectiveType}`
      : "Online"
    : "Offline mode";

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
        tone,
        className,
      )}
      data-testid="network-status-pill"
      data-status={status}
      role="status"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{headline}</span>
      {!isOnline ? (
        <span className="text-[11px] font-normal text-muted-foreground">
          {lastLabel ? `Last seen ${lastLabel}` : "Some actions may be unavailable"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Inline empty-state used by panels that depend on network access. Renders
 * a friendly retry message while the user is offline.
 */
export function NetworkStatusEmpty({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning",
        className,
      )}
      data-testid="network-status-empty"
      role="status"
    >
      <span>You&apos;re offline. Cached data is shown when available.</span>
      {onRetry ? (
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-warning/40 px-2 text-xs font-semibold text-warning hover:bg-warning/20"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-3 w-3" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
