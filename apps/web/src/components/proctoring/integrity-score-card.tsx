"use client";

import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useProctoringSessions } from "../../lib/api-hooks";
import type { ProctoringSession } from "../../lib/lms-types";
import { Card,CardContent,CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import { ApiErrorState,LoadingState } from "../ui/states";

export function IntegrityScoreCard() {
  const sessionsQuery = useProctoringSessions();

  const summary = useMemo(() => {
    const sessions: ProctoringSession[] = sessionsQuery.data ?? [];
    if (sessions.length === 0) {
      return { count: 0, avgScore: null, flagged: 0, totalEvents: 0 };
    }
    const scored = sessions.filter((s) => typeof s.integrityScore === "number");
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, s) => sum + (s.integrityScore ?? 0), 0) / scored.length,
          )
        : null;
    const flagged = sessions.filter((s) => s.status === "FLAGGED").length;
    const totalEvents = sessions.reduce(
      (sum, s) => sum + (s._count?.events ?? 0),
      0,
    );
    return { count: sessions.length, avgScore, flagged, totalEvents };
  }, [sessionsQuery.data]);

  if (sessionsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Integrity overview</h3>
        </CardHeader>
        <CardContent>
          <LoadingState title="Loading proctoring data" />
        </CardContent>
      </Card>
    );
  }

  if (sessionsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">Integrity overview</h3>
        </CardHeader>
        <CardContent>
          <ApiErrorState error={sessionsQuery.error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Integrity overview</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Average integrity score across the most recent proctoring sessions.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-semibold">{summary.count}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {summary.avgScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Avg integrity</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{summary.flagged}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{summary.totalEvents}</p>
            <p className="text-xs text-muted-foreground">Total events</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(sessionsQuery.data ?? []).slice(0, 5).map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {session.user?.name ?? session.user?.email ?? session.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.startedAt).toLocaleString()} •{" "}
                  {session._count?.events ?? 0} events
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={
                    session.status === "FLAGGED"
                      ? "danger"
                      : session.status === "REVIEWED"
                      ? "warning"
                      : session.status === "COMPLETED"
                      ? "success"
                      : "info"
                  }
                  value={session.status}
                />
                {typeof session.integrityScore === "number" ? (
                  <StatusBadge
                    tone={
                      session.integrityScore < 60
                        ? "danger"
                        : session.integrityScore < 80
                        ? "warning"
                        : "info"
                    }
                    value={`${session.integrityScore}/100`}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
