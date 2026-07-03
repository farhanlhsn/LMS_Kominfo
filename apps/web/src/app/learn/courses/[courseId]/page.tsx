"use client";

import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import {
  ActivityRenderer,
  findLessonByActivityId,
  firstLesson,
  LearningWorkspaceShell,
  Meter,
} from "../../../../components/lms/courses";
import { ButtonLink, PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../components/ui/states";
import { useLearningCourse } from "../../../../lib/api-hooks";

export default function LearnCoursePage() {
  const params = useParams<{ courseId: string }>();
  const query = useLearningCourse(params.courseId);
  const data = query.data;
  const course = data?.curriculum ?? null;
  const lastActivityLesson = findLessonByActivityId(
    course,
    data?.enrollment.lastActivityId ?? null,
  );
  const activeLesson = lastActivityLesson ?? firstLesson(course);
  const activeActivity =
    activeLesson?.activities.find(
      (activity) => activity.id === data?.enrollment.lastActivityId,
    ) ?? activeLesson?.activities[0];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        {query.loading ? (
          <LoadingState title="Loading learning workspace" />
        ) : query.error || !data || !course ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load learning workspace"
            fallbackDescription="Course enrollment was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "My Learning", href: "/my-learning" },
                { label: course.title },
              ]}
              eyebrow="Learning workspace"
              title={course.title}
              description="Course progress and curriculum are loaded from the learning API."
            />

            <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Course progress
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{course.title}</h2>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {Math.round(data.progress.progressPercent)}%
                </span>
              </div>
              <div className="mt-5">
                <Meter value={data.progress.progressPercent} />
              </div>
            </section>

            {activeLesson ? (
              <LearningWorkspaceShell course={course} activeLesson={activeLesson}>
                <ActivityRenderer activity={activeActivity} />
                <ButtonLink
                  className="mt-5"
                  href={`/learn/lessons/${activeLesson.id}`}
                >
                  {lastActivityLesson ? "Resume lesson" : "Open lesson"}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </ButtonLink>
              </LearningWorkspaceShell>
            ) : (
              <EmptyState
                title="No lesson available"
                description="Published lessons will appear here when the course is ready."
              />
            )}
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
