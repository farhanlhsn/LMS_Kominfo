"use client";

import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { IntegrityScoreCard } from "../../../components/proctoring/integrity-score-card";
import { ProctoringFlagList } from "../../../components/proctoring/proctoring-flag-list";
import { PERMISSIONS } from "@lms/shared";

export default function AdminProctoringPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/proctoring">
          <PageHeader
            eyebrow="Admin"
            title="Proctoring review"
            description="Review suspicious activity and integrity scores for exam attempts."
          />
          <div className="space-y-6">
            <IntegrityScoreCard />
            <ProctoringFlagList />
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
