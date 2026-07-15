"use client";

import { X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isPracticeLabActivity } from "../plugins/plugin-activity";
import {
  useActivityContent,
  useCaptionTracks,
  useLessonWorkspaceState,
  useUpdateLessonWorkspaceState,
  useUpdateVideoProgress,
  useUpdateWorkspacePreferences,
  useWorkspaceContext,
  useWorkspacePreferences,
} from "../../lib/api-hooks";
import type {
  Activity,
  Course,
  Lesson,
  WorkspaceLayoutMode,
  WorkspacePanelMode,
} from "../../lib/lms-types";
import { ActivityMainPanel } from "./activity-main-panel";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LearningTopbar } from "./learning-chrome";
import { LearningRightPanel } from "./learning-right-panel";
import { MobileWorkspaceDock } from "./mobile-workspace-dock";
import {
  clampRightPanelWidth,
  CURRICULUM_SIDEBAR_WIDTH,
  panelTabs,
  RIGHT_PANEL_DEFAULT_WIDTH,
  RIGHT_PANEL_STORAGE_KEY,
  visiblePanelsForActivity,
} from "./workspace-config";

export {
  advancedWorkspaceLayouts,
  clampRightPanelWidth,
  primaryWorkspaceLayouts,
  visiblePanelsForActivity,
  workspaceLayouts,
} from "./workspace-config";
export { CurriculumSidebar } from "./curriculum-sidebar";
export { ActivityMainPanel } from "./activity-main-panel";
export {
  FocusModeToggle,
  LearningTopbar,
  TheatreModeToggle,
} from "./learning-chrome";
export {
  LearningRightPanel,
  PluginWorkspacePanelRegistry,
  PluginWorkspacePanelRenderer,
  PopoutPanelRenderer,
  PopoutWindowShell,
  UnknownWorkspacePanelFallback,
  WorkspacePanelContainer,
  WorkspacePanelTabs,
} from "./learning-right-panel";
export { NotesPanel } from "./panels/notes-panel";
export { BookmarksPanel } from "./panels/bookmarks-panel";
export { FlashcardsPanel } from "./panels/flashcards-panel";
export { TranscriptPanel } from "./panels/transcript-panel";
export { ResourcesPanel } from "./panels/resources-panel";
export { DiscussionPanel } from "./panels/discussion-panel";
export {
  TimestampNoteButton,
  TimestampBookmarkButton,
} from "./panels/panel-shared";
export { PopoutPanelButton } from "./workspace-popout";

function flattenCourseActivities(course: Course) {
  return (course.modules ?? []).flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      lesson.activities.map((activity) => ({
        activity,
        lesson,
        module,
      })),
    ),
  );
}

type LearningWorkspaceProps = {
  course: Course;
  lesson: Lesson;
  selectedActivity: Activity | null;
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
  onCompleteActivity: () => Promise<void>;
  actionMessage?: string | null;
};

export function LearningWorkspace({
  course,
  lesson,
  selectedActivity,
  selectedActivityId,
  onSelectActivity,
  onCompleteActivity,
  actionMessage,
}: LearningWorkspaceProps) {
  const preferences = useWorkspacePreferences();
  const updatePreferences = useUpdateWorkspacePreferences();
  const workspaceState = useLessonWorkspaceState({
    courseId: course.id,
    lessonId: lesson.id,
    activityId: selectedActivityId,
  });
  const updateWorkspaceState = useUpdateLessonWorkspaceState();
  const activityContent = useActivityContent(selectedActivityId);
  const workspaceContext = useWorkspaceContext(selectedActivityId);
  const captionTracks = useCaptionTracks(
    selectedActivity?.activityTypeKey === "core.video"
      ? selectedActivityId
      : null,
  );
  const policy = workspaceContext.data?.assessmentDisplayPolicy;
  const [layout, setLayout] = useState<WorkspaceLayoutMode>("standard");
  const [rightPanel, setRightPanel] = useState<WorkspacePanelMode>("notes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [locallyCompletedIds, setLocallyCompletedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [lastVideoProgressSent, setLastVideoProgressSent] = useState<
    Record<string, number>
  >({});
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"half" | "full">(
    "half",
  );
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === "undefined") return RIGHT_PANEL_DEFAULT_WIDTH;
    const stored = Number(window.localStorage.getItem(RIGHT_PANEL_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : RIGHT_PANEL_DEFAULT_WIDTH;
  });
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const mobileSheetDragStartRef = useRef<number | null>(null);
  const mobileSheetDidDragRef = useRef(false);
  const mobileSheetDragOffsetRef = useRef(0);
  const updateVideoProgress = useUpdateVideoProgress();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsCompactViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const clamp = () =>
      setRightPanelWidth((current) =>
        clampRightPanelWidth({
          width: current,
          viewportWidth: window.innerWidth,
          sidebarCollapsed,
          compact: isCompactViewport,
        }),
      );
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [isCompactViewport, sidebarCollapsed]);

  useEffect(() => {
    if (isCompactViewport) return;
    window.localStorage.setItem(
      RIGHT_PANEL_STORAGE_KEY,
      String(rightPanelWidth),
    );
  }, [isCompactViewport, rightPanelWidth]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (!resizeStartRef.current) return;
      const delta = event.clientX - resizeStartRef.current.x;
      const nextWidth = resizeStartRef.current.width - delta;
      setRightPanelWidth(
        clampRightPanelWidth({
          width: nextWidth,
          viewportWidth: window.innerWidth,
          sidebarCollapsed,
          compact: isCompactViewport,
        }),
      );
    }

    function onPointerUp() {
      resizeStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isCompactViewport, sidebarCollapsed]);

  useEffect(() => {
    const preferred = preferences.data?.preferredLayout ?? "standard";
    const stateLayout = workspaceState.data?.layout;
    const nextLayout = policy?.requireFocusMode
      ? "focus"
      : (stateLayout ?? preferred);
    setLayout(nextLayout);
    setRightPanel(
      workspaceState.data?.rightPanelMode ??
        preferences.data?.rightPanelMode ??
        "notes",
    );
    setSidebarCollapsed(isCompactViewport);
    const defaultRightCollapsed =
      nextLayout === "standard" || nextLayout === "focus";
    setRightCollapsed(
      isCompactViewport
        ? true
        : (workspaceState.data?.rightPanelCollapsed ??
          preferences.data?.rightPanelCollapsed ??
          defaultRightCollapsed),
    );
    setVideoTime(workspaceState.data?.lastVideoTimeSeconds ?? 0);
  }, [
    isCompactViewport,
    preferences.data,
    policy?.requireFocusMode,
    workspaceState.data,
  ]);

  useEffect(() => {
    if (!selectedActivityId) return;
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("lms-workspace-sync")
        : null;
    channel?.postMessage({
      type: "workspace.activity",
      courseId: course.id,
      lessonId: lesson.id,
      activityId: selectedActivityId,
      panel: rightPanel,
      videoTime,
    });
    return () => channel?.close();
  }, [course.id, lesson.id, rightPanel, selectedActivityId, videoTime]);

  async function persistState(patch: Record<string, unknown>) {
    if (!selectedActivityId) return;
    await updateWorkspaceState({
      courseId: course.id,
      lessonId: lesson.id,
      activityId: selectedActivityId,
      layout,
      rightPanelMode: rightPanel,
      rightPanelCollapsed: rightCollapsed,
      lastVideoTimeSeconds: videoTime,
      ...patch,
    }).catch(() => undefined);
  }

  const rawAvailablePanels = useMemo(
    () =>
      new Set(
        workspaceContext.data?.availablePanels ?? panelTabs.map((p) => p.value),
      ),
    [workspaceContext.data?.availablePanels],
  );
  const availablePanels = useMemo(
    () =>
      visiblePanelsForActivity(selectedActivity, rawAvailablePanels, policy),
    [policy, rawAvailablePanels, selectedActivity],
  );
  const practiceLabActivity = activityContent.data
    ? isPracticeLabActivity(activityContent.data)
    : false;
  const disabledPanels = useMemo(
    () =>
      practiceLabActivity
        ? new Set<WorkspacePanelMode>(["ai"])
        : new Set<WorkspacePanelMode>(),
    [practiceLabActivity],
  );

  useEffect(() => {
    if (availablePanels.has(rightPanel) && !disabledPanels.has(rightPanel))
      return;
    const nextPanel = Array.from(availablePanels).find(
      (panel) => !disabledPanels.has(panel),
    );
    if (nextPanel) setRightPanel(nextPanel);
  }, [availablePanels, disabledPanels, rightPanel]);

  async function changePanel(next: WorkspacePanelMode) {
    if (disabledPanels.has(next)) return;
    setRightPanel(next);
    setRightCollapsed(false);
    if (isCompactViewport) {
      setMobileSheetState("half");
      setMobileSheetDragOffset(0);
      mobileSheetDragOffsetRef.current = 0;
      return;
    }
    await updatePreferences({ rightPanelMode: next }).catch(() => undefined);
    await persistState({ rightPanelMode: next, rightPanelCollapsed: false });
  }

  function closeMobilePanel() {
    setRightCollapsed(true);
    setMobileSheetState("half");
    setMobileSheetDragOffset(0);
    mobileSheetDragOffsetRef.current = 0;
  }

  function startMobileSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    mobileSheetDragStartRef.current = event.clientY;
    mobileSheetDidDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMobileSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (mobileSheetDragStartRef.current === null) return;
    const delta = event.clientY - mobileSheetDragStartRef.current;
    if (Math.abs(delta) > 5) mobileSheetDidDragRef.current = true;
    const nextOffset = Math.max(-360, Math.min(360, delta));
    mobileSheetDragOffsetRef.current = nextOffset;
    setMobileSheetDragOffset(nextOffset);
  }

  function finishMobileSheetDrag() {
    const delta = mobileSheetDragOffsetRef.current;
    mobileSheetDragStartRef.current = null;
    mobileSheetDragOffsetRef.current = 0;
    setMobileSheetDragOffset(0);

    if (delta < -56) {
      setMobileSheetState("full");
      return;
    }
    if (delta > 96 && mobileSheetState === "half") {
      closeMobilePanel();
      return;
    }
    if (delta > 56) setMobileSheetState("half");
  }

  async function completeCurrentActivity() {
    if (selectedActivityId) {
      setLocallyCompletedIds((current) =>
        new Set(current).add(selectedActivityId),
      );
    }
    await onCompleteActivity();
  }

  function onVideoProgress(currentTime: number, duration: number) {
    if (!selectedActivityId || duration <= 0) return;
    setVideoTime(currentTime);
    if (Math.round(currentTime) % 5 === 0) {
      void persistState({ lastVideoTimeSeconds: currentTime });
    }
    const watchedPercent = Math.round((currentTime / duration) * 100);
    const previousSent = lastVideoProgressSent[selectedActivityId] ?? -1;
    const shouldSendProgress =
      (watchedPercent >= 80 && previousSent < 80) ||
      watchedPercent >= previousSent + 10 ||
      (watchedPercent === 100 && previousSent < 100);
    if (shouldSendProgress) {
      setLastVideoProgressSent((current) => ({
        ...current,
        [selectedActivityId]: watchedPercent,
      }));
      void updateVideoProgress(
        selectedActivityId,
        currentTime,
        duration,
        watchedPercent,
      )
        .then(async (progress) => {
          if (
            progress?.status === "COMPLETED" &&
            !locallyCompletedIds.has(selectedActivityId)
          ) {
            setLocallyCompletedIds((current) =>
              new Set(current).add(selectedActivityId),
            );
            setLocalMessage(
              "Video completed automatically after 80% watched.",
            );
          }
        })
        .catch(() => undefined);
    }
  }

  const progressByActivityId = useMemo(() => {
    const map = new Map<string, Activity["progress"]>();
    for (const item of flattenCourseActivities(course)) {
      map.set(item.activity.id, item.activity.progress);
    }
    for (const activity of lesson.activities) {
      map.set(activity.id, activity.progress);
    }
    return map;
  }, [course, lesson.activities]);
  const completedActivityIds = useMemo(() => {
    const ids = new Set(locallyCompletedIds);
    for (const [activityId, progress] of progressByActivityId.entries()) {
      if (progress?.[0]?.status === "COMPLETED") ids.add(activityId);
    }
    return ids;
  }, [locallyCompletedIds, progressByActivityId]);
  const orderedActivities = useMemo(
    () => flattenCourseActivities(course),
    [course],
  );
  const selectedActivityIndex = orderedActivities.findIndex(
    (item) => item.activity.id === selectedActivityId,
  );
  const nextActivity =
    selectedActivityIndex >= 0
      ? (orderedActivities[selectedActivityIndex + 1]?.activity ?? null)
      : null;
  const selectedCompleted = selectedActivityId
    ? completedActivityIds.has(selectedActivityId)
    : false;
  const isTheatre =
    layout === "theatre" || layout === "picture_in_picture_video";
  const isFocus = layout === "focus";
  const showRightPanel =
    !rightCollapsed && !isFocus && availablePanels.size > 0;
  const shellClass = [
    "flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border bg-background shadow-subtle",
    isTheatre ? "bg-foreground text-background" : "",
  ].join(" ");
  return (
    <section className={shellClass}>
      <LearningTopbar
        activity={selectedActivity}
        hasPanels={availablePanels.size > 0}
        onToggleRight={() => {
          const next = !rightCollapsed;
          setRightCollapsed(next);
          void updatePreferences({ rightPanelCollapsed: next });
          void persistState({ rightPanelCollapsed: next });
        }}
        onToggleSidebar={() => {
          const next = !sidebarCollapsed;
          setSidebarCollapsed(next);
        }}
      />
      <div
        className={`min-h-0 flex-1 overflow-hidden bg-muted/30 ${isCompactViewport ? "flex flex-col" : "flex flex-row"}`}
      >
        {!sidebarCollapsed && !isFocus ? (
          <div
            className="flex flex-col shrink-0 border-r border-border bg-card"
            style={{ width: CURRICULUM_SIDEBAR_WIDTH }}
          >
            <CurriculumSidebar
              course={course}
              completedActivityIds={completedActivityIds}
              selectedActivityId={selectedActivityId}
              onSelectActivity={onSelectActivity}
            />
          </div>
        ) : null}
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-muted/30">
          <div
            className={`flex h-full w-full min-w-0 min-h-0 ${isCompactViewport ? "flex-col" : "flex-row"}`}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ActivityMainPanel
                actionMessage={actionMessage}
                activity={selectedActivity}
                contentState={activityContent}
                isCompleted={selectedCompleted}
                localMessage={localMessage}
                nextActivity={nextActivity}
                onRequestPictureInPicture={requestPictureInPicture}
                onCompleteActivity={completeCurrentActivity}
                onNextActivity={() => {
                  if (!nextActivity) return;
                  setLocalMessage(null);
                  onSelectActivity(nextActivity.id);
                }}
                onVideoProgress={onVideoProgress}
                videoTracks={captionTracks.data ?? []}
              />
            </div>
            {showRightPanel && !isCompactViewport ? (
              <>
                <button
                  aria-label="Resize learning panel"
                  className={[
                    "shrink-0 bg-border transition-colors hover:bg-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
                    "h-full w-1.5 cursor-col-resize",
                  ].join(" ")}
                  onPointerDown={(event) => {
                    resizeStartRef.current = {
                      x: event.clientX,
                      width: rightPanelWidth,
                    };
                    document.body.style.cursor = "col-resize";
                    document.body.style.userSelect = "none";
                  }}
                  title="Drag to resize learning panel"
                  type="button"
                />
                <div
                  className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden"
                  style={{ width: rightPanelWidth }}
                >
                  <LearningRightPanel
                    activity={selectedActivity}
                    disabledPanels={disabledPanels}
                    course={course}
                    lesson={lesson}
                    panel={rightPanel}
                    availablePanels={availablePanels}
                    onPanelChange={changePanel}
                    policy={policy}
                    videoTime={videoTime}
                  />
                </div>
              </>
            ) : null}
          </div>
          {isCompactViewport && !isFocus ? (
            <>
              {showRightPanel ? (
                <div
                  className={[
                    "fixed inset-x-0 z-[70] flex min-h-0 flex-col overflow-hidden border border-border bg-card shadow-xl transition-[height] duration-200",
                    mobileSheetState === "full"
                      ? "bottom-0 rounded-none"
                      : "bottom-0 rounded-t-lg",
                  ].join(" ")}
                  style={{
                    height:
                      mobileSheetState === "full"
                        ? `calc(100dvh - ${mobileSheetDragOffset}px)`
                        : `calc(48dvh - ${mobileSheetDragOffset}px)`,
                  }}
                >
                  <button
                    aria-label={
                      mobileSheetState === "full"
                        ? "Collapse panel"
                        : "Expand panel"
                    }
                    className="flex h-7 w-full shrink-0 touch-none cursor-ns-resize items-center justify-center"
                    onClick={() => {
                      if (mobileSheetDidDragRef.current) {
                        mobileSheetDidDragRef.current = false;
                        return;
                      }
                      setMobileSheetState((current) =>
                        current === "full" ? "half" : "full",
                      );
                    }}
                    onPointerCancel={finishMobileSheetDrag}
                    onPointerDown={startMobileSheetDrag}
                    onPointerMove={moveMobileSheetDrag}
                    onPointerUp={finishMobileSheetDrag}
                    type="button"
                  >
                    <span className="h-1 w-10 rounded-full bg-border" />
                  </button>
                  <div className="absolute right-2 top-1 z-10">
                    <button
                      aria-label="Close learning panel"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={closeMobilePanel}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  <LearningRightPanel
                    activity={selectedActivity}
                    course={course}
                    disabledPanels={disabledPanels}
                    hideTabs
                    lesson={lesson}
                    panel={rightPanel}
                    availablePanels={availablePanels}
                    onPanelChange={changePanel}
                    policy={policy}
                    videoTime={videoTime}
                  />
                </div>
              ) : null}
              <MobileWorkspaceDock
                availablePanels={availablePanels}
                disabledPanels={disabledPanels}
                onPanelChange={changePanel}
                value={showRightPanel ? rightPanel : null}
              />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PopoutSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("lms-workspace-sync");
    channel.onmessage = (event) => {
      window.localStorage.setItem(
        "lms.workspace.lastSync",
        JSON.stringify(event.data),
      );
    };
    return () => channel.close();
  }, []);
  return <>{children}</>;
}

export function WorkspaceKeyboardShortcuts({
  onToggleSidebar,
  onToggleRight,
  onFocus,
  onNotes,
  onTranscript,
}: {
  onToggleSidebar: () => void;
  onToggleRight: () => void;
  onFocus: () => void;
  onNotes: () => void;
  onTranscript: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.altKey) return;
      if (event.key === "s") onToggleSidebar();
      if (event.key === "p") onToggleRight();
      if (event.key === "f") onFocus();
      if (event.key === "n") onNotes();
      if (event.key === "t") onTranscript();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFocus, onNotes, onToggleRight, onToggleSidebar, onTranscript]);
  return null;
}

function requestPictureInPicture() {
  const video = document.querySelector("video") as
    | (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
    | null;
  if (video?.requestPictureInPicture) {
    void video.requestPictureInPicture().catch(() => undefined);
  }
}
