"use client";

import { useState } from "react";
import { useApiMutation } from "../hooks/use-api-mutation";
import { api } from "../../lib/api-client";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";
import type { BulkJob, BulkJobStatus } from "../../lib/lms-types";

const STATUS_TONE: Record<BulkJobStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  PENDING: "neutral",
  RUNNING: "info",
  COMPLETED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
  PARTIAL: "warning",
};

export interface BulkJobTableProps {
  jobs: BulkJob[];
  onChanged?: () => void;
}

export function BulkJobTable({ jobs, onChanged }: BulkJobTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { mutate: cancel } = useApiMutation(async (id: string) => {
    setBusyId(id);
    await api.cancelBulkJob(id, "cancelled from UI");
  });
  const { mutate: resume } = useApiMutation(async (id: string) => {
    setBusyId(id);
    await api.resumeBulkJob(id);
  });

  const handleCancel = async (id: string) => {
    await cancel(id);
    setBusyId(null);
    onChanged?.();
  };
  const handleResume = async (id: string) => {
    await resume(id);
    setBusyId(null);
    onChanged?.();
  };

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No bulk jobs yet"
        description="Submit a bulk job to see progress and history here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="px-4 py-3 font-medium">{job.type}</td>
              <td className="px-4 py-3">
                <StatusBadge value={job.status} tone={STATUS_TONE[job.status]} />
              </td>
              <td className="px-4 py-3">
                {job.progressDone}/{job.progressTotal}
                {job.progressFailed > 0 ? (
                  <span className="ml-1 text-destructive">
                    ({job.progressFailed} failed)
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(job.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                {job.status === "RUNNING" || job.status === "PENDING" ? (
                  <button
                    className="inline-flex min-h-8 items-center rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    disabled={busyId === job.id}
                    onClick={() => handleCancel(job.id)}
                  >
                    Cancel
                  </button>
                ) : job.status === "CANCELLED" || job.status === "FAILED" ? (
                  <button
                    className="inline-flex min-h-8 items-center rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    disabled={busyId === job.id}
                    onClick={() => handleResume(job.id)}
                  >
                    Resume
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
