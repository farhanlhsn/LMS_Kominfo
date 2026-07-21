"use client";

import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../components/ui/states";
import { MetricCard, SimpleBarChart } from "../../../components/analytics/charts";
import {
  useAdminOverview,
  useAdminTrends,
  useAdminCourseMetrics,
} from "../../../lib/api-hooks";
import type { CourseMetric } from "../../../lib/lms-types";

export default function AdminAnalyticsPage() {
  const overview = useAdminOverview();
  const trends = useAdminTrends();
  const courseMetrics = useAdminCourseMetrics();

  const trendData =
    trends.data?.map((d) => ({ label: d.date.slice(5), value: d.events })) ?? [];

  const courses = (courseMetrics.data as CourseMetric[] | undefined) ?? [];

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.usersRead]}>
        <AppShell currentPath="/admin/analytics">
          <PageHeader
            eyebrow="Admin"
            title="Analytics"
            description="Platform-wide engagement, enrollment, and course metrics."
          />

          {overview.loading ? (
            <LoadingState title="Loading analytics" />
          ) : overview.error ? (
            <ApiErrorState error={overview.error} fallbackTitle="Failed to load analytics" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Total courses"
                  value={String(overview.data?.totalCourses ?? 0)}
                />
                <MetricCard
                  label="Active members"
                  value={String(overview.data?.activeMembers ?? 0)}
                />
                <MetricCard
                  label="Total enrollments"
                  value={String(overview.data?.totalEnrollments ?? 0)}
                />
                <MetricCard
                  label="Completed enrollments"
                  value={String(overview.data?.completedEnrollments ?? 0)}
                />
                <MetricCard
                  label="Completion rate"
                  value={`${Math.round((overview.data?.completionRate ?? 0) * 100)}%`}
                />
                <MetricCard
                  label="Monthly events"
                  value={String(overview.data?.monthlyEvents ?? 0)}
                />
              </div>

              <section className="mt-6 rounded-md border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Daily activity (events)</h2>
                {trends.loading ? (
                  <p className="mt-2 text-sm text-muted-foreground">Loading trends…</p>
                ) : trendData.length ? (
                  <SimpleBarChart className="mt-4" data={trendData} />
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No trend data.</p>
                )}
              </section>

              <section className="mt-6 rounded-md border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Course metrics</h2>
                {courseMetrics.loading ? (
                  <p className="mt-2 text-sm text-muted-foreground">Loading courses…</p>
                ) : courses.length ? (
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {courses.slice(0, 10).map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2">
                        <span>{c.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.enrollments} enrolled
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No course metrics.</p>
                )}
              </section>
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
