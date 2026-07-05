"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { findResumeActivity } from "../../../../components/lms/courses";
import { LearningWorkspace } from "../../../../components/learning-workspace/workspace";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import {
  useCompleteActivity,
  useLearningCourse,
  useLesson,
  useStartActivity,
} from "../../../../lib/api-hooks";

export default function LearnLessonPage() {
  const params = useParams<{ lessonId: string }>();
  const searchParams = useSearchParams();
  const requestedActivityId = searchParams.get("activity");
  const lessonQuery = useLesson(params.lessonId);
  const lesson = lessonQuery.data;
  const courseQuery = useLearningCourse(lesson?.courseId ?? null);
  const lastActivityId = courseQuery.data?.enrollment.lastActivityId ?? null;
  const course = courseQuery.data?.curriculum ?? lesson?.course ?? null;
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const startActivity = useStartActivity();
  const completeActivity = useCompleteActivity();

  function selectActivity(activityId: string) {
    setActionMessage(null);
    setSelectedActivityId(activityId);
  }

  // The curriculum sidebar lists every activity in the course (across all
  // lessons), so selection must be resolved course-wide rather than limited to
  // the lesson referenced by the route param. Otherwise selecting an activity
  // from another lesson (e.g. the "Learning Resources" link/file activities)
  // would fail the guard below and bounce back to the first activity.
  const courseActivities = useMemo(
    () =>
      (course?.modules ?? []).flatMap((module) =>
        module.lessons.flatMap((lessonItem) => lessonItem.activities),
      ),
    [course],
  );

  const allActivities = courseActivities.length
    ? courseActivities
    : lesson?.activities ?? [];

  useEffect(() => {
    // Keep a valid, user-driven selection untouched.
    if (
      selectedActivityId &&
      allActivities.some((activity) => activity.id === selectedActivityId)
    ) {
      return;
    }
    // Wait for the course curriculum before auto-selecting so the resume target
    // is computed from full completion progress. Selecting prematurely would
    // land on (and auto-start) the first activity, overwriting resume progress.
    if (courseQuery.loading) {
      return;
    }
    if (!allActivities.length) {
      return;
    }
    const requestedActivity =
      requestedActivityId &&
      allActivities.find((activity) => activity.id === requestedActivityId);
    const resumeActivity =
      requestedActivity ||
      findResumeActivity(course, lastActivityId) ||
      lesson?.activities[0] ||
      allActivities[0] ||
      null;
    if (resumeActivity) {
      setSelectedActivityId(resumeActivity.id);
    }
  }, [
    allActivities,
    course,
    courseQuery.loading,
    lastActivityId,
    lesson,
    requestedActivityId,
    selectedActivityId,
  ]);

  useEffect(() => {
    if (!selectedActivityId) return;
    void startActivity(selectedActivityId).catch(() => undefined);
  }, [selectedActivityId, startActivity]);

  const selectedActivity = useMemo(
    () =>
      allActivities.find((activity) => activity.id === selectedActivityId) ??
      null,
    [allActivities, selectedActivityId],
  );

  // Resolve the lesson that actually owns the selected activity so workspace
  // context (notes, resources, saved state) is scoped correctly even when the
  // learner jumps to an activity in a different lesson.
  const activeLesson = useMemo(() => {
    if (course && selectedActivityId) {
      for (const module of course.modules ?? []) {
        for (const lessonItem of module.lessons) {
          if (
            lessonItem.activities.some(
              (activity) => activity.id === selectedActivityId,
            )
          ) {
            return lessonItem;
          }
        }
      }
    }
    return lesson ?? null;
  }, [course, lesson, selectedActivityId]);

  async function completeSelectedActivity() {
    if (!selectedActivityId) return;
    setActionMessage(null);
    try {
      const result = await completeActivity(selectedActivityId);
      await Promise.all([lessonQuery.refresh(), courseQuery.refresh()]);
      setActionMessage(
        `Completed. Course progress: ${Math.round(
          result.courseProgress.progressPercent,
        )}%`,
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <AuthGate>
      <AppShell
        currentPath="/my-learning"
        immersive
        showBackButton
        backHref="/"
        backLabel="Back to dashboard"
        mainClassName="px-2 py-3 sm:px-4 lg:px-6"
      >
        {lessonQuery.loading ? (
          <LoadingState title="Loading lesson" />
        ) : lessonQuery.error || !lesson ? (
          <ApiErrorState
            error={lessonQuery.error}
            fallbackTitle="Could not load lesson"
            fallbackDescription="Lesson was not found."
          />
        ) : (
          <>
            {courseQuery.loading && !course ? (
              <LoadingState title="Loading curriculum" />
            ) : courseQuery.error || !course ? (
              <ApiErrorState
                error={courseQuery.error}
                fallbackTitle="Could not load course curriculum"
              />
            ) : (
              <LearningWorkspace
                lesson={activeLesson ?? lesson}
                course={course}
                selectedActivity={selectedActivity}
                selectedActivityId={selectedActivityId}
                onSelectActivity={selectActivity}
                onCompleteActivity={completeSelectedActivity}
                actionMessage={actionMessage}
              />
            )}
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
