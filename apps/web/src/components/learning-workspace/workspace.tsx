"use client";

import {
  Bot,
  BookOpen,
  Bookmark,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  FileText,
  ListChecks,
  PlayCircle,
  Maximize2,
  MessageSquare,
  MonitorUp,
  PanelRight,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Subtitles,
  ThumbsDown,
  ThumbsUp,
  X,
  CalendarDays,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  isPracticeLabActivity,
  PluginActivityRenderer,
} from "../plugins/plugin-activity";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import {
  useActivityContent,
  useAiStatus,
  useAskAiTutor,
  useCaptionTracks,
  useCreateLearnerBookmark,
  useCreateLearnerNote,
  useDeleteLearnerBookmark,
  useDeleteLearnerNote,
  useGenerateInstructorVideoQuiz,
  useGenerateInstructorVideoSummary,
  useInstructorAiGeneratedItems,
  useInstructorCaptionTracks,
  useLearnerBookmarks,
  useLearnerNotes,
  useLessonWorkspaceState,
  useTranscript,
  useCreateInstructorCaptionTrack,
  useDeleteInstructorCaptionTrack,
  useUpdateInstructorCaptionTrack,
  useUpdateLessonWorkspaceState,
  useUpdateVideoProgress,
  useUpdateWorkspacePreferences,
  useWorkspaceContext,
  useWorkspacePreferences,
} from "../../lib/api-hooks";
import { getSession, apiBaseUrl } from "../../lib/api-client";
import { WorkspaceDiscussionPanel, WorkspaceUpcomingPanel } from "../engagement/engagement";
import type {
  Activity,
  AiTutorResponse,
  Course,
  LearnerBookmark,
  LearnerNote,
  Lesson,
  TranscriptSegment,
  VideoCaptionTrack,
  WorkspaceLayoutMode,
  WorkspacePanelMode,
  AiGeneratedItem,
} from "../../lib/lms-types";

export const workspaceLayouts: Array<{
  value: WorkspaceLayoutMode;
  label: string;
}> = [
  { value: "standard", label: "Standard" },
  { value: "side_by_side", label: "Side by side" },
  { value: "focus", label: "Focus" },
  { value: "theatre", label: "Theatre" },
  { value: "split_video_transcript", label: "Video + transcript" },
  { value: "split_content_notes", label: "Content + notes" },
  { value: "split_content_ai", label: "Content + AI" },
  { value: "dual_window", label: "Dual window" },
  { value: "popout_panel", label: "Popout panel" },
  { value: "picture_in_picture_video", label: "Picture in picture" },
];

const panelTabs: Array<{
  value: WorkspacePanelMode;
  label: string;
  icon: typeof StickyNote;
}> = [
  { value: "notes", label: "Notes", icon: StickyNote },
  { value: "transcript", label: "Transcript", icon: Subtitles },
  { value: "resources", label: "Resources", icon: FileText },
  { value: "ai", label: "AI Tutor", icon: Bot },
  { value: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { value: "discussion", label: "Discussion", icon: MessageSquare },
  { value: "upcoming", label: "Upcoming", icon: CalendarDays },
];

const RIGHT_PANEL_STORAGE_KEY = "lms.workspace.rightPanelWidth";
const RIGHT_PANEL_DEFAULT_WIDTH = 560;
const RIGHT_PANEL_MIN_WIDTH = 360;
const RIGHT_PANEL_MAX_WIDTH = 920;
const MAIN_PANEL_MIN_WIDTH = 520;
const CURRICULUM_SIDEBAR_WIDTH = 280;

export function clampRightPanelWidth(input: {
  width: number;
  viewportWidth: number;
  sidebarCollapsed: boolean;
  compact: boolean;
}) {
  if (input.compact) return input.width;
  const sidebarWidth = input.sidebarCollapsed ? 0 : CURRICULUM_SIDEBAR_WIDTH;
  const availableWidth = Math.max(input.viewportWidth - sidebarWidth, 0);
  const maxByViewport = Math.max(280, availableWidth - MAIN_PANEL_MIN_WIDTH);
  const minimum = Math.min(RIGHT_PANEL_MIN_WIDTH, maxByViewport);
  const maximum = Math.max(
    minimum,
    Math.min(RIGHT_PANEL_MAX_WIDTH, maxByViewport),
  );
  return Math.round(Math.min(Math.max(input.width, minimum), maximum));
}

function panelForLayout(
  layout: WorkspaceLayoutMode,
): WorkspacePanelMode | null {
  if (layout === "split_video_transcript") return "transcript";
  if (layout === "split_content_notes") return "notes";
  if (layout === "split_content_ai") return "ai";
  return null;
}

function layoutUsesRightPanel(layout: WorkspaceLayoutMode) {
  return [
    "side_by_side",
    "split_video_transcript",
    "split_content_notes",
    "split_content_ai",
    "dual_window",
    "popout_panel",
  ].includes(layout);
}

function isVideoActivity(activity: Activity | null) {
  return activity?.activityTypeKey === "core.video";
}

function activityKind(activity: Activity) {
  if (activity.activityTypeKey === "core.video") return "Video";
  if (activity.activityTypeKey === "core.text") return "Reading";
  if (activity.activityTypeKey === "core.file") return "File";
  if (activity.activityTypeKey === "core.quiz") return "Quiz";
  if (activity.activityTypeKey === "core.link") return "Link / Lab";
  return "Activity";
}

const panelsByActivityType: Record<string, WorkspacePanelMode[]> = {
  "core.video": ["notes", "transcript", "resources", "ai", "bookmarks", "discussion", "upcoming"],
  "core.text": ["notes", "resources", "ai", "discussion", "upcoming"],
  "core.file": ["notes", "resources", "ai", "discussion", "upcoming"],
  "core.link": ["notes", "resources", "ai", "discussion", "upcoming"],
  "core.assignment": ["resources", "discussion", "upcoming"],
  "core.quiz": ["upcoming"],
};

export function visiblePanelsForActivity(
  activity: Activity | null,
  availablePanels: Set<WorkspacePanelMode>,
  policy?: {
    allowAIAssistant?: boolean;
    allowNotes?: boolean;
    allowTranscript?: boolean;
  },
) {
  const supportedPanels = new Set(
    activity
      ? (panelsByActivityType[activity.activityTypeKey] ?? ["resources"])
      : [],
  );
  const base = panelTabs
    .map((panel) => panel.value)
    .filter(
      (panel) => availablePanels.has(panel) && supportedPanels.has(panel),
    );

  return new Set(
    base.filter((panel) => {
      if (panel === "transcript") {
        return isVideoActivity(activity) && policy?.allowTranscript !== false;
      }
      if (panel === "notes") return policy?.allowNotes !== false;
      if (panel === "ai") return policy?.allowAIAssistant !== false;
      return true;
    }),
  );
}

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
    selectedActivity?.activityTypeKey === "core.video" ? selectedActivityId : null,
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
    if (availablePanels.has(rightPanel) && !disabledPanels.has(rightPanel)) return;
    const nextPanel = Array.from(availablePanels).find(
      (panel) => !disabledPanels.has(panel),
    );
    if (nextPanel) setRightPanel(nextPanel);
  }, [availablePanels, disabledPanels, rightPanel]);

  async function changeLayout(next: WorkspaceLayoutMode) {
    const policyLayout = policy?.requireFocusMode ? "focus" : next;
    const layoutPanel = panelForLayout(policyLayout);
    const nextPanel =
      layoutPanel && availablePanels.has(layoutPanel)
        ? layoutPanel
        : rightPanel;
    const nextRightCollapsed =
      policyLayout === "focus"
        ? true
        : layoutUsesRightPanel(policyLayout)
          ? false
          : rightCollapsed;
    setLayout(policyLayout);
    if (nextPanel !== rightPanel) setRightPanel(nextPanel);
    setRightCollapsed(nextRightCollapsed);
    await updatePreferences({
      preferredLayout: policyLayout,
      rightPanelMode: nextPanel,
      rightPanelCollapsed: nextRightCollapsed,
    }).catch(() => undefined);
    await persistState({
      layout: policyLayout,
      rightPanelMode: nextPanel,
      rightPanelCollapsed: nextRightCollapsed,
    });
  }

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
            setLocalMessage("Video completed automatically after 80% watched.");
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
      <div className={`min-h-0 flex-1 overflow-hidden bg-muted/30 ${isCompactViewport ? "flex flex-col" : "flex flex-row"}`}>
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
                  style={
                    { width: rightPanelWidth }
                  }
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
                    aria-label={mobileSheetState === "full" ? "Collapse panel" : "Expand panel"}
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

export function LearningTopbar({
  activity,
  hasPanels,
  onToggleSidebar,
  onToggleRight,
}: {
  activity: Activity | null;
  hasPanels: boolean;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Learning workspace
        </p>
        <h2 className="mt-1 truncate text-base font-semibold text-foreground">
          {activity?.title ?? "Select an activity"}
        </h2>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
          onClick={onToggleSidebar}
          title="Show or hide curriculum"
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Curriculum
        </button>
        {hasPanels ? (
          <button
            className="hidden h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted md:inline-flex"
            onClick={onToggleRight}
            title="Show or hide learning panel"
            type="button"
          >
            <PanelRight aria-hidden="true" className="h-4 w-4" />
            Right panel
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FocusModeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <Maximize2 aria-hidden="true" className="h-4 w-4" />
      {active ? "Exit focus" : "Focus"}
    </button>
  );
}

export function TheatreModeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <MonitorUp aria-hidden="true" className="h-4 w-4" />
      {active ? "Exit theatre" : "Theatre"}
    </button>
  );
}

export function CurriculumSidebar({
  course,
  completedActivityIds,
  selectedActivityId,
  onSelectActivity,
}: {
  course: Course;
  completedActivityIds: Set<string>;
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}) {
  // Group activities by module (flattening the lesson layer) so the curriculum
  // reads like a Coursera-style outline: modules that expand to reveal their
  // activities directly.
  const modules = useMemo(
    () =>
      (course.modules ?? []).map((module) => ({
        module,
        activities: module.lessons.flatMap((lesson) => lesson.activities),
      })),
    [course.modules],
  );

  const moduleIdForSelected = useMemo(() => {
    for (const entry of modules) {
      if (
        entry.activities.some((activity) => activity.id === selectedActivityId)
      ) {
        return entry.module.id;
      }
    }
    return modules[0]?.module.id ?? null;
  }, [modules, selectedActivityId]);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(moduleIdForSelected ? [moduleIdForSelected] : []),
  );

  // Keep the module that owns the current activity expanded when navigating.
  useEffect(() => {
    if (!moduleIdForSelected) return;
    setExpandedModules((current) => {
      if (current.has(moduleIdForSelected)) return current;
      const next = new Set(current);
      next.add(moduleIdForSelected);
      return next;
    });
  }, [moduleIdForSelected]);

  function toggleModule(moduleId: string) {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-card max-xl:max-h-[42vh] max-xl:border-b max-xl:border-r-0 xl:max-h-none">
      <div className="shrink-0 border-b border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Curriculum
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
          {course.title}
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-card">
        {modules.map((entry, index) => {
          const { module, activities } = entry;
          const completedCount = activities.filter((activity) =>
            completedActivityIds.has(activity.id),
          ).length;
          const isExpanded = expandedModules.has(module.id);
          const containsSelected = activities.some(
            (activity) => activity.id === selectedActivityId,
          );

          return (
            <section
              key={module.id}
              className="border-b border-border last:border-b-0"
            >
              <button
                aria-expanded={isExpanded}
                className={[
                  "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted",
                  containsSelected ? "bg-primary/5" : "",
                ].join(" ")}
                onClick={() => toggleModule(module.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                    Module {index + 1}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">
                    {module.title}
                  </span>
                  {activities.length ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {completedCount}/{activities.length} completed
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={[
                    "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
              {isExpanded ? (
                <div className="space-y-1 px-3 pb-3">
                  {activities.length ? (
                    activities.map((activity) => (
                      <CurriculumActivityRow
                        key={activity.id}
                        activity={activity}
                        isCompleted={completedActivityIds.has(activity.id)}
                        isSelected={selectedActivityId === activity.id}
                        onSelect={() => onSelectActivity(activity.id)}
                      />
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No activities yet.
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function CurriculumActivityRow({
  activity,
  isCompleted,
  isSelected,
  onSelect,
}: {
  activity: Activity;
  isCompleted: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition",
        isSelected
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "text-foreground hover:bg-muted",
      ].join(" ")}
      onClick={onSelect}
      type="button"
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          isCompleted
            ? "border-success bg-success text-success-foreground"
            : "border-border bg-background text-transparent",
        ].join(" ")}
      >
        {isCompleted && (
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {activity.title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {activityKind(activity)} · {activity.estimatedMinutes || 1} min
        </span>
      </span>
    </button>
  );
}

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

export function LearningRightPanel({
  course,
  lesson,
  activity,
  panel,
  availablePanels,
  policy,
  videoTime,
  onPanelChange,
  hideTabs,
  disabledPanels,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity | null;
  panel: WorkspacePanelMode;
  availablePanels: Set<WorkspacePanelMode>;
  policy?: { allowPopout: boolean };
  videoTime: number;
  onPanelChange: (panel: WorkspacePanelMode) => void;
  hideTabs?: boolean;
  disabledPanels?: Set<WorkspacePanelMode>;
}) {
  return (
    <aside className="w-full h-full border-l border-border bg-card/90 flex flex-col overflow-hidden">
      {!hideTabs ? (
        <div className="border-b border-border px-4 py-3 shrink-0">
          <WorkspacePanelTabs
            value={panel}
            availablePanels={availablePanels}
            disabledPanels={disabledPanels}
            onChange={onPanelChange}
          />
        </div>
      ) : null}
      <WorkspacePanelContainer>
        {activity ? (
          <PluginWorkspacePanelRenderer
            activity={activity}
            course={course}
            lesson={lesson}
            panel={panel}
            policy={policy}
            videoTime={videoTime}
          />
        ) : (
          <EmptyState
            title="No activity selected"
            description="Panels appear after an activity is selected."
          />
        )}
      </WorkspacePanelContainer>
    </aside>
  );
}

function MobileWorkspaceDock({
  value,
  availablePanels,
  disabledPanels,
  onPanelChange,
}: {
  value: WorkspacePanelMode | null;
  availablePanels: Set<WorkspacePanelMode>;
  disabledPanels: Set<WorkspacePanelMode>;
  onPanelChange: (panel: WorkspacePanelMode) => void;
}) {
  return (
    <nav
      aria-label="Learning tools"
      className="absolute inset-x-0 bottom-0 z-40 flex h-14 items-stretch overflow-x-auto border-t border-border bg-card"
    >
      {panelTabs
        .filter((tab) => availablePanels.has(tab.value))
        .map((tab) => {
          const Icon = tab.icon;
          const active = value === tab.value;
          const disabled = disabledPanels.has(tab.value);
          return (
            <button
              aria-pressed={active}
              className={[
                "flex min-w-24 flex-1 flex-col items-center justify-center gap-1 px-3 text-[11px] font-semibold",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground",
              ].join(" ")}
              disabled={disabled}
              key={tab.value}
              onClick={() => onPanelChange(tab.value)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
    </nav>
  );
}

export function WorkspacePanelTabs({
  value,
  availablePanels,
  disabledPanels,
  compact,
  onChange,
}: {
  value: WorkspacePanelMode;
  availablePanels?: Set<WorkspacePanelMode>;
  disabledPanels?: Set<WorkspacePanelMode>;
  compact?: boolean;
  onChange: (panel: WorkspacePanelMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {panelTabs
        .filter((tab) => !availablePanels || availablePanels.has(tab.value))
        .map((tab) => {
          const Icon = tab.icon;
          const active = value === tab.value;
          const disabled = disabledPanels?.has(tab.value) ?? false;
          return (
            <button
              key={tab.value}
              className={[
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/35"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
              disabled={disabled}
              onClick={() => onChange(tab.value)}
              title={tab.label}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {compact ? null : (
                <span className={active ? "inline" : "hidden"}>
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

export function WorkspacePanelContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 flex flex-col overflow-hidden">{children}</div>;
}

export const PluginWorkspacePanelRegistry = {
  keys() {
    return panelTabs.map((panel) => panel.value);
  },
  has(panel: WorkspacePanelMode) {
    return panelTabs.some((item) => item.value === panel);
  },
};

export function PluginWorkspacePanelRenderer(props: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  panel: WorkspacePanelMode;
  policy?: { allowPopout: boolean };
  videoTime: number;
}) {
  if (!PluginWorkspacePanelRegistry.has(props.panel)) {
    return <UnknownWorkspacePanelFallback panel={props.panel} />;
  }
  if (props.panel === "notes") return <NotesPanel {...props} />;
  if (props.panel === "transcript") return <TranscriptPanel {...props} />;
  if (props.panel === "resources") return <ResourcesPanel {...props} />;
  if (props.panel === "ai") return <AiTutorPanel {...props} />;
  if (props.panel === "bookmarks") return <BookmarksPanel {...props} />;
  if (props.panel === "discussion") return <DiscussionPanel course={props.course} lesson={props.lesson} activity={props.activity} />;
  if (props.panel === "upcoming") return <WorkspaceUpcomingPanel courseId={props.course.id} />;
  if (props.panel === "flashcards") return <FlashcardPanelPlaceholder />;
  return <UnknownWorkspacePanelFallback panel={props.panel} />;
}

export function UnknownWorkspacePanelFallback({ panel }: { panel: string }) {
  return (
    <EmptyState
      title="Panel unavailable"
      description={`${panel} is not registered as a workspace panel.`}
    />
  );
}

export function NotesPanel({
  course,
  lesson,
  activity,
  videoTime,
  policy,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
  policy?: { allowPopout: boolean };
}) {
  const notes = useLearnerNotes({
    courseId: course.id,
    lessonId: lesson.id,
    activityId: activity.id,
  });
  const createNote = useCreateLearnerNote();
  const deleteNote = useDeleteLearnerNote();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("content") ?? "").trim();
    if (!content) return;
    setSaving(true);
    try {
      await createNote({
        courseId: course.id,
        lessonId: lesson.id,
        activityId: activity.id,
        content,
        videoTimeSeconds: Math.round(videoTime),
      });
      formElement.reset();
      await notes.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelFrame
      action={
        policy?.allowPopout !== false ? (
          <PopoutPanelButton
            activityId={activity.id}
            courseId={course.id}
            lessonId={lesson.id}
            panel="notes"
          />
        ) : null
      }
      icon={<StickyNote aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Notes"
    >
      <TimestampNoteButton videoTime={videoTime} />
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <textarea
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="content"
          placeholder="Write a private note..."
        />
        <button
          className="inline-flex min-h-9 w-fit items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving" : "Save note"}
        </button>
      </form>
      <PanelList
        empty="No notes yet"
        error={notes.error}
        loading={notes.loading}
        items={notes.data}
        render={(note: LearnerNote) => (
          <article
            key={note.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <p className="whitespace-pre-wrap text-sm leading-6">
              {note.content}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(note.videoTimeSeconds)}
              </span>
              <button
                className="text-xs font-semibold text-destructive"
                onClick={() =>
                  void deleteNote(note.id).then(() => notes.reload())
                }
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        )}
      />
    </PanelFrame>
  );
}

export function BookmarksPanel({
  course,
  lesson,
  activity,
  videoTime,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
}) {
  const bookmarks = useLearnerBookmarks({
    courseId: course.id,
    lessonId: lesson.id,
    activityId: activity.id,
  });
  const createBookmark = useCreateLearnerBookmark();
  const deleteBookmark = useDeleteLearnerBookmark();

  async function addBookmark() {
    await createBookmark({
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      videoTimeSeconds: Math.round(videoTime),
      title: activity.title,
      note: videoTime ? `Saved at ${formatTimestamp(videoTime)}` : undefined,
    });
    await bookmarks.reload();
  }

  return (
    <PanelFrame
      icon={<Bookmark aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Bookmarks"
    >
      <TimestampBookmarkButton onClick={addBookmark} videoTime={videoTime} />
      <PanelList
        empty="No bookmarks yet"
        error={bookmarks.error}
        loading={bookmarks.loading}
        items={bookmarks.data}
        render={(bookmark: LearnerBookmark) => (
          <article
            key={bookmark.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <p className="text-sm font-semibold">
              {bookmark.title ?? "Bookmark"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatTimestamp(bookmark.videoTimeSeconds)}
            </p>
            {bookmark.note ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {bookmark.note}
              </p>
            ) : null}
            <button
              className="mt-2 text-xs font-semibold text-destructive"
              onClick={() =>
                void deleteBookmark(bookmark.id).then(() => bookmarks.reload())
              }
              type="button"
            >
              Delete
            </button>
          </article>
        )}
      />
    </PanelFrame>
  );
}

export function TranscriptPanel({
  activity,
  videoTime,
}: {
  activity: Activity;
  videoTime: number;
}) {
  const captions = useCaptionTracks(activity.id);
  const [language, setLanguage] = useState<string>("");
  const transcript = useTranscript(activity.id, language || null);
  const [search, setSearch] = useState("");
  const languages = useMemo(
    () =>
      Array.from(
        new Set(
          (captions.data ?? [])
            .map((track) => track.language)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [captions.data],
  );

  useEffect(() => {
    if (!languages.length) {
      setLanguage("");
      return;
    }
    if (!language || !languages.includes(language)) {
      const defaultLanguage =
        (captions.data ?? []).find((track) => track.isDefault)?.language ??
        languages[0] ??
        "";
      setLanguage(defaultLanguage);
    }
  }, [captions.data, language, languages]);

  const filtered = (transcript.data ?? []).filter((segment) =>
    segment.text.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <PanelFrame
      icon={<Subtitles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Transcript"
    >
      <TranscriptSearch
        value={search}
        onChange={setSearch}
        language={language}
        languages={languages}
        onLanguageChange={setLanguage}
      />
      <VideoTranscriptSync
        currentTime={videoTime}
        segments={transcript.data ?? []}
      />
      {transcript.loading ? (
        <LoadingState title="Loading transcript" />
      ) : transcript.error ? (
        <ApiErrorState
          error={transcript.error}
          fallbackTitle="Could not load transcript"
        />
      ) : filtered.length ? (
        <TranscriptSegmentList segments={filtered} />
      ) : (
        <EmptyState
          title="No transcript"
          description="Transcript segments will appear here when available."
        />
      )}
    </PanelFrame>
  );
}

export function TranscriptSearch({
  value,
  onChange,
  language,
  languages,
  onLanguageChange,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  languages: string[];
  onLanguageChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 grid gap-2">
      <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
        <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search transcript"
        />
      </label>
      {languages.length > 1 ? (
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Caption language
          <select
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            onChange={(event) => onLanguageChange(event.target.value)}
            value={language}
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function VideoTranscriptSync({
  currentTime,
  segments,
}: {
  currentTime: number;
  segments: TranscriptSegment[];
}) {
  const active = segments.find(
    (segment) =>
      currentTime >= segment.startSeconds && currentTime <= segment.endSeconds,
  );
  if (!active) return null;
  return (
    <div className="mb-3 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
      <p className="font-semibold">{formatTimestamp(active.startSeconds)}</p>
      <p className="mt-1 text-muted-foreground">{active.text}</p>
    </div>
  );
}

export function TranscriptSegmentList({
  segments,
}: {
  segments: TranscriptSegment[];
}) {
  return (
    <div className="space-y-2">
      {segments.map((segment) => (
        <button
          key={segment.id}
          className="w-full rounded-md border border-border p-3 text-left hover:bg-muted"
          onClick={() => seekVideo(segment.startSeconds)}
          type="button"
        >
          <span className="text-xs font-semibold text-primary">
            {formatTimestamp(segment.startSeconds)}
          </span>
          <p className="mt-1 text-sm leading-6">{segment.text}</p>
        </button>
      ))}
    </div>
  );
}

export function ResourcesPanel({ activity }: { activity: Activity }) {
  const resources = Array.isArray(activity.activityContent?.resources)
    ? activity.activityContent?.resources
    : [];
  return (
    <PanelFrame
      icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Resources"
    >
      {resources.length ? (
        <div className="space-y-2">
          {resources.map((resource, index) => {
            const item =
              resource && typeof resource === "object" && !Array.isArray(resource)
                ? (resource as Record<string, unknown>)
                : {};
            const url = typeof item.url === "string" ? item.url : null;
            const label =
              typeof item.label === "string"
                ? item.label
                : typeof item.title === "string"
                  ? item.title
                  : `Resource ${index + 1}`;
            return url ? (
              <a
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-primary/40 hover:bg-muted"
                href={url}
                key={`${url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <span className="truncate">{label}</span>
                <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ) : (
              <div
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                key={index}
              >
                {label}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No extra resources"
          description="Files and links attached to the activity appear in the main content."
        />
      )}
    </PanelFrame>
  );
}

export function AiTutorPanel({
  course,
  lesson,
  activity,
  videoTime,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
}) {
  const status = useAiStatus();
  const askTutor = useAskAiTutor();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [history, setHistory] = useState<
    Array<{ question: string; response: AiTutorResponse }>
  >([]);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(undefined);
    setHistory([]);
    setQuestion("");
    setPendingQuestion(null);
    setError(null);
  }, [activity.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, sending]);

  async function submitFeedback(messageId: string, feedback: "LIKE" | "DISLIKE") {
    if (!messageId) return;
    try {
      const session = getSession();
      await fetch(`${apiBaseUrl()}/learn/ai/messages/${messageId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ feedback }),
      });
      // Optionally update local state to reflect feedback
    } catch {
      // Ignore errors for feedback
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => undefined);
  }

  async function askTutorWithoutStream(trimmed: string) {
    const result = await askTutor({
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      question: trimmed,
      conversationId,
    });
    setHistory((current) => [
      ...current,
      { question: trimmed, response: result },
    ]);
    setConversationId(result.conversationId);
  }

  async function fallbackToNonStreaming(trimmed: string, cause: unknown) {
    try {
      await askTutorWithoutStream(trimmed);
    } catch {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "AI Tutor could not answer.";
      throw new Error(message);
    }
  }

  async function send(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || sending || status.data?.enabled === false) return;
    setSending(true);
    setPendingQuestion(trimmed);
    setError(null);
    setQuestion("");
    let delivered = false;

    try {
      const session = getSession();
      const response = await fetch(`${apiBaseUrl()}/learn/ai/tutor/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          lessonId: lesson.id,
          activityId: activity.id,
          question: trimmed,
          conversationId,
        }),
      });

      if (!response.ok) {
        let message = "AI Tutor request failed.";
        try {
          const body = await response.json();
          message = body?.error?.message ?? body?.message ?? message;
        } catch {
          message =
            response.status === 429
              ? "AI Tutor is receiving too many requests. Please wait a moment."
              : response.status >= 500
                ? "AI Tutor provider is temporarily unavailable."
                : message;
        }
        await fallbackToNonStreaming(trimmed, new Error(message));
        return;
      }
      if (!response.body) {
        await fallbackToNonStreaming(
          trimmed,
          new Error("AI Tutor stream is unavailable."),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      let streamedAnswer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          streamBuffer += decoder.decode();
          break;
        }

        streamBuffer += decoder.decode(value, { stream: true });
        const events = streamBuffer.split("\n\n");
        streamBuffer = events.pop() ?? "";
        
        for (const event of events) {
          const data = event
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.replace(/^data: /, ""))
            .join("\n")
            .trim();
          if (!data) continue;
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") {
              streamedAnswer += parsed.text;
            } else if (parsed.type === "done") {
              const result = {
                ...parsed.result,
                answer: parsed.result.answer || streamedAnswer,
              };
              setHistory((current) => [
                ...current,
                { question: trimmed, response: result },
              ]);
              delivered = true;
              setConversationId(parsed.result.conversationId);
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (e) {
            throw new Error(
              e instanceof Error ? e.message : "AI Tutor stream failed.",
            );
          }
        }
      }
    } catch (caught) {
      if (!delivered) {
        try {
          await fallbackToNonStreaming(trimmed, caught);
          delivered = true;
        } catch (fallbackError) {
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "AI Tutor could not answer. Please try again.",
          );
        }
      }
    } finally {
      setSending(false);
      setPendingQuestion(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(question);
  }

  const latest = history.at(-1)?.response;

  return (
    <PanelFrame
      icon={<Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="AI Tutor"
      scrollable={false}
    >
      {status.loading ? (
        <LoadingState title="Checking AI Tutor" />
      ) : status.error ? (
        <ApiErrorState
          error={status.error}
          fallbackTitle="AI Tutor status unavailable"
        />
      ) : status.data?.enabled === false ? (
        <EmptyState
          title="AI Tutor is disabled"
          description={
            status.data.disabledReason ??
            "Your organization has disabled AI assistance."
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{course.title}</p>
            <p className="mt-1 truncate">
              {lesson.title} / {activity.title}
            </p>
            {videoTime > 0 ? (
              <p className="mt-1">At {formatTimestamp(videoTime)}</p>
            ) : null}
          </div>

          <div aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {!history.length ? (
              <EmptyState
                title="Ask about this material"
                description="Answers use accessible course material first, with clearly labeled general educational fallback."
              />
            ) : (
              history.map((entry, index) => (
                <div key={`${entry.question}-${index}`} className="space-y-2">
                  <div className="ml-6 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {entry.question}
                  </div>
                  <article className="rounded-md border border-border bg-background p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.response.sourceType === "COURSE_MATERIAL" ? (
                        <BookOpen
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      ) : entry.response.sourceType === "BLOCKED" ||
                        entry.response.sourceType === "OUT_OF_SCOPE" ? (
                        <ShieldAlert
                          aria-hidden="true"
                          className="h-4 w-4 text-warning"
                        />
                      ) : (
                        <Sparkles
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                      <span className="text-xs font-semibold">
                        {entry.response.sourceLabel}
                      </span>
                      {entry.response.cacheHit ? (
                        <span className="text-xs text-muted-foreground">
                          Cached
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-sm leading-6">
                      <ReactMarkdown
                        components={{
                          p: ({ node: _, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node: _, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                          ul: ({ node: _, ...props }) => <ul className="mb-3 list-inside list-disc space-y-1" {...props} />,
                          ol: ({ node: _, ...props }) => <ol className="mb-3 list-inside list-decimal space-y-1" {...props} />,
                          li: ({ node: _, ...props }) => <li {...props} />,
                          h1: ({ node: _, ...props }) => <h1 className="mb-2 mt-4 font-bold text-foreground" {...props} />,
                          h2: ({ node: _, ...props }) => <h2 className="mb-2 mt-3 font-semibold text-foreground" {...props} />,
                          h3: ({ node: _, ...props }) => <h3 className="mb-2 mt-3 font-medium text-foreground" {...props} />,
                          h4: ({ node: _, ...props }) => <h4 className="mb-2 mt-3 font-medium text-foreground" {...props} />,
                          code: ({ node: _, className, ...props }) => {
                            const isInline = !className?.includes('language-');
                            return isInline ? (
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground" {...props} />
                            ) : (
                              <code className={className} {...props} />
                            );
                          },
                          pre: ({ node: _, ...props }) => <pre className="mb-3 mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground" {...props} />
                        }}
                      >
                        {entry.response.answer}
                      </ReactMarkdown>
                    </div>
                    {entry.response.citations.length ? (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Sources
                        </p>
                        <div className="mt-2 space-y-2">
                          {entry.response.citations.map((citation) => (
                            <details
                              key={citation.chunkId}
                              className="rounded-md border border-border p-2"
                            >
                              <summary className="cursor-pointer text-xs font-semibold">
                                {citation.id} {citation.title}
                              </summary>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {citation.excerpt}
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-end gap-2 text-muted-foreground border-t border-border pt-2">
                      <button 
                        type="button" 
                        title="Copy to clipboard"
                        className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                        onClick={() => handleCopy(entry.response.answer)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {(entry.response as any).messageId ? (
                        <>
                          <button 
                            type="button" 
                            title="Good response"
                            className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                            onClick={() => submitFeedback((entry.response as any).messageId, "LIKE")}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button 
                            type="button" 
                            title="Bad response"
                            className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                            onClick={() => submitFeedback((entry.response as any).messageId, "DISLIKE")}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                </div>
              ))
            )}
            {sending ? (
              <div className="space-y-2">
                {pendingQuestion ? (
                  <div className="ml-6 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {pendingQuestion}
                  </div>
                ) : null}
                <LoadingState title="AI Tutor is thinking" />
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <div className="flex shrink-0 flex-col gap-4">
            {latest?.suggestions.length ? (
              <div className="flex flex-wrap gap-2">
                {latest.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
                    disabled={sending}
                    onClick={() => void send(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
            <form
              className="flex shrink-0 items-end gap-2 border-t border-border pt-3"
              onSubmit={submit}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Question for AI Tutor</span>
                <textarea
                  className="min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  disabled={sending}
                  maxLength={2000}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about this lesson..."
                  value={question}
                />
              </label>
              <button
                aria-label="Send question"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={sending || question.trim().length < 2}
                title="Send question"
                type="submit"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}

export function DiscussionPanel({ course, lesson, activity }: { course: Course; lesson: Lesson; activity: Activity }) {
  return (
    <PanelFrame
      icon={
        <MessageSquare aria-hidden="true" className="h-5 w-5 text-primary" />
      }
      title="Discussion"
    >
      <WorkspaceDiscussionPanel courseId={course.id} lessonId={lesson.id} activityId={activity.id} />
    </PanelFrame>
  );
}

export function FlashcardPanelPlaceholder() {
  return (
    <PanelFrame
      icon={<ListChecks aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Flashcards"
    >
      <EmptyState
        title="Flashcards are not available yet"
        description="AI or instructor-created flashcards can use this panel later."
      />
    </PanelFrame>
  );
}

export function PopoutPanelButton({
  courseId,
  lessonId,
  activityId,
  panel,
}: {
  courseId: string;
  lessonId: string;
  activityId: string;
  panel: WorkspacePanelMode;
}) {
  return (
    <button
      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => openPopoutPanel({ courseId, lessonId, activityId, panel })}
      type="button"
    >
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
      Popout
    </button>
  );
}

export function PopoutWindowShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <section className="rounded-lg border border-border bg-card p-4 shadow-subtle">
        {children}
      </section>
    </main>
  );
}

export function PopoutPanelRenderer({
  panel,
  course,
  lesson,
  activity,
}: {
  panel: WorkspacePanelMode;
  course: Course;
  lesson: Lesson;
  activity: Activity;
}) {
  return (
    <PluginWorkspacePanelRenderer
      activity={activity}
      course={course}
      lesson={lesson}
      panel={panel}
      videoTime={0}
    />
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

function PanelFrame({
  icon,
  title,
  action,
  children,
  scrollable = true,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div
        className={`mt-4 ${scrollable ? "min-h-0 flex-1 overflow-y-auto pr-2" : "flex min-h-0 flex-1 flex-col"}`}
      >
        {children}
      </div>
    </section>
  );
}

function PanelList<T>({
  items,
  loading,
  error,
  empty,
  render,
}: {
  items: T[] | null;
  loading: boolean;
  error: Error | null;
  empty: string;
  render: (item: T) => ReactNode;
}) {
  if (loading) return <LoadingState title="Loading panel" />;
  if (error) return <ApiErrorState error={error} fallbackTitle="Panel error" />;
  if (!items?.length) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{empty}</p>
        <p className="mt-1">Saved items appear here.</p>
      </div>
    );
  }
  return <div className="mt-4 space-y-3">{items.map(render)}</div>;
}

export function TimestampNoteButton({ videoTime }: { videoTime: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      New notes include timestamp {formatTimestamp(videoTime)} when video time
      is available.
    </p>
  );
}

export function TimestampBookmarkButton({
  videoTime,
  onClick,
}: {
  videoTime: number;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <Bookmark aria-hidden="true" className="h-4 w-4 text-primary" />
      Bookmark {formatTimestamp(videoTime)}
    </button>
  );
}

function formatTimestamp(value?: number | null) {
  const seconds = Math.max(Math.round(value ?? 0), 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function seekVideo(seconds: number) {
  const video = document.querySelector("video");
  if (video) {
    video.currentTime = seconds;
    void video.play().catch(() => undefined);
  }
}

function requestPictureInPicture() {
  const video = document.querySelector("video") as
    | (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
    | null;
  if (video?.requestPictureInPicture) {
    void video.requestPictureInPicture().catch(() => undefined);
  }
}

function openPopoutPanel(input: {
  courseId: string;
  lessonId: string;
  activityId: string;
  panel: WorkspacePanelMode;
}) {
  const params = new URLSearchParams(input);
  window.open(
    `/learn/popout?${params.toString()}`,
    "lms-popout",
    "width=460,height=760",
  );
}
