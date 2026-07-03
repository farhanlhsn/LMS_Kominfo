"use client";

import { useMemo, useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { CourseProgressCard } from "../../components/lms/courses";
import { FilterBar, PageHeader } from "../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../components/ui/states";
import { useMyEnrollments } from "../../lib/api-hooks";

export default function MyLearningPage() {
  const [search, setSearch] = useState("");
  const query = useMyEnrollments();
  const enrollments = query.data ?? [];
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
          description="Track enrollments, resume lessons, and review progress in the active organization."
        />

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

        {query.loading ? (
          <div className="mt-5">
            <LoadingState title="Loading enrollments" />
          </div>
        ) : query.error ? (
          <div className="mt-5">
            <ApiErrorState
              error={query.error}
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
