"use client";

import { BookOpen, Users, TrendingUp, Activity, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "../../components/auth/auth-gate";
import { PermissionGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { MetricCard, SimpleBarChart } from "../../components/analytics/charts";
import { PageHeader, StatusBadge } from "../../components/ui/core";
import { ApiErrorState, LoadingState, EmptyState } from "../../components/ui/states";
import { useAdminOverview, useAdminTrends } from "../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";

export default function AdminDashboardPage() {
  const overviewQuery = useAdminOverview();
  const trendsQuery = useAdminTrends();

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Admin"
            title="Dashboard"
            description="Organization-wide metrics, trends, and recent activity."
            actions={
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                href="/admin/audit-logs"
              >
                <Shield aria-hidden="true" className="h-4 w-4" />
                Audit Logs
              </Link>
            }
          />

          {overviewQuery.loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          ) : overviewQuery.error ? (
            <ApiErrorState error={overviewQuery.error} fallbackTitle="Could not load overview" />
          ) : overviewQuery.data ? (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total courses" value={String(overviewQuery.data.totalCourses)} />
                <MetricCard label="Active members" value={String(overviewQuery.data.activeMembers)} />
                <MetricCard label="Enrollments" value={String(overviewQuery.data.totalEnrollments)} sublabel={`${overviewQuery.data.completedEnrollments} completed`} />
                <MetricCard label="Completion rate" value={`${overviewQuery.data.completionRate}%`} sublabel={`${overviewQuery.data.monthlyEvents} events / 30d`} />
              </div>

              {/* Trends chart */}
              {trendsQuery.loading ? null : trendsQuery.data && trendsQuery.data.length > 0 ? (
                <section className="mb-6 rounded-lg border border-border bg-card p-5">
                  <h2 className="mb-4 text-lg font-semibold">Daily activity (30 days)</h2>
                  <SimpleBarChart
                    data={trendsQuery.data.map((d) => ({ label: d.date.slice(5), value: d.events }))}
                    height={180}
                  />
                </section>
              ) : null}

              {/* Recent audit logs */}
              <section className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent audit logs</h2>
                  <Link className="text-sm font-medium text-primary hover:underline" href="/admin/audit-logs">
                    View all
                  </Link>
                </div>
                {overviewQuery.data.recentAuditLogs.length > 0 ? (
                  <div className="mt-4 divide-y divide-border text-sm">
                    {overviewQuery.data.recentAuditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex flex-wrap items-center gap-3 py-3">
                        <StatusBadge
                          tone={log.severity === "CRITICAL" ? "danger" : log.severity === "WARNING" ? "warning" : "neutral"}
                          value={log.severity}
                        />
                        <span className="font-medium">{log.action}</span>
                        <span className="text-muted-foreground">{log.entityType}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No recent audit logs.</p>
                )}
              </section>
            </>
          ) : null}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
