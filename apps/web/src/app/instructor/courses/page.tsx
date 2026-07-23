"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import {
  CourseStatusBadge,
  labelize,
} from "../../../components/lms/courses";
import { ButtonLink, DataTable, FilterBar, PageHeader } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useInstructorCourses, useSession } from "../../../lib/api-hooks";
import { hasPermission } from "../../../lib/authz";

export default function InstructorCoursesPage() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const query = useInstructorCourses();
  const session = useSession();
  const canCreate = hasPermission(session, PERMISSIONS.coursesCreate);
  const canPublish = hasPermission(session, PERMISSIONS.coursesPublish);
  const courses = useMemo(() => query.data ?? [], [query.data]);
  const filteredCourses = useMemo(
    () =>
      courses.filter((course) =>
        `${course.title} ${course.category?.name ?? ""} ${course.status}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [courses, search],
  );
  async function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await query.reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const rows = filteredCourses.map((course) => [
    <span className="font-medium" key="title">
      {course.title}
    </span>,
    <span className="text-muted-foreground" key="category">
      {course.category?.name ?? "General"}
    </span>,
    <span className="text-muted-foreground" key="level">
      {labelize(course.level)}
    </span>,
    <CourseStatusBadge key="status" status={course.status} />,
    <div className="flex flex-wrap gap-2" key="actions">
      <ButtonLink
        className="w-fit"
        href={`/instructor/courses/${course.id}/builder`}
        variant="ghost"
      >
        Builder
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </ButtonLink>
      {canCreate ? (
        <button
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          onClick={() =>
            void run(
              () => api.duplicateCourse(course.id),
              "Course duplicated.",
            )
          }
          type="button"
        >
          Duplicate
        </button>
      ) : null}
      {canPublish ? (
        <button
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          onClick={() =>
            void run(() => api.archiveCourse(course.id), "Course archived.")
          }
          type="button"
        >
          Archive
        </button>
      ) : null}
    </div>,
  ]);

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Instructor"
          title="Course Builder"
          description="Manage draft and published courses from the instructor API."
          actions={
            canCreate ? (
              <ButtonLink href="/instructor/courses/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                New course
              </ButtonLink>
            ) : null
          }
        />

        <FilterBar>
          <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
            <span className="sr-only">Search managed courses</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search managed courses"
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

        {message ? (
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        ) : null}

        <section className="mt-5">
          {query.loading ? (
            <LoadingState title="Loading managed courses" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load managed courses"
            />
          ) : rows.length > 0 ? (
            <DataTable
              columns={["Course", "Category", "Level", "Status", "Action"]}
              rows={rows}
            />
          ) : (
            <EmptyState
              title="No managed courses"
              description="Create a course draft to start building curriculum."
            />
          )}
        </section>
      </AppShell>
    </AuthGate>
  );
}
