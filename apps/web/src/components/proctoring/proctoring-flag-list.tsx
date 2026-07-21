"use client";

import { useCallback, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useProctoringFlags, useReviewProctoringFlag } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import { StatusBadge } from "../ui/core";
import type { ProctoringFlag, ProctoringFlagStatus, ProctoringSeverity } from "../../lib/lms-types";

const FLAG_TONES: Record<ProctoringFlagStatus, "danger" | "warning" | "neutral"> = {
  OPEN: "danger",
  UPHELD: "warning",
  DISMISSED: "neutral",
};

const SEVERITY_TONES: Record<ProctoringSeverity, "danger" | "warning" | "info"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
};

export function ProctoringFlagList() {
  const flagsQuery = useProctoringFlags();
  const review = useReviewProctoringFlag();
  const [statusFilter, setStatusFilter] = useState<ProctoringFlagStatus | "OPEN" | "ALL">("OPEN");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (flag: ProctoringFlag, status: ProctoringFlagStatus) => {
      setBusy(flag.id);
      setActionError(null);
      try {
        await review(flag.id, { status, notes: status === "DISMISSED" ? "Reviewed and dismissed" : "Reviewed" });
        await flagsQuery.refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update flag");
      } finally {
        setBusy(null);
      }
    },
    [review, flagsQuery],
  );

  const filtered =
    flagsQuery.data?.filter((f) =>
      statusFilter === "ALL" ? true : f.status === statusFilter,
    ) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded border border-border px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProctoringFlagStatus | "ALL")}
          >
            <option value="OPEN">Open</option>
            <option value="UPHELD">Upheld</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ALL">All</option>
          </select>
        </label>
      </div>

      {actionError ? (
        <p className="text-xs text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {flagsQuery.isLoading ? (
        <LoadingState title="Loading proctoring flags" />
      ) : flagsQuery.error ? (
        <ApiErrorState error={flagsQuery.error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No proctoring flags"
          description="Suspicious activity during attempts will appear here for review."
          icon={ShieldAlert}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((flag) => (
            <li
              key={flag.id}
              className="rounded-lg border border-border bg-card p-4 shadow-subtle"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={FLAG_TONES[flag.status]} value={flag.status} />
                    {flag.event ? (
                      <StatusBadge tone={SEVERITY_TONES[flag.event.severity]} value={flag.event.severity} />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {new Date(flag.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    Event type: <span className="font-mono">{flag.event?.type ?? "unknown"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Session: {flag.session?.id} • Attempt: {flag.session?.attemptId}
                  </p>
                  {flag.notes ? (
                    <p className="mt-2 text-xs text-muted-foreground">Notes: {flag.notes}</p>
                  ) : null}
                </div>
                {flag.status === "OPEN" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleAction(flag, "UPHELD")}
                      disabled={busy === flag.id}
                    >
                      Uphold
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleAction(flag, "DISMISSED")}
                      disabled={busy === flag.id}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
