"use client";

import { ArrowRight, BookOpen, CheckCircle2, Clock, GraduationCap } from "lucide-react";
import { AuthGate } from "../components/auth/auth-gate";
import { AppShell } from "../components/layout/shells";
import {
  CourseCard,
  CourseProgressCard,
  Meter,
} from "../components/lms/courses";
import { ButtonLink, PageHeader, StatCard } from "../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../components/ui/states";
import { useCourses, useMyEnrollments } from "../lib/api-hooks";

export default function Home() {
  const coursesQuery = useCourses();
  const enrollmentsQuery = useMyEnrollments();
  const courses = coursesQuery.data?.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const publishedCourses = courses.filter((course) => course.status === "PUBLISHED");
  const averageProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce(
            (sum, enrollment) => sum + enrollment.progressPercent,
            0,
          ) / enrollments.length,
        )
      : 0;
  const continueEnrollment = enrollments[0] ?? null;

  return (
    <AuthGate>
      <AppShell currentPath="/">
        <PageHeader
          eyebrow="Dashboard"
          title="Learning dashboard"
          description="Real course, enrollment, and progress data from the active organization."
          actions={
            <ButtonLink href="/courses">
              Browse catalog
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
          }
        />

        {coursesQuery.loading || enrollmentsQuery.loading ? (
          <LoadingState title="Loading dashboard" />
        ) : coursesQuery.error || enrollmentsQuery.error ? (
          <ApiErrorState
            error={coursesQuery.error ?? enrollmentsQuery.error}
            fallbackTitle="Could not load dashboard"
            fallbackDescription="The dashboard request failed."
          />
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-4">
              <StatCard
                icon={BookOpen}
                label="Published courses"
                value={String(publishedCourses.length)}
              />
              <StatCard
                icon={GraduationCap}
                label="Active enrollments"
                value={String(enrollments.length)}
              />
              <StatCard
                icon={CheckCircle2}
                label="Average progress"
                value={`${averageProgress}%`}
              />
              <StatCard
                icon={Clock}
                label="Catalog minutes"
                value={`${courses.reduce(
                  (sum, course) => sum + (course.durationMinutes || 0),
                  0,
                )}m`}
              />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              {continueEnrollment ? (
                <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Continue learning
                      </p>
                      <h2 className="mt-1 text-lg font-semibold">
                        {continueEnrollment.course.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {continueEnrollment.course.description ||
                          continueEnrollment.course.subtitle ||
                          "Resume your course from the learning workspace."}
                      </p>
                    </div>
                    <GraduationCap
                      aria-hidden="true"
                      className="h-5 w-5 text-primary"
                    />
                  </div>
                  <div className="mt-5">
                    <Meter value={continueEnrollment.progressPercent} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {Math.round(continueEnrollment.progressPercent)}% complete
                    </p>
                  </div>
                  <ButtonLink
                    className="mt-5"
                    href={`/learn/courses/${continueEnrollment.course.id}`}
                  >
                    Resume
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </ButtonLink>
                </article>
              ) : (
                <EmptyState
                  title="No active enrollments"
                  description="Enroll in a published course to start learning."
                  action={
                    <ButtonLink href="/courses" variant="secondary">
                      Browse courses
                    </ButtonLink>
                  }
                />
              )}

              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <p className="text-sm font-medium text-muted-foreground">
                  Organization context
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Tenant-scoped data
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Requests use the active organization header and backend RBAC
                  checks from the saved session.
                </p>
              </article>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-3">
              {enrollments.length > 0 ? (
                enrollments
                  .slice(0, 3)
                  .map((enrollment) => (
                    <CourseProgressCard
                      key={enrollment.id}
                      enrollment={enrollment}
                    />
                  ))
              ) : (
                <EmptyState
                  className="xl:col-span-3"
                  title="No enrolled courses"
                  description="Your enrolled courses will appear here after enrollment."
                />
              )}
            </section>

            <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Course catalog
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Published courses
                  </h2>
                </div>
                <ButtonLink href="/courses" variant="secondary">
                  View all
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </ButtonLink>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {publishedCourses.length > 0 ? (
                  publishedCourses
                    .slice(0, 3)
                    .map((course) => <CourseCard key={course.id} course={course} />)
                ) : (
                  <EmptyState
                    className="lg:col-span-3"
                    title="No published courses"
                    description="Published courses will appear here after instructors publish them."
                  />
                )}
              </div>
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
