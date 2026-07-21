"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isPracticeLabActivity,
  PluginActivityRenderer,
} from "../plugins/plugin-activity";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import type { useActivityContent } from "../../lib/api-hooks";
import type { Activity, VideoCaptionTrack } from "../../lib/lms-types";
import { isVideoActivity } from "./workspace-config";

export function ActivityMainPanel({
  activity,
  contentState,
  videoTracks,
  onVideoProgress,
  onCompleteActivity,
  onNextActivity,
  onRequestPictureInPicture,
  actionMessage,
  localMessage,
  isCompleted,
  nextActivity,
}: {
  activity: Activity | null;
  contentState: ReturnType<typeof useActivityContent>;
  videoTracks: VideoCaptionTrack[];
  onVideoProgress: (currentTime: number, duration: number) => void;
  onRequestPictureInPicture: () => void;
  onCompleteActivity: () => Promise<void>;
  onNextActivity: () => void;
  actionMessage?: string | null;
  localMessage?: string | null;
  isCompleted: boolean;
  nextActivity: Activity | null;
}) {
  const message = localMessage ?? actionMessage;
  const [labLaunched, setLabLaunched] = useState(false);
  const practiceLab = contentState.data
    ? isPracticeLabActivity(contentState.data)
    : false;

  useEffect(() => {
    setLabLaunched(false);
  }, [activity?.id]);

  return (
    <main className="min-w-0 min-h-0 overflow-auto bg-muted/30 p-3 sm:p-4 lg:p-6">
      {!activity ? (
        <EmptyState
          title="No activity selected"
          description="Choose an activity from the curriculum."
        />
      ) : contentState.loading ? (
        <LoadingState title="Loading activity content" />
      ) : contentState.error || !contentState.data ? (
        <ApiErrorState
          error={contentState.error}
          fallbackTitle="Could not load activity content"
        />
      ) : (
        <>
          <div className="w-full">
            <PluginActivityRenderer
              onLabLaunchStateChange={setLabLaunched}
              onRequestPictureInPicture={onRequestPictureInPicture}
              onVideoProgress={onVideoProgress}
              response={contentState.data}
              videoTracks={videoTracks}
            />
          </div>
          {!practiceLab || labLaunched ? (
            <div className="mt-5 flex w-full flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {isCompleted ? "Section complete" : "Ready when you are"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {message ??
                    (isVideoActivity(activity)
                      ? "Video activities auto-complete after 80% watched."
                      : "Mark this section complete when you finish it.")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isCompleted ? (
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={() => void onCompleteActivity()}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Mark complete
                  </button>
                ) : null}
                {isCompleted && nextActivity ? (
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={onNextActivity}
                    type="button"
                  >
                    <PlayCircle aria-hidden="true" className="h-4 w-4" />
                    Next section
                  </button>
                ) : null}
                {isCompleted && !nextActivity ? (
                  <span className="inline-flex min-h-10 items-center rounded-md border border-success/30 bg-success/10 px-3 text-sm font-semibold text-success">
                    Course complete
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
