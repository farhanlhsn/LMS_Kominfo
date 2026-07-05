"use client";

import { NetworkStatusPill } from "./network-status";
import { PwaInstallPrompt } from "./pwai-install-prompt";
import { ServiceWorkerUpdateToast } from "./sw-update-toast";

/**
 * Mounts the PWA overlay layer (install prompt, service worker update toast,
 * network status pill) into a layout without forcing the root layout to
 * become a client component.
 */
export function PwaOverlay() {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex flex-col items-center gap-2 px-3 sm:top-4 sm:px-6">
        <NetworkStatusPill className="pointer-events-auto max-w-md" />
        <div className="pointer-events-auto w-full max-w-md">
          <PwaInstallPrompt />
        </div>
      </div>
      <ServiceWorkerUpdateToast />
    </>
  );
}
