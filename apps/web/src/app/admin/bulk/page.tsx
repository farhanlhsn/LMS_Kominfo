"use client";

import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { BulkJobForm } from "../../../components/bulk/bulk-job-form";
import { BulkJobTable } from "../../../components/bulk/bulk-job-table";
import { PageHeader } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useBulkJobs } from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";

export default function AdminBulkPage() {
  const query = useBulkJobs();

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.platformAdmin]}>
        <AppShell currentPath="/admin/bulk">
          <PageHeader
            eyebrow="Admin"
            title="Bulk operations"
            description="Run platform-wide batch operations such as archiving, enrolling, or tagging content."
          />
          <div className="mb-6">
            <BulkJobForm onSubmitted={() => query.refresh()} />
          </div>
          {query.loading ? (
            <LoadingState title="Loading bulk jobs" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load bulk jobs"
            />
          ) : (
            <BulkJobTable jobs={query.data ?? []} onChanged={() => query.refresh()} />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
