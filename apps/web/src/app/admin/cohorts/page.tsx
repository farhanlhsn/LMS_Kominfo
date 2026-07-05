"use client";

import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { CohortList } from "../../../components/scheduling/cohort-list";
import { PERMISSIONS } from "@lms/shared";

export default function AdminCohortsPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesUpdate]}>
        <AppShell currentPath="/admin/cohorts">
          <PageHeader
            eyebrow="Admin"
            title="Cohorts & scheduling"
            description="Manage scheduled cohorts, members, and weekly meeting times."
          />
          <CohortList />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
