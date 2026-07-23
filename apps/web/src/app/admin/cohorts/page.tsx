"use client";

import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { CohortList } from "../../../components/scheduling/cohort-list";
import { CohortManagement } from "../../../components/scheduling/cohort-management";
import { PERMISSIONS } from "@lms/shared";

export default function AdminCohortsPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesUpdate]}>
        <AppShell currentPath="/admin/cohorts">
          <PageHeader
            eyebrow="Admin"
            title="Cohorts & scheduling"
            description="Group learners into scheduled course runs with shared dates, membership, capacity, and recurring meeting times."
          />
          <CohortList />
          <section className="mt-6 rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Members & schedule</h2>
            <div className="mt-3">
              <CohortManagement />
            </div>
          </section>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
