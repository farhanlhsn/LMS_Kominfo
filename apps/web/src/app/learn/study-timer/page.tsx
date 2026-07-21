"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, StopCircle, Clock } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useLearningGoals, useListStudySessions, useStartStudySession, useUpdateStudySession } from "../../../lib/api-hooks";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StudyTimerPage() {
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [goalId, setGoalId] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef(0);

  const goalsQuery = useLearningGoals();
  const sessionsQuery = useListStudySessions({ limit: 20 });
  const startSession = useStartStudySession();
  const updateSession = useUpdateStudySession();

  const stopTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const syncToBackend = useCallback(async (id: string, sec: number, st: string) => {
    try { await updateSession(id, { elapsedSeconds: sec, status: st }); } catch { /* ignore sync errors */ }
  }, [updateSession]);

  useEffect(() => {
    return () => { stopTimer(); };
  }, [stopTimer]);

  async function start() {
    const session = await startSession({ goalId: goalId || undefined, targetSeconds: 0 });
    setSessionId(session.id);
    setElapsed(0);
    pausedElapsedRef.current = 0;
    startTimeRef.current = Date.now();
    setStatus("running");
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTimeRef.current) / 1000);
      setElapsed(pausedElapsedRef.current + diff);
    }, 1000);
  }

  function pause() {
    if (status !== "running") return;
    stopTimer();
    pausedElapsedRef.current = elapsed;
    setStatus("paused");
    if (sessionId) void syncToBackend(sessionId, elapsed, "PAUSED");
  }

  function resume() {
    if (status !== "paused") return;
    startTimeRef.current = Date.now();
    setStatus("running");
    intervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(pausedElapsedRef.current + diff);
    }, 1000);
  }

  async function stop() {
    stopTimer();
    if (sessionId) {
      await syncToBackend(sessionId, elapsed, "COMPLETED");
      await sessionsQuery.reload();
    }
    setStatus("idle");
    setSessionId(null);
    setElapsed(0);
    pausedElapsedRef.current = 0;
  }

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Learner"
          title="Study Timer"
          description="Track focused study sessions and sync progress to your learning goals."
        />

        <div className="mb-6 flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 shadow-subtle">
          <Clock className="h-8 w-8 text-primary" />
          <p className="text-5xl font-mono font-bold tabular-nums tracking-wider">
            {formatDuration(elapsed)}
          </p>

          <div className="flex items-center gap-3">
            {status === "idle" ? (
              <>
                <select
                  className="rounded border border-input bg-background px-3 py-1.5 text-sm"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  <option value="">No goal</option>
                  {(goalsQuery.data ?? [])
                    .filter((g) => g.targetType === "STUDY_TIME" && g.status === "ACTIVE")
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                </select>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  onClick={start}
                  type="button"
                >
                  <Play className="h-4 w-4" /> Start
                </button>
              </>
            ) : (
              <>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-muted"
                  onClick={status === "running" ? pause : resume}
                  type="button"
                >
                  {status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/20"
                  onClick={stop}
                  type="button"
                >
                  <StopCircle className="h-4 w-4" /> Stop
                </button>
              </>
            )}
          </div>

          {status !== "idle" && (
            <p className="text-xs text-muted-foreground">
              {status === "running" ? "● Recording…" : status === "paused" ? "⏸ Paused" : null}
            </p>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent sessions</h2>
          {sessionsQuery.loading ? (
            <LoadingState title="Loading sessions" />
          ) : sessionsQuery.error ? (
            <ApiErrorState error={sessionsQuery.error} fallbackTitle="Could not load sessions" />
          ) : sessionsQuery.data?.length ? (
            <DataTable
              columns={["Started", "Duration", "Status"]}
              rows={sessionsQuery.data.map((s) => [
                new Date(s.startedAt).toLocaleString(),
                formatDuration(s.elapsedSeconds),
                <StatusBadge key="st" value={s.status} />,
              ])}
            />
          ) : (
            <EmptyState title="No sessions yet" description="Start a study timer to track your focus time." />
          )}
        </section>
      </AppShell>
    </AuthGate>
  );
}
