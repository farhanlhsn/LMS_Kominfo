"use client";

import { useMemo, useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { CourseCard, labelize } from "../../components/lms/courses";
import { FilterBar, PageHeader, Pagination } from "../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../components/ui/states";
import { useCourses } from "../../lib/api-hooks";

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const query = useCourses();
  const courses = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const totalPages = Number(query.data?.meta?.totalPages ?? 1);

  const publishedCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesStatus = course.status === "PUBLISHED";
        const matchesSearch = `${course.title} ${course.description ?? ""} ${
          course.category?.name ?? ""
        }`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesLevel = !level || course.level === level;
        return matchesStatus && matchesSearch && matchesLevel;
      }),
    [courses, level, search],
  );

  return (
    <AuthGate>
      <AppShell currentPath="/courses">
        <PageHeader
          eyebrow="Catalog"
          title="Courses"
          description="Search and filter published courses in the active organization."
        />

        <FilterBar
          onClear={() => {
            setSearch("");
            setLevel("");
          }}
          onClearLabel="Clear filters"
        >
          <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
            <span className="sr-only">Search courses</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses"
              type="search"
              value={search}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            <span className="sr-only">Level</span>
            <select
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
              onChange={(event) => setLevel(event.target.value)}
              value={level}
            >
              <option value="">All levels</option>
              {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map(
                (option) => (
                  <option key={option} value={option}>
                    {labelize(option)}
                  </option>
                ),
              )}
            </select>
          </label>
        </FilterBar>

        {query.loading ? (
          <div className="mt-5">
            <LoadingState title="Loading courses" />
          </div>
        ) : query.error ? (
          <div className="mt-5">
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load courses"
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {publishedCourses.length > 0 ? (
                publishedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))
              ) : (
                <EmptyState
                  className="lg:col-span-2 xl:col-span-3"
                  title="No courses found"
                  description="Adjust filters or check back after courses are published."
                />
              )}
            </div>

            <div className="mt-5">
              <Pagination page={Number(query.data?.meta?.page ?? 1)} totalPages={totalPages} />
            </div>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
