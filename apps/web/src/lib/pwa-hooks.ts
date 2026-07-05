"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * PWA & offline helpers used by client components.
 *
 * The hooks below are deliberately defensive: every browser API they touch
 * (navigator.serviceWorker, navigator.onLine, beforeinstallprompt, PushManager)
 * is feature-gated, so server-side rendering and test environments can render
 * the same components safely.
 */

export type NetworkStatus = "online" | "offline" | "unknown";

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
}

/**
 * Subscribe to browser online/offline events and expose a coarse status.
 */
export function useNetworkStatus(): {
  status: NetworkStatus;
  isOnline: boolean;
  effectiveType: string | null;
  lastChangedAt: number | null;
} {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator === "undefined") return "unknown";
    return navigator.onLine ? "online" : "offline";
  });
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setStatus("online");
      setLastChangedAt(Date.now());
    };
    const handleOffline = () => {
      setStatus("offline");
      setLastChangedAt(Date.now());
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const nav = (typeof navigator !== "undefined"
      ? (navigator as NavigatorWithConnection)
      : undefined);
    if (nav?.connection?.effectiveType) {
      setEffectiveType(nav.connection.effectiveType);
    }
    const handleConnectionChange = () => {
      if (nav?.connection?.effectiveType) {
        setEffectiveType(nav.connection.effectiveType);
      }
    };
    nav?.connection?.addEventListener?.("change", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      nav?.connection?.removeEventListener?.("change", handleConnectionChange);
    };
  }, []);

  return {
    status,
    isOnline: status === "online",
    effectiveType,
    lastChangedAt,
  };
}

export type InstallState = "idle" | "available" | "installed" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Captures the deferred `beforeinstallprompt` event so a custom UI can
 * invoke it on demand. The hook also tracks when the app is already running
 * as an installed PWA.
 */
export function usePwaInstall(): {
  state: InstallState;
  install: () => Promise<{ outcome: "accepted" | "dismissed" } | null>;
  reset: () => void;
} {
  const [state, setState] = useState<InstallState>(() => "idle");
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as BeforeInstallPromptEvent;
      setState("available");
    };
    const onInstalled = () => {
      promptRef.current = null;
      setState("installed");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (typeof window.matchMedia === "function") {
      const standalone = window.matchMedia("(display-mode: standalone)");
      if (standalone.matches) {
        setState("installed");
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = promptRef.current;
    if (!promptEvent) return null;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      promptRef.current = null;
      if (choice.outcome === "accepted") {
        setState("installed");
      } else {
        setState("idle");
      }
      return { outcome: choice.outcome };
    } catch {
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    promptRef.current = null;
    setState("idle");
  }, []);

  return { state, install, reset };
}

export type UpdateState = "idle" | "checking" | "available" | "activated";

interface ServiceWorkerRegistrationWithWaiting extends ServiceWorkerRegistration {
  waiting: ServiceWorker | null;
}

/**
 * Polls the registered service worker for a waiting update and exposes
 * helpers to apply it once the user accepts.
 */
export function useServiceWorkerUpdate(swPath: string = "/sw.js"): {
  state: UpdateState;
  apply: () => void;
  check: () => Promise<void>;
} {
  const [state, setState] = useState<UpdateState>("idle");
  const registrationRef = useRef<ServiceWorkerRegistrationWithWaiting | null>(null);

  const check = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setState("idle");
      return;
    }
    setState("checking");
    try {
      const reg = (await navigator.serviceWorker.getRegistration(
        swPath,
      )) as ServiceWorkerRegistrationWithWaiting | undefined;
      if (!reg) {
        setState("idle");
        return;
      }
      registrationRef.current = reg;
      await reg.update();
      if (reg.waiting) {
        setState("available");
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [swPath]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const onUpdateFound = (registration: ServiceWorkerRegistrationWithWaiting) => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          registrationRef.current = registration;
          setState("available");
        }
      });
    };

    const onControllerChange = () => {
      setState("activated");
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .getRegistration(swPath)
      .then((reg) => {
        if (reg) {
          registrationRef.current = reg as ServiceWorkerRegistrationWithWaiting;
          onUpdateFound(reg as ServiceWorkerRegistrationWithWaiting);
        }
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, [swPath]);

  const apply = useCallback(() => {
    const registration = registrationRef.current;
    if (!registration || !registration.waiting) {
      setState("activated");
      return;
    }
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return { state, apply, check };
}

export type PushSupport = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscription: PushSubscription | null;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function applicationServerKeyBuffer(publicKey: string): ArrayBuffer {
  const view = urlBase64ToUint8Array(publicKey);
  // Copy into a fresh ArrayBuffer so the type is always ArrayBuffer (not
  // ArrayBufferLike / SharedArrayBuffer) for the PushManager contract.
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
}

function isPushSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (typeof Notification === "undefined") return false;
  if (typeof window !== "undefined" && typeof window.PushManager === "undefined") {
    // Some browsers expose the service worker container without PushManager.
    return false;
  }
  return true;
}

/**
 * Convenience wrapper around the browser Push API. It returns whether push
 * is supported, the current permission, and the active subscription (if any)
 * and exposes subscribe/unsubscribe helpers.
 */
export function usePushSubscription(
  applicationServerKeyResolver?: () => Promise<string | null>,
): {
  support: PushSupport;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  refresh: () => Promise<void>;
} {
  const [support, setSupport] = useState<PushSupport>(() => ({
    supported: isPushSupported(),
    permission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    subscription: null,
  }));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef(applicationServerKeyResolver);

  useEffect(() => {
    resolverRef.current = applicationServerKeyResolver;
  }, [applicationServerKeyResolver]);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setSupport({ supported: false, permission: "unsupported", subscription: null });
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSupport({
        supported: true,
        permission: Notification.permission,
        subscription: sub,
      });
    } catch {
      setSupport({ supported: false, permission: "unsupported", subscription: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setSupport((prev) => ({ ...prev, permission }));
          setLoading(false);
          return false;
        }
      }
      const reg = await navigator.serviceWorker.ready;
      let serverKey: string | null = null;
      if (resolverRef.current) {
        serverKey = await resolverRef.current();
      }
      const init: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };
      if (serverKey) {
        init.applicationServerKey = applicationServerKeyBuffer(serverKey);
      }
      const sub = await reg.pushManager.subscribe(init);
      setSupport({ supported: true, permission: "granted", subscription: sub });
      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push subscription failed");
      setLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!existing) {
        setSupport((prev) => ({ ...prev, subscription: null }));
        setLoading(false);
        return true;
      }
      const ok = await existing.unsubscribe();
      setSupport((prev) => ({ ...prev, subscription: ok ? null : prev.subscription }));
      setLoading(false);
      return ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unsubscribe failed");
      setLoading(false);
      return false;
    }
  }, []);

  return { support, loading, error, subscribe, unsubscribe, refresh };
}
