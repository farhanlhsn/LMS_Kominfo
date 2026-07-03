"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { LearningWorkspace } from "../../../../components/learning-workspace/workspace";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import {
  useCompleteActivity,
  useLearningCourse,
  useLesson,
  useStartActivity,
} from "../../../../lib/api-hooks";

export default function LearnLessonPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonQuery = useLesson(params.lessonId);
  const lesson = lessonQuery.data;
  const courseQuery = useLearningCourse(lesson?.courseId ?? null);
  const course = courseQuery.data?.curriculum ?? lesson?.course ?? null;
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const startActivity = useStartActivity();
  const completeActivity = useCompleteActivity();

  useEffect(() => {
    if (!selectedActivityId && lesson?.activities[0]) {
      setSelectedActivityId(lesson.activities[0].id);
    }
  }, [lesson, selectedActivityId]);

  useEffect(() => {
    if (!selectedActivityId) return;
    void startActivity(selectedActivityId).catch(() => undefined);
  }, [selectedActivityId, startActivity]);

  const selectedActivity = useMemo(
    () =>
      lesson?.activities.find((activity) => activity.id === selectedActivityId) ??
      null,
    [lesson, selectedActivityId],
  );

  async function completeSelectedActivity() {
    if (!selectedActivityId) return;
    setActionMessage(null);
    try {
      const result = await completeActivity(selectedActivityId);
      await lessonQuery.reload();
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
      <AppShell currentPath="/my-learning">
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
            <PageHeader
              breadcrumbs={[
                { label: "My Learning", href: "/my-learning" },
                {
                  label: lesson.course?.title ?? "Course",
                  href: lesson.courseId ? `/learn/courses/${lesson.courseId}` : undefined,
                },
                { label: lesson.title },
              ]}
              eyebrow={lesson.course?.title ?? "Lesson"}
              title={lesson.title}
              description={
                lesson.summary ??
                "Lesson content, activity content, and learner progress are loaded from the API."
              }
            />

            {courseQuery.loading && !course ? (
              <LoadingState title="Loading curriculum" />
            ) : courseQuery.error || !course ? (
              <ApiErrorState
                error={courseQuery.error}
                fallbackTitle="Could not load course curriculum"
              />
            ) : (
              <LearningWorkspace
                lesson={lesson}
                course={course}
                selectedActivity={selectedActivity}
                selectedActivityId={selectedActivityId}
                onSelectActivity={setSelectedActivityId}
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
