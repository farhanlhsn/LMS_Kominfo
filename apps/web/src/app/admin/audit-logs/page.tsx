"use client";

import { PERMISSIONS } from "@lms/shared";
import { RefreshCw,Search } from "lucide-react";
import { useState } from "react";
import { AuthGate,PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable,PageHeader,Pagination,StatusBadge } from "../../../components/ui/core";
import { ApiErrorState,EmptyState,LoadingState } from "../../../components/ui/states";
import { useAuditLogs } from "../../../lib/api-hooks";
import type { AuditLogEntry } from "../../../lib/lms-types";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [searchAction, setSearchAction] = useState("");
  const query = useAuditLogs({ page: String(page), limit: "50", ...(searchAction ? { action: searchAction } : {}) });
  const result = query.data;
  const meta = result?.meta as { page?: number; totalPages?: number } | undefined;

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.auditRead]}>
        <AppShell currentPath="/admin/audit-logs">
          <PageHeader
            eyebrow="Admin"
            title="Audit Logs"
            description="Security and compliance event log for the active organization."
            actions={
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                onClick={() => void query.reload()}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Refresh
              </button>
            }
          />

          <div className="mb-4 flex flex-wrap gap-3">
            <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
              <Search aria-hidden="true" className="h-4 w-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                onChange={(e) => { setSearchAction(e.target.value); setPage(1); }}
                placeholder="Filter by action..."
                type="search"
                value={searchAction}
              />
            </label>
          </div>

          {query.loading ? (
            <LoadingState title="Loading audit logs" />
          ) : query.error ? (
            <ApiErrorState error={query.error} fallbackTitle="Could not load audit logs" />
          ) : !result || !("data" in result) || !result.data?.length ? (
            <EmptyState title="No audit logs" description="Sensitive actions will be recorded here." />
          ) : (
            <>
              <DataTable
                size="compact"
                emptyMessage="No audit logs for this page."
                columns={["Action", "Entity", "Severity", "User", "Date"]}
                rows={result.data.map((log: AuditLogEntry) => [
                  <span key="a" className="font-medium">{log.action}</span>,
                  <span key="e" className="text-muted-foreground">{log.entityType ?? "-"}</span>,
                  <StatusBadge
                    key="s"
                    tone={log.severity === "CRITICAL" ? "danger" : log.severity === "WARNING" ? "warning" : "neutral"}
                    value={log.severity}
                  />,
                  <span key="u" className="text-muted-foreground">{log.user?.name ?? log.user?.email ?? "-"}</span>,
                  <span key="d" className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>,
                ])}
              />
              {meta && (
                <div className="mt-4">
                  <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} />
                </div>
              )}
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
