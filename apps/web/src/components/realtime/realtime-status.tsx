"use client";

import { cn } from "../../lib/utils";
import type { RealtimeStatus } from "../hooks/use-realtime-channel";

const labelFor: Record<RealtimeStatus, { text: string; tone: string }> = {
  idle: { text: "Idle", tone: "bg-muted text-muted-foreground" },
  connecting: { text: "Connecting…", tone: "bg-muted text-muted-foreground" },
  connected: { text: "Live", tone: "bg-emerald-500/10 text-emerald-700" },
  polling: { text: "Live (polling)", tone: "bg-emerald-500/10 text-emerald-700" },
  error: { text: "Disconnected", tone: "bg-destructive/10 text-destructive" },
};

export interface RealtimeStatusPillProps {
  status: RealtimeStatus;
  lastEventAt?: string | null;
  className?: string;
}

export function RealtimeStatusPill({ status, lastEventAt, className }: RealtimeStatusPillProps) {
  const meta = labelFor[status];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        meta.tone,
        className,
      )}
      data-testid="realtime-status-pill"
      data-status={status}
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 rounded-full",
          (status === "polling" || status === "connected") && "bg-emerald-500 animate-pulse",
          status === "connecting" && "bg-muted-foreground animate-pulse",
          status === "idle" && "bg-muted-foreground",
          status === "error" && "bg-destructive",
        )}
      />
      <span>{meta.text}</span>
      {lastEventAt && (
        <span className="text-[10px] text-muted-foreground">
          last {new Date(lastEventAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
