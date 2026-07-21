"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { api } from "../../lib/api-client";
import { usePushSubscription, type PushSupport } from "../../lib/pwa-hooks";
import { cn } from "../../lib/utils";

interface PushSubscribeButtonProps {
  className?: string;
  /**
   * Optional override for the resolver that supplies the VAPID public key.
   * Defaults to a request to `/api/v1/push/vapid`.
   */
  vapidKeyResolver?: () => Promise<string | null>;
  onSubscribed?: (endpoint: string) => void;
  onUnsubscribed?: (endpoint: string) => void;
}

async function defaultVapidResolver(): Promise<string | null> {
  try {
    const info = await api.getPushVapidInfo();
    return info.publicKey ?? null;
  } catch {
    return null;
  }
}

function describePermission(permission: PushSupport["permission"]): string {
  switch (permission) {
    case "granted":
      return "Notifications enabled";
    case "denied":
      return "Notifications blocked";
    case "default":
      return "Notifications not yet requested";
    default:
      return "Notifications not supported";
  }
}

/**
 * Toggle button that subscribes/unsubscribes the current user from browser
 * push notifications. Falls back gracefully when the API is not available
 * (no service worker, no VAPID key, denied permission, etc.).
 */
export function PushSubscribeButton({
  className,
  vapidKeyResolver,
  onSubscribed,
  onUnsubscribed,
}: PushSubscribeButtonProps) {
  const resolver = vapidKeyResolver ?? defaultVapidResolver;
  const { support, loading, error, subscribe, unsubscribe, refresh } =
    usePushSubscription(resolver);
  const [pendingEndpoint, setPendingEndpoint] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubscribe = useCallback(async () => {
    const ok = await subscribe();
    if (!ok) return;
    // Pull the freshest subscription from the service worker
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const json = sub.toJSON();
      setPendingEndpoint(json.endpoint ?? null);
      const result = await api.subscribePush({
        endpoint: json.endpoint ?? "",
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        expirationTime:
          typeof json.expirationTime === "number" ? json.expirationTime : null,
      });
      if (json.endpoint) {
        onSubscribed?.(json.endpoint);
      }
      void result;
    } catch (err) {
      // Best-effort: keep the local subscription even if the server sync fails
      // eslint-disable-next-line no-console
      console.warn("Failed to sync push subscription", err);
    }
  }, [subscribe, onSubscribed]);

  const handleUnsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const endpoint = existing?.endpoint ?? null;
    const ok = await unsubscribe();
    if (!ok) return;
    if (endpoint) {
      try {
        await api.unsubscribePush(endpoint);
        onUnsubscribed?.(endpoint);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to remove server subscription", err);
      }
    }
    setPendingEndpoint(null);
  }, [unsubscribe, onUnsubscribed]);

  const isSubscribed = Boolean(support.subscription);
  const disabled =
    !support.supported ||
    loading ||
    support.permission === "denied" ||
    support.permission === "unsupported";

  const Icon = loading ? Loader2 : isSubscribed ? Bell : BellOff;
  const label = loading
    ? "Working…"
    : isSubscribed
      ? "Disable notifications"
      : "Enable notifications";

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-permission={support.permission}
      data-subscribed={isSubscribed ? "true" : "false"}
      data-testid="push-subscribe-button"
    >
      <button
        aria-label={label}
        aria-pressed={isSubscribed}
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition",
          isSubscribed
            ? "border-border bg-card text-foreground hover:bg-muted"
            : "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
          disabled ? "cursor-not-allowed opacity-60" : null,
        )}
        disabled={disabled}
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        type="button"
      >
        <Icon
          aria-hidden="true"
          className={cn("h-4 w-4", loading ? "animate-spin" : null)}
        />
        {label}
      </button>
      <p className="text-xs text-muted-foreground" data-testid="push-subscribe-hint">
        {describePermission(support.permission)}
        {pendingEndpoint ? " · syncing with server" : ""}
      </p>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
