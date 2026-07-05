"use client";

import { Users, BookOpen, TrendingUp, Activity } from "lucide-react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { MetricCard, SimpleBarChart } from "../../components/analytics/charts";
import { PageHeader, StatCard } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useInstructorDashboard } from "../../lib/api-hooks";

export default function InstructorDashboardPage() {
  const query = useInstructorDashboard();

  return (
    <AuthGate>
      <AppShell currentPath="/instructor">
        <PageHeader
          eyebrow="Instructor"
          title="Dashboard"
          description="Course performance, learner engagement, and activity metrics."
        />

        {query.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : query.error ? (
          <ApiErrorState error={query.error} fallbackTitle="Could not load dashboard" />
        ) : query.data ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Your courses"
                value={String(query.data.courses.length)}
                sublabel={`${query.data.courses.filter((c) => c.enrollments > 0).length} with enrollments`}
              />
              <MetricCard
                label="Total learners"
                value={String(query.data.totalLearners)}
              />
              <MetricCard
                label="Total enrollments"
                value={String(query.data.totalEnrollments)}
              />
              <MetricCard
                label="Avg completion rate"
                value={`${query.data.avgCompletionRate}%`}
              />
            </div>

            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Course overview</h2>
              <div className="mt-4 divide-y divide-border">
                {query.data.courses.map((course) => (
                  <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <a href={`/instructor/courses/${encodeURIComponent(course.slug)}`} className="text-sm font-semibold hover:text-primary">
                        {course.title}
                      </a>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{course.enrollments} enrolled</span>
                        <span>{course.completedCount} completed</span>
                        <span>{course.completionRate}% rate</span>
                        <span>{course.weeklyActivity} events / week</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </AppShell>
    </AuthGate>
  );
}
