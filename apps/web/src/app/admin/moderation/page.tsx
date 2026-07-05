"use client";

import { useCallback, useState } from "react";
import { Flag, ShieldAlert } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection, StatusBadge } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { EmptyState, LoadingState, ApiErrorState } from "../../../components/ui/states";
import {
  useContentFlags,
  useCreateModerationAction,
  useModerationActions,
  useModerationReports,
  useUpdateModerationReport,
} from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type {
  ModerationActionType,
  ModerationReport,
  ModerationReportStatus,
  ModerationTargetType,
} from "../../../lib/lms-types";

const STATUS_TABS: { key: ModerationReportStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_REVIEW", label: "In review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

const ACTION_OPTIONS: ModerationActionType[] = [
  "WARN",
  "SUSPEND",
  "BAN",
  "REMOVE",
  "RESTORE",
  "LOCK",
];

const TARGET_OPTIONS: ModerationTargetType[] = [
  "CONTENT",
  "USER",
  "COMMENT",
  "COURSE",
  "DISCUSSION",
];

export default function AdminModerationPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.auditRead]}>
        <AppShell currentPath="/admin/moderation">
          <AdminModerationBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function AdminModerationBody() {
  const [statusFilter, setStatusFilter] = useState<ModerationReportStatus | "ALL">("OPEN");
  const reportsQuery = useModerationReports(
    statusFilter === "ALL" ? undefined : { status: statusFilter },
  );
  const { data: actions = [] } = useModerationActions();
  const { data: flags = [] } = useContentFlags();
  const updateReport = useUpdateModerationReport();
  const createAction = useCreateModerationAction();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleStatus = useCallback(
    async (id: string, next: ModerationReportStatus) => {
      setBusyId(id);
      setError(null);
      try {
        await updateReport(id, { status: next });
        await reportsQuery.refetch();
        setStatus(`Report moved to ${next}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update report");
      } finally {
        setBusyId(null);
      }
    },
    [updateReport, reportsQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Moderation queue"
        description="Triage user reports, log actions, and review auto-detected content flags."
      />

      {status ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <FormSection
        title="Report queue"
        description="Reports submitted by learners. Move them to review, resolution or dismissal as you go."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={statusFilter === tab.key ? "default" : "outline"}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void reportsQuery.refetch()}>
            Refresh
          </Button>
        </div>
        {reportsQuery.isLoading ? (
          <LoadingState title="Loading reports" />
        ) : reportsQuery.error ? (
          <ApiErrorState error={reportsQuery.error} />
        ) : reportsQuery.data && reportsQuery.data.length === 0 ? (
          <EmptyState
            title="No reports"
            description="Reports submitted by learners will appear here."
            icon={Flag}
          />
        ) : (
          <ul className="space-y-2">
            {(reportsQuery.data ?? []).map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                busy={busyId === report.id}
                onUpdate={handleStatus}
              />
            ))}
          </ul>
        )}
      </FormSection>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Action log</h3>
            <p className="text-sm text-muted-foreground">All actions taken by moderators.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(actions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(actions ?? []).map((action) => (
                  <li key={action.id} className="rounded border border-border p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{action.actionType}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(action.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {action.targetType} • {action.targetId}
                    </p>
                    <p className="text-sm">{action.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Quick action</h3>
            <p className="text-sm text-muted-foreground">Record a moderation action manually.</p>
          </CardHeader>
          <CardContent>
            <ActionForm onSubmit={createAction} />
          </CardContent>
        </Card>
      </div>

      <FormSection
        title="Content flags"
        description="Auto-detected and manually flagged content awaiting review."
      >
        {(flags ?? []).length === 0 ? (
          <EmptyState
            title="No content flags"
            description="When content is flagged by learners or automated checks, it will appear here."
            icon={ShieldAlert}
          />
        ) : (
          <ul className="space-y-1 text-sm">
            {(flags ?? []).map((flag) => (
              <li key={flag.id} className="rounded border border-border p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {flag.flagType} • {flag.targetType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(flag.createdAt).toLocaleString()}
                  </span>
                </div>
                {flag.confidence != null ? (
                  <p className="text-xs text-muted-foreground">
                    Confidence {Math.round(flag.confidence * 100)}% {flag.autoDetected ? "(auto)" : "(manual)"}
                  </p>
                ) : null}
                {flag.reason ? <p className="text-sm">{flag.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </div>
  );
}

function ReportRow({
  report,
  busy,
  onUpdate,
}: {
  report: ModerationReport;
  busy: boolean;
  onUpdate: (id: string, status: ModerationReportStatus) => Promise<void>;
}) {
  return (
    <li className="rounded border border-border bg-card p-3 text-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">
            {report.targetType} • {report.targetId}
          </p>
          <p className="text-xs text-muted-foreground">
            Reported by {report.reporter?.email ?? report.reporterId} on{" "}
            {new Date(report.createdAt).toLocaleString()}
          </p>
          <p className="mt-1">{report.reason}</p>
          {report.description ? (
            <p className="text-xs text-muted-foreground">{report.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone(report.status)} value={report.status} />
          {report.status !== "IN_REVIEW" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void onUpdate(report.id, "IN_REVIEW")}>
              Mark in review
            </Button>
          ) : null}
          {report.status !== "RESOLVED" ? (
            <Button size="sm" disabled={busy} onClick={() => void onUpdate(report.id, "RESOLVED")}>
              Resolve
            </Button>
          ) : null}
          {report.status !== "DISMISSED" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void onUpdate(report.id, "DISMISSED")}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function statusTone(status: ModerationReportStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "RESOLVED":
      return "success";
    case "IN_REVIEW":
      return "warning";
    case "DISMISSED":
      return "neutral";
    case "OPEN":
    default:
      return "danger";
  }
}

function ActionForm({
  onSubmit,
}: {
  onSubmit: (input: {
    targetType: ModerationTargetType;
    targetId: string;
    actionType: ModerationActionType;
    reason: string;
    notes?: string;
  }) => Promise<unknown>;
}) {
  const [targetType, setTargetType] = useState<ModerationTargetType>("CONTENT");
  const [targetId, setTargetId] = useState("");
  const [actionType, setActionType] = useState<ModerationActionType>("WARN");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ targetType, targetId, actionType, reason, notes: notes || undefined });
      setTargetId("");
      setReason("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log action");
    } finally {
      setSaving(false);
    }
  }, [onSubmit, targetType, targetId, actionType, reason, notes]);

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          Target type
          <select
            className="mt-1 rounded border border-border px-2 py-1"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as ModerationTargetType)}
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Action
          <select
            className="mt-1 rounded border border-border px-2 py-1"
            value={actionType}
            onChange={(event) => setActionType(event.target.value as ModerationActionType)}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col">
          Target ID
          <input
            className="mt-1 rounded border border-border px-2 py-1"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          />
        </label>
        <label className="col-span-2 flex flex-col">
          Reason
          <input
            className="mt-1 rounded border border-border px-2 py-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label className="col-span-2 flex flex-col">
          Notes
          <textarea
            rows={2}
            className="mt-1 rounded border border-border px-2 py-1"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button onClick={submit} disabled={saving || !targetId || !reason}>
        {saving ? "Logging…" : "Log action"}
      </Button>
    </div>
  );
}
