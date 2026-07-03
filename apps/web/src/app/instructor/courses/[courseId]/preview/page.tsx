"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Award, BookOpen, Clock, Eye, Users } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import {
  ActivityList,
  CourseStatusBadge,
  courseMinutes,
  lessonCount,
} from "../../../../../components/lms/courses";
import { ButtonLink, PageHeader, StatCard } from "../../../../../components/ui/core";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../../../../components/ui/states";
import { useInstructorCourse } from "../../../../../lib/api-hooks";

function stringList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

export default function InstructorCoursePreviewPage() {
  const params = useParams<{ courseId: string }>();
  const query = useInstructorCourse(params.courseId);
  const course = query.data;
  const instructor =
    course?.instructors?.[0]?.user?.name ??
    course?.instructors?.[0]?.user?.email ??
    "Instructor";

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {query.loading ? (
          <LoadingState title="Loading preview" />
        ) : query.error || !course ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load preview"
            fallbackDescription="Course preview was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Instructor", href: "/instructor/courses" },
                {
                  label: course.title,
                  href: `/instructor/courses/${course.id}/builder`,
                },
                { label: "Preview" },
              ]}
              eyebrow="Instructor preview"
              title={course.title}
              description={course.description ?? course.subtitle ?? undefined}
              actions={
                <>
                  <CourseStatusBadge status={course.status} />
                  <ButtonLink
                    href={`/instructor/courses/${course.id}/builder`}
                    variant="secondary"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Builder
                  </ButtonLink>
                </>
              }
            />

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-border bg-muted">
                  <Eye aria-hidden="true" className="h-16 w-16 text-primary" />
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
                    value={`${courseMinutes(course)}m`}
                  />
                  <StatCard
                    icon={Users}
                    label="Learners"
                    value={`${course._count?.enrollments ?? 0}`}
                  />
                  <StatCard icon={Award} label="Certificate" value="Future" />
                </div>
              </article>

              <aside className="space-y-4">
                <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <p className="text-sm font-medium text-muted-foreground">
                    Instructor
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{instructor}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This preview uses instructor-scoped data, so drafts and
                    unpublished curriculum are visible here.
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
                {course.modules?.length ? (
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
                    title="No curriculum yet"
                    description="Add modules, lessons, and activities in the builder."
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
