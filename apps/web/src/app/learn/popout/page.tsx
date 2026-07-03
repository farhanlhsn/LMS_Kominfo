"use client";

import { useSearchParams } from "next/navigation";
import { AuthGate } from "../../../components/auth/auth-gate";
import {
  PopoutPanelRenderer,
  PopoutSyncProvider,
  PopoutWindowShell,
} from "../../../components/learning-workspace/workspace";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useLesson } from "../../../lib/api-hooks";
import type { WorkspacePanelMode } from "../../../lib/lms-types";

const allowedPanels: WorkspacePanelMode[] = [
  "notes",
  "transcript",
  "resources",
  "ai",
  "bookmarks",
  "activity_info",
];

export default function LearningPopoutPage() {
  const params = useSearchParams();
  const lessonId = params.get("lessonId");
  const activityId = params.get("activityId");
  const panelParam = params.get("panel") as WorkspacePanelMode | null;
  const panel = panelParam && allowedPanels.includes(panelParam)
    ? panelParam
    : "notes";
  const lessonQuery = useLesson(lessonId);
  const lesson = lessonQuery.data;
  const activity =
    lesson?.activities.find((candidate) => candidate.id === activityId) ?? null;

  return (
    <AuthGate>
      <PopoutSyncProvider>
        <PopoutWindowShell>
          {lessonQuery.loading ? (
            <LoadingState title="Loading panel" />
          ) : lessonQuery.error || !lesson ? (
            <ApiErrorState
              error={lessonQuery.error}
              fallbackTitle="Could not load popout panel"
            />
          ) : !activity || !lesson.course ? (
            <EmptyState
              title="Panel context missing"
              description="Open this panel from the learning workspace."
            />
          ) : (
            <PopoutPanelRenderer
              activity={activity}
              course={lesson.course}
              lesson={lesson}
              panel={panel}
            />
          )}
        </PopoutWindowShell>
      </PopoutSyncProvider>
    </AuthGate>
  );
}
