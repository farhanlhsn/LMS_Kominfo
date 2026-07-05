"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { usePwaInstall, type InstallState } from "../../lib/pwa-hooks";
import { cn } from "../../lib/utils";

/**
 * Dismissible floating card that prompts the user to install the PWA.
 * Renders nothing when the browser does not expose a `beforeinstallprompt`
 * event or when the app is already running in standalone mode.
 */
export function PwaInstallPrompt({
  className,
  onAccepted,
}: {
  className?: string;
  onAccepted?: () => void;
}) {
  const { state, install, reset } = usePwaInstall();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (state !== "available" || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    setBusy(true);
    try {
      const result = await install();
      if (result?.outcome === "accepted") {
        onAccepted?.();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      aria-label="Install LMS application"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-subtle",
        className,
      )}
      data-testid="pwa-install-prompt"
      data-state={state as InstallState}
      role="region"
    >
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Install the LMS app</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Get offline access, faster launch, and native-like notifications on
          this device.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            aria-label="Install LMS app"
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            disabled={busy}
            onClick={handleInstall}
            type="button"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            {busy ? "Installing…" : "Install"}
          </button>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDismissed(true);
              reset();
            }}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            Not now
          </button>
        </div>
      </div>
    </aside>
  );
}
