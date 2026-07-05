"use client";

import { useMemo, useState } from "react";
import { GraduationCap, BookOpen, BarChart3, Activity } from "lucide-react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { CourseProgressCard } from "../../components/lms/courses";
import { MetricCard } from "../../components/analytics/charts";
import { FilterBar, PageHeader } from "../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../components/ui/states";
import { useMyEnrollments, useLearnerDashboard } from "../../lib/api-hooks";

export default function MyLearningPage() {
  const [search, setSearch] = useState("");
  const enrollmentsQuery = useMyEnrollments();
  const dashboardQuery = useLearnerDashboard();
  const enrollments = enrollmentsQuery.data ?? [];
  const dashboard = dashboardQuery.data;

  const filteredEnrollments = useMemo(
    () =>
      enrollments.filter((enrollment) =>
        `${enrollment.course.title} ${enrollment.course.description ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [enrollments, search],
  );

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Learner"
          title="My Learning"
          description="Track enrollments, resume lessons, and review progress."
        />

        {/* Dashboard stats */}
        {dashboardQuery.loading ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : dashboardQuery.error ? null : dashboard ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Enrolled courses"
              value={String(dashboard.totalCourses)}
              sublabel={`${dashboard.activeEnrollments} active`}
            />
            <MetricCard
              label="Completed"
              value={String(dashboard.completedCourses)}
              sublabel={dashboard.totalCourses > 0 ? `${Math.round((dashboard.completedCourses / dashboard.totalCourses) * 100)}% completion rate` : undefined}
            />
            <MetricCard
              label="Average progress"
              value={`${dashboard.avgProgressPercent}%`}
            />
            <MetricCard
              label="30-day activity"
              value={String(dashboard.monthlyActivityEvents)}
              sublabel="learning events"
            />
          </div>
        ) : null}

        <FilterBar>
          <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
            <span className="sr-only">Search enrolled courses</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search enrolled courses"
              type="search"
              value={search}
            />
          </label>
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}
            type="button"
          >
            Reset
          </button>
        </FilterBar>

        {enrollmentsQuery.loading ? (
          <div className="mt-5">
            <LoadingState title="Loading enrollments" />
          </div>
        ) : enrollmentsQuery.error ? (
          <div className="mt-5">
            <ApiErrorState
              error={enrollmentsQuery.error}
              fallbackTitle="Could not load enrollments"
            />
          </div>
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredEnrollments.length > 0 ? (
              filteredEnrollments.map((enrollment) => (
                <CourseProgressCard
                  key={enrollment.id}
                  enrollment={enrollment}
                />
              ))
            ) : (
              <EmptyState
                className="lg:col-span-2"
                title="No enrollments yet"
                description="Enrolled courses will appear here with progress and resume actions."
              />
            )}
          </section>
        )}
      </AppShell>
    </AuthGate>
  );
}
