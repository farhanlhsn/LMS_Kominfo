"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, X } from "lucide-react";
import { useServiceWorkerUpdate } from "../../lib/pwa-hooks";
import { cn } from "../../lib/utils";

/**
 * Fixed bottom-right toast that surfaces a pending service worker update.
 * The user can apply the new bundle (which triggers a `controllerchange`
 * and reload) or dismiss the prompt to keep the current version.
 */
export function ServiceWorkerUpdateToast({
  className,
  onApplied,
}: {
  className?: string;
  onApplied?: () => void;
}) {
  const { state, apply, check } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (state !== "available" || dismissed) return null;

  const handleApply = () => {
    apply();
    onApplied?.();
  };

  const handleCheck = async () => {
    await check();
  };

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-auto fixed bottom-4 right-4 z-50 flex w-[min(22rem,90vw)] flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg",
        className,
      )}
      data-state={state}
      data-testid="sw-update-toast"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Update available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A newer version of the LMS is ready. Reload to apply the latest
            changes.
          </p>
        </div>
        <button
          aria-label="Dismiss update notification"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          onClick={handleApply}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Reload
        </button>
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={handleCheck}
          type="button"
        >
          Check again
        </button>
      </div>
    </div>
  );
}
