"use client";

import { useMemo, useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { MetricCard, SimpleBarChart } from "../../components/analytics/charts";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState } from "../../components/ui/states";
import { useInstructorCourseEngagement, useInstructorDashboard } from "../../lib/api-hooks";

export default function InstructorDashboardPage() {
  const query = useInstructorDashboard();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const activeCourseId = selectedCourseId ?? query.data?.courses[0]?.id ?? null;
  const engagement = useInstructorCourseEngagement(activeCourseId, { from: "30d" });
  const completionData = useMemo(
    () => (query.data?.courses ?? []).map((course) => ({ label: course.title, value: course.completionRate })),
    [query.data?.courses],
  );

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

            <section className="mb-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="text-lg font-semibold">Daily engagement</h2><p className="text-sm text-muted-foreground">Learning events in selected course.</p></div>
                  <select aria-label="Analytics course" className="h-9 rounded-md border border-input bg-card px-2 text-sm" onChange={(event) => setSelectedCourseId(event.target.value || null)} value={selectedCourseId ?? ""}>
                    <option value="">{query.data.courses[0]?.title ?? "Select course"}</option>
                    {query.data.courses.slice(1).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                </div>
                {engagement.loading ? <div className="mt-4 h-40 animate-pulse rounded-md bg-muted" /> : engagement.error ? <p className="mt-4 text-sm text-destructive">Could not load engagement.</p> : <SimpleBarChart ariaLabel="Daily engagement events" className="mt-4" data={(engagement.data?.daily ?? []).map((item) => ({ label: item.date.slice(5), value: item.events }))} />}
                <p className="mt-2 text-xs text-muted-foreground">{engagement.data?.totalActiveLearners ?? 0} active learners in period.</p>
              </article>
              <article className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-lg font-semibold">Completion by course</h2><p className="text-sm text-muted-foreground">Completed enrollment percentage.</p>
                <SimpleBarChart ariaLabel="Course completion rates" className="mt-4" data={completionData} />
              </article>
            </section>

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
