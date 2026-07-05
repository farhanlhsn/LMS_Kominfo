"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api-client";
import type { RealtimeEvent } from "../../lib/lms-types";

export type RealtimeStatus = "idle" | "polling" | "error";

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

/**
 * Polling-based subscription to a realtime channel. Uses the
 * /realtime/poll endpoint with a 5 second default interval. Future
 * transports (SSE / WebSocket) can be swapped in transparently because
 * the same RealtimeEvent shape is returned.
 */
export function useRealtimeChannel(
  channel: string | null,
  options: UseRealtimeChannelOptions = {},
): UseRealtimeChannelResult {
  const interval = options.intervalMs ?? 5000;
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
    let cursor: string | undefined;

    const tick = async () => {
      setStatus("polling");
      try {
        const result = await api.pollRealtime({ channel, since: cursor, order: "asc", limit: 50 });
        if (cancelled) return;
        if (result.data.length > 0) {
          for (const event of result.data) {
            onEventRef.current?.(event);
          }
          const newest = result.data[result.data.length - 1]?.createdAt;
          if (newest) {
            setLastEventAt(newest);
            cursor = newest;
          }
        }
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught : new Error(String(caught)));
          setStatus("error");
        }
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, interval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [channel, interval, enabled]);

  return { status, lastEventAt, error };
}
