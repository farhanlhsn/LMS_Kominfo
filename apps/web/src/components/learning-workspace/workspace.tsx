"use client";

import {
  Bot,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Columns3,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  Maximize2,
  MessageSquare,
  MonitorUp,
  PanelRight,
  PictureInPicture,
  Search,
  Sparkles,
  StickyNote,
  Subtitles,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PluginActivityRenderer } from "../plugins/plugin-activity";
import { ButtonLink, StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import {
  useActivityContent,
  useCreateLearnerBookmark,
  useCreateLearnerNote,
  useDeleteLearnerBookmark,
  useDeleteLearnerNote,
  useLearnerBookmarks,
  useLearnerNotes,
  useLessonWorkspaceState,
  useTranscript,
  useUpdateLessonWorkspaceState,
  useUpdateVideoProgress,
  useUpdateWorkspacePreferences,
  useWorkspaceContext,
  useWorkspacePreferences,
} from "../../lib/api-hooks";
import type {
  Activity,
  Course,
  LearnerBookmark,
  LearnerNote,
  Lesson,
  TranscriptSegment,
  WorkspaceLayoutMode,
  WorkspacePanelMode,
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
  { value: "activity_info", label: "Info", icon: Info },
];

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
  const policy = workspaceContext.data?.assessmentDisplayPolicy;
  const [layout, setLayout] = useState<WorkspaceLayoutMode>("standard");
  const [rightPanel, setRightPanel] = useState<WorkspacePanelMode>("notes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const updateVideoProgress = useUpdateVideoProgress();

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
    setSidebarCollapsed(
      workspaceState.data?.sidebarCollapsed ??
        preferences.data?.sidebarCollapsed ??
        false,
    );
    setRightCollapsed(
      workspaceState.data?.rightPanelCollapsed ??
        preferences.data?.rightPanelCollapsed ??
        false,
    );
    setVideoTime(workspaceState.data?.lastVideoTimeSeconds ?? 0);
  }, [preferences.data, policy?.requireFocusMode, workspaceState.data]);

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
      sidebarCollapsed,
      rightPanelCollapsed: rightCollapsed,
      lastVideoTimeSeconds: videoTime,
      ...patch,
    }).catch(() => undefined);
  }

  async function changeLayout(next: WorkspaceLayoutMode) {
    const policyLayout = policy?.requireFocusMode ? "focus" : next;
    setLayout(policyLayout);
    await updatePreferences({ preferredLayout: policyLayout }).catch(
      () => undefined,
    );
    await persistState({ layout: policyLayout });
  }

  async function changePanel(next: WorkspacePanelMode) {
    setRightPanel(next);
    setRightCollapsed(false);
    await updatePreferences({ rightPanelMode: next }).catch(() => undefined);
    await persistState({ rightPanelMode: next, rightPanelCollapsed: false });
  }

  function onVideoProgress(currentTime: number, duration: number) {
    if (!selectedActivityId || duration <= 0) return;
    setVideoTime(currentTime);
    if (Math.round(currentTime) % 5 === 0) {
      void persistState({ lastVideoTimeSeconds: currentTime });
    }
    const watchedPercent = Math.round((currentTime / duration) * 100);
    if (watchedPercent % 10 === 0) {
      void updateVideoProgress(
        selectedActivityId,
        currentTime,
        duration,
        watchedPercent,
      ).catch(() => undefined);
    }
  }

  const availablePanels = useMemo(
    () => new Set(workspaceContext.data?.availablePanels ?? panelTabs.map((p) => p.value)),
    [workspaceContext.data?.availablePanels],
  );
  const isTheatre = layout === "theatre" || layout === "picture_in_picture_video";
  const isFocus = layout === "focus";
  const showRightPanel = !rightCollapsed && !isFocus;
  const shellClass = [
    "min-h-[calc(100vh-9rem)] min-h-0 overflow-hidden rounded-lg border border-border bg-background shadow-subtle",
    isTheatre ? "bg-foreground text-background" : "",
  ].join(" ");
  const gridClass = isFocus
    ? "grid min-h-0 flex-1 grid-cols-1"
    : sidebarCollapsed
      ? showRightPanel
        ? "grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]"
        : "grid min-h-0 flex-1 grid-cols-1"
      : showRightPanel
        ? "grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_360px]"
        : "grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]";

  return (
    <section className={shellClass}>
      <LearningTopbar
        activity={selectedActivity}
        layout={layout}
        onLayoutChange={changeLayout}
        onPanelChange={changePanel}
        onPictureInPicture={requestPictureInPicture}
        onToggleRight={() => {
          const next = !rightCollapsed;
          setRightCollapsed(next);
          void updatePreferences({ rightPanelCollapsed: next });
          void persistState({ rightPanelCollapsed: next });
        }}
        onToggleSidebar={() => {
          const next = !sidebarCollapsed;
          setSidebarCollapsed(next);
          void updatePreferences({ sidebarCollapsed: next });
          void persistState({ sidebarCollapsed: next });
        }}
        policy={policy}
        rightPanel={rightPanel}
      />
      <div className={[gridClass, "min-h-0"].join(" ")}>
        {!sidebarCollapsed && !isFocus ? (
          <CurriculumSidebar
            course={course}
            selectedActivityId={selectedActivityId}
            onSelectActivity={onSelectActivity}
          />
        ) : null}
        <ActivityMainPanel
          actionMessage={actionMessage}
          activity={selectedActivity}
          contentState={activityContent}
          onCompleteActivity={onCompleteActivity}
          onVideoProgress={onVideoProgress}
        />
        {showRightPanel ? (
          <LearningRightPanel
            activity={selectedActivity}
            course={course}
            lesson={lesson}
            panel={rightPanel}
            availablePanels={availablePanels}
            onPanelChange={changePanel}
            policy={policy}
            videoTime={videoTime}
          />
        ) : null}
      </div>
    </section>
  );
}

export function LearningTopbar({
  activity,
  layout,
  rightPanel,
  policy,
  onLayoutChange,
  onPanelChange,
  onToggleSidebar,
  onToggleRight,
  onPictureInPicture,
}: {
  activity: Activity | null;
  layout: WorkspaceLayoutMode;
  rightPanel: WorkspacePanelMode;
  policy?: { allowDualWindow: boolean; allowPopout: boolean };
  onLayoutChange: (layout: WorkspaceLayoutMode) => void;
  onPanelChange: (panel: WorkspacePanelMode) => void;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
  onPictureInPicture: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Learning workspace
        </p>
        <h2 className="mt-1 truncate text-base font-semibold">
          {activity?.title ?? "Select an activity"}
        </h2>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <button
          className="inline-flex shrink-0 h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
          onClick={onToggleSidebar}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Sidebar
        </button>
        <WorkspaceLayoutSwitcher value={layout} onChange={onLayoutChange} />
        <WorkspacePanelTabs
          compact
          value={rightPanel}
          onChange={onPanelChange}
        />
        <button
          className="inline-flex shrink-0 h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
          onClick={onToggleRight}
          type="button"
        >
          <PanelRight aria-hidden="true" className="h-4 w-4" />
          Right panel
        </button>
        {policy?.allowDualWindow !== false ? (
          <DualWindowToggle layout={layout} onLayoutChange={onLayoutChange} />
        ) : null}
        <PictureInPictureButton onClick={onPictureInPicture} />
      </div>
    </div>
  );
}

export function WorkspaceLayoutSwitcher({
  value,
  onChange,
}: {
  value: WorkspaceLayoutMode;
  onChange: (value: WorkspaceLayoutMode) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold shrink-0 whitespace-nowrap">
      <Columns3 aria-hidden="true" className="h-4 w-4 text-primary" />
      <select
        className="h-10 rounded-md border border-input bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value as WorkspaceLayoutMode)}
      >
        {workspaceLayouts.map((layout) => (
          <option key={layout.value} value={layout.value}>
            {layout.label}
          </option>
        ))}
      </select>
    </label>
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
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
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
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <MonitorUp aria-hidden="true" className="h-4 w-4" />
      {active ? "Exit theatre" : "Theatre"}
    </button>
  );
}

export function DualWindowToggle({
  layout,
  onLayoutChange,
}: {
  layout: WorkspaceLayoutMode;
  onLayoutChange: (layout: WorkspaceLayoutMode) => void;
}) {
  return (
    <button
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={() => onLayoutChange(layout === "dual_window" ? "standard" : "dual_window")}
      type="button"
    >
      <MonitorUp aria-hidden="true" className="h-4 w-4" />
      Dual
    </button>
  );
}

export function PictureInPictureButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <PictureInPicture aria-hidden="true" className="h-4 w-4" />
      PiP
    </button>
  );
}

export function CurriculumSidebar({
  course,
  selectedActivityId,
  onSelectActivity,
}: {
  course: Course;
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}) {
  return (
    <aside className="border-r border-border bg-card p-4 min-h-0">
      <p className="text-sm font-medium text-muted-foreground">Curriculum</p>
      <h3 className="mt-1 line-clamp-2 text-base font-semibold">{course.title}</h3>
      <div className="mt-4 space-y-4 overflow-auto">
        {course.modules?.map((module) => (
          <section key={module.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {module.title}
            </p>
            <div className="mt-2 space-y-2">
              {module.lessons.map((lesson) =>
                lesson.activities.map((activity) => (
                  <button
                    key={activity.id}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm",
                      selectedActivityId === activity.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    ].join(" ")}
                    onClick={() => onSelectActivity(activity.id)}
                    type="button"
                  >
                    <span className="min-w-0 truncate">{activity.title}</span>
                    {activity.progress?.[0]?.status === "COMPLETED" ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="h-4 w-4 text-success"
                      />
                    ) : null}
                  </button>
                )),
              )}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

export function ActivityMainPanel({
  activity,
  contentState,
  onVideoProgress,
  onCompleteActivity,
  actionMessage,
}: {
  activity: Activity | null;
  contentState: ReturnType<typeof useActivityContent>;
  onVideoProgress: (currentTime: number, duration: number) => void;
  onCompleteActivity: () => Promise<void>;
  actionMessage?: string | null;
}) {
  return (
    <main className="min-w-0 min-h-0 overflow-auto p-4 lg:p-6">
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
          <PluginActivityRenderer
            onVideoProgress={onVideoProgress}
            response={contentState.data}
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => void onCompleteActivity()}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Mark complete
            </button>
            {actionMessage ? (
              <p className="text-sm text-muted-foreground">{actionMessage}</p>
            ) : null}
          </div>
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
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity | null;
  panel: WorkspacePanelMode;
  availablePanels: Set<WorkspacePanelMode>;
  policy?: { allowPopout: boolean };
  videoTime: number;
  onPanelChange: (panel: WorkspacePanelMode) => void;
}) {
  return (
    <aside className="border-l border-border bg-card flex min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <WorkspacePanelTabs
          value={panel}
          availablePanels={availablePanels}
          onChange={onPanelChange}
        />
      </div>
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

export function WorkspacePanelTabs({
  value,
  availablePanels,
  compact,
  onChange,
}: {
  value: WorkspacePanelMode;
  availablePanels?: Set<WorkspacePanelMode>;
  compact?: boolean;
  onChange: (panel: WorkspacePanelMode) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {panelTabs
        .filter((tab) => !availablePanels || availablePanels.has(tab.value))
        .map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
            className={[
                 "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-2 text-xs font-semibold whitespace-nowrap",
                 value === tab.value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
               ].join(" ")}
              onClick={() => onChange(tab.value)}
              title={tab.label}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {compact ? null : tab.label}
            </button>
          );
        })}
    </div>
  );
}

export function WorkspacePanelContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>;
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
  if (props.panel === "ai") return <AiTutorPanelPlaceholder {...props} />;
  if (props.panel === "bookmarks") return <BookmarksPanel {...props} />;
  if (props.panel === "activity_info") return <ActivityInfoPanel {...props} />;
  if (props.panel === "discussion") return <DiscussionPanelPlaceholder />;
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
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
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
          className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="content"
          placeholder="Write a private note..."
        />
        <button
          className="inline-flex min-h-10 w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
            <article key={note.id} className="rounded-md border border-border p-3">
              <p className="whitespace-pre-wrap text-sm leading-6">{note.content}</p>
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
            <article key={bookmark.id} className="rounded-md border border-border p-3">
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
  const transcript = useTranscript(activity.id);
  const [search, setSearch] = useState("");
  const filtered = (transcript.data ?? []).filter((segment) =>
    segment.text.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <PanelFrame
      icon={<Subtitles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Transcript"
    >
      <TranscriptSearch value={search} onChange={setSearch} />
      <VideoTranscriptSync currentTime={videoTime} segments={transcript.data ?? []} />
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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
      <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      <input
        className="min-w-0 flex-1 bg-transparent outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search transcript"
      />
    </label>
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
          {resources.map((resource, index) => (
            <pre
              key={index}
              className="overflow-auto rounded-md border border-border bg-muted p-3 text-xs"
            >
              {JSON.stringify(resource, null, 2)}
            </pre>
          ))}
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

export function AiTutorPanelPlaceholder({
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
  return (
    <PanelFrame
      icon={<Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="AI Tutor"
    >
      <div className="rounded-md border border-border bg-muted p-3 text-sm">
        <p className="font-semibold">Context prepared</p>
        <dl className="mt-3 space-y-2 text-muted-foreground">
          <div>
            <dt className="font-medium text-foreground">Course</dt>
            <dd>{course.title}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Lesson</dt>
            <dd>{lesson.title}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Activity</dt>
            <dd>{activity.title}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Timestamp</dt>
            <dd>{formatTimestamp(videoTime)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        AI Tutor is a safe placeholder. It does not call an AI provider or
        generate answers yet.
      </p>
    </PanelFrame>
  );
}

export function DiscussionPanelPlaceholder() {
  return (
    <PanelFrame
      icon={<MessageSquare aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Discussion"
    >
      <EmptyState
        title="Discussion is not available yet"
        description="Threaded lesson discussion can plug into this panel later."
      />
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

export function ActivityInfoPanel({ activity }: { activity: Activity }) {
  return (
    <PanelFrame
      icon={<Info aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Activity info"
    >
      <div className="space-y-3 text-sm">
        <StatusBadge value={activity.activityTypeKey} />
        <p className="leading-6 text-muted-foreground">
          {activity.description ?? "No activity description."}
        </p>
        <p className="text-muted-foreground">
          Estimated time: {activity.estimatedMinutes ?? 0} minutes
        </p>
      </div>
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
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-muted"
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
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
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
    return <EmptyState title={empty} description="Saved items appear here." />;
  }
  return <div className="mt-4 space-y-3">{items.map(render)}</div>;
}

export function TimestampNoteButton({ videoTime }: { videoTime: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      New notes include timestamp {formatTimestamp(videoTime)} when video time is
      available.
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
      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      onClick={onClick}
      type="button"
    >
      <Bookmark aria-hidden="true" className="h-4 w-4" />
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
  window.open(`/learn/popout?${params.toString()}`, "lms-popout", "width=460,height=760");
}
