"use client";

import { useCallback, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useCohorts, useDeleteCohort } from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import { StatusBadge } from "../ui/core";
import type { Cohort, CohortStatus } from "../../lib/lms-types";
import { CohortForm } from "./cohort-form";
import { CohortManage } from "./cohort-manage";

const STATUS_TONES: Record<CohortStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PLANNED: "info",
  ACTIVE: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export function CohortList() {
  const [statusFilter, setStatusFilter] = useState<CohortStatus | "">("");
  const cohortsQuery = useCohorts(statusFilter ? { status: statusFilter } : {});
  const remove = useDeleteCohort();
  const [editing, setEditing] = useState<Cohort | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this cohort? Members will be removed.")) return;
      setActionError(null);
      try {
        await remove(id);
        await cohortsQuery.refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete cohort");
      }
    },
    [remove, cohortsQuery],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Status
          <select
            className="ml-2 rounded border border-border px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CohortStatus | "")}
          >
            <option value="">All</option>
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <Button onClick={() => setCreating((c) => !c)} size="sm">
          {creating ? "Close form" : "New cohort"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void cohortsQuery.refetch()}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {actionError ? (
        <p className="text-xs text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {creating ? (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Create cohort</h3>
          </CardHeader>
          <CardContent>
            <CohortForm
              onSubmitted={() => {
                setCreating(false);
                void cohortsQuery.refetch();
              }}
              onCancel={() => setCreating(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {cohortsQuery.isLoading ? (
        <LoadingState title="Loading cohorts" />
      ) : cohortsQuery.error ? (
        <ApiErrorState error={cohortsQuery.error} />
      ) : !cohortsQuery.data?.length ? (
        <EmptyState
          title="No cohorts yet"
          description="Create your first cohort to schedule live classes."
          icon={CalendarDays}
        />
      ) : (
        <ul className="space-y-3">
          {cohortsQuery.data.map((cohort) => (
            <li key={cohort.id}>
              <article className="rounded-lg border border-border bg-card p-4 shadow-subtle">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{cohort.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {cohort.course?.title ?? cohort.courseId} •{" "}
                      {new Date(cohort.startAt).toLocaleDateString()} →{" "}
                      {new Date(cohort.endAt).toLocaleDateString()} ({cohort.timezone})
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cohort._count?.members ?? 0} members • {cohort._count?.schedule ?? 0} sessions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={STATUS_TONES[cohort.status]} value={cohort.status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setManaging((id) => (id === cohort.id ? null : cohort.id))}
                    >
                      {managing === cohort.id ? "Close" : "Manage"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(cohort)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(cohort.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {editing?.id === cohort.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <CohortForm
                      initial={cohort}
                      onSubmitted={() => {
                        setEditing(null);
                        void cohortsQuery.refetch();
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : null}
                {managing === cohort.id ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <CohortManage cohortId={cohort.id} />
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
