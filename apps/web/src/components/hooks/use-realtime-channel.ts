"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "../../lib/api-client";
import type { RealtimeEvent } from "../../lib/lms-types";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "polling" | "error";

export interface UseRealtimeChannelOptions {
  intervalMs?: number;
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
}

export interface UseRealtimeChannelResult {
  status: RealtimeStatus;
  lastEventAt: string | null;
  error: Error | null;
}

function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  if (apiUrl.startsWith("http")) {
    return apiUrl.replace(/\/api\/v1\/?$/, "");
  }
  return window.location.origin;
}

export function useRealtimeChannel(
  channel: string | null,
  options: UseRealtimeChannelOptions = {},
): UseRealtimeChannelResult {
  const intervalMs = options.intervalMs ?? 5000;
  const enabled = options.enabled ?? true;
  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !channel) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cursor: string | undefined;

    function startPolling() {
      const tick = async () => {
        if (cancelled) return;
        setStatus("polling");
        try {
          const result = await api.pollRealtime({ channel: channel!, since: cursor, order: "asc", limit: 50 });
          if (cancelled) return;
          for (const event of result.data) {
            onEventRef.current?.(event);
          }
          const newest = result.data[result.data.length - 1]?.createdAt;
          if (newest) { setLastEventAt(newest); cursor = newest; }
          setError(null);
        } catch (caught) {
          if (!cancelled) {
            setError(caught instanceof Error ? caught : new Error(String(caught)));
            setStatus("error");
          }
        }
      };
      void tick();
      pollTimer = setInterval(() => { void tick(); }, intervalMs);
    }

    try {
      const base = getWsBaseUrl();
      if (!base) { startPolling(); return; }

      setStatus("connecting");
      socket = io(`${base}/realtime`, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        if (cancelled) return;
        setStatus("connected");
        setError(null);
        socket!.emit("subscribe", { channel });
      });

      socket.on("event", (event: RealtimeEvent) => {
        if (cancelled) return;
        onEventRef.current?.(event);
        setLastEventAt(event.createdAt as unknown as string ?? new Date().toISOString());
      });

      socket.on("connect_error", () => {
        if (cancelled) return;
        socket?.disconnect();
        socket = null;
        startPolling();
      });

      socket.on("disconnect", () => {
        if (!cancelled) setStatus("error");
      });
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (socket) {
        socket.emit("unsubscribe", { channel });
        socket.disconnect();
      }
      setStatus("idle");
    };
  }, [channel, enabled, intervalMs]);

  return { status, lastEventAt, error };
}
