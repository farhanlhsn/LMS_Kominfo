"use client";

import { useParams } from "next/navigation";
import { ArrowRight, Award, BookOpen, Clock, Star, Users } from "lucide-react";
import { useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import {
  ActivityList,
  CourseStatusBadge,
  firstLesson,
  lessonCount,
} from "../../../components/lms/courses";
import { ButtonLink, PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  useCourseCurriculum,
  useCourseDetail,
  useEnrollCourse,
} from "../../../lib/api-hooks";

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

export default function CourseDetailPage() {
  const params = useParams<{ slugOrId: string }>();
  const slugOrId = params.slugOrId;
  const detailQuery = useCourseDetail(slugOrId);
  const courseId = detailQuery.data?.id ?? null;
  const curriculumQuery = useCourseCurriculum(courseId);
  const enrollCourse = useEnrollCourse();
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const course = curriculumQuery.data ?? detailQuery.data;
  const firstPublishedLesson = firstLesson(course);
  const instructor =
    course?.instructors?.[0]?.user?.name ??
    course?.instructors?.[0]?.user?.email ??
    "Instructor";

  async function enroll() {
    if (!course) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await enrollCourse(course.id);
      window.location.href = `/learn/courses/${course.id}`;
    } catch (error) {
      setEnrollError(error instanceof Error ? error.message : String(error));
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/courses">
        {detailQuery.loading ? (
          <LoadingState title="Loading course" />
        ) : detailQuery.error || !course ? (
          <ApiErrorState
            error={detailQuery.error}
            fallbackTitle="Could not load course"
            fallbackDescription="Course was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Courses", href: "/courses" },
                { label: course.title },
              ]}
              eyebrow={course.category?.name ?? "Course"}
              title={course.title}
              description={course.description ?? course.subtitle ?? undefined}
              actions={<CourseStatusBadge status={course.status} />}
            />

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-border bg-muted">
                  <BookOpen aria-hidden="true" className="h-16 w-16 text-primary" />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={BookOpen}
                    label="Lessons"
                    value={`${lessonCount(course)}`}
                  />
                  <StatCard
                    icon={Clock}
                    label="Duration"
                    value={`${course.durationMinutes ?? 0}m`}
                  />
                  <StatCard
                    icon={Users}
                    label="Learners"
                    value={`${course._count?.enrollments ?? 0}`}
                  />
                  <StatCard icon={Award} label="Certificate" value="Future" />
                </div>
                <button
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={enrolling || course.status !== "PUBLISHED"}
                  onClick={enroll}
                  type="button"
                >
                  {enrolling ? "Enrolling" : "Enroll and start"}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                {firstPublishedLesson ? (
                  <ButtonLink
                    className="ml-0 mt-3 sm:ml-3 sm:mt-5"
                    href={`/learn/lessons/${firstPublishedLesson.id}`}
                    variant="secondary"
                  >
                    Open first lesson
                  </ButtonLink>
                ) : null}
                {enrollError ? (
                  <p className="mt-3 text-sm text-destructive">{enrollError}</p>
                ) : null}
              </article>

              <aside className="space-y-4">
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <p className="text-sm font-medium text-muted-foreground">
                    Instructor
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{instructor}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Instructor data is scoped by the active organization.
                  </p>
                </article>
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <div className="flex items-center gap-2">
                    <Star aria-hidden="true" className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold">Rating and reviews</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Reviews are not available yet.
                  </p>
                </article>
              </aside>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-3">
              {[
                [
                  "Objectives",
                  stringList(course.learningObjectives, [
                    "Understand the course concepts and complete activities.",
                  ]),
                ],
                [
                  "Requirements",
                  stringList(course.requirements, [
                    "An active account and time to practice.",
                  ]),
                ],
                [
                  "Target audience",
                  stringList(course.targetAudience, [
                    "Learners in the active organization.",
                  ]),
                ],
              ].map(([title, items]) => (
                <article
                  key={String(title)}
                  className="rounded-lg border border-border bg-card p-5 shadow-subtle"
                >
                  <h2 className="text-base font-semibold">{String(title)}</h2>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {(items as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <p className="text-sm font-medium text-muted-foreground">
                Curriculum
              </p>
              <h2 className="mt-1 text-lg font-semibold">Preview</h2>
              <div className="mt-5 space-y-4">
                {curriculumQuery.loading ? (
                  <LoadingState title="Loading curriculum" />
                ) : course.modules?.length ? (
                  course.modules.flatMap((module) =>
                    module.lessons.map((lesson, index) => (
                      <article
                        key={lesson.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {module.title} / Lesson {index + 1}
                        </p>
                        <h3 className="mt-2 text-base font-semibold">
                          {lesson.title}
                        </h3>
                        <ActivityList lesson={lesson} />
                      </article>
                    )),
                  )
                ) : (
                  <EmptyState
                    title="No curriculum published"
                    description="Published lessons will appear here when available."
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
