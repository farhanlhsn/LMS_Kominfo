"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { EmptyState } from "../ui/states";
import { WorkspaceUpcomingPanel } from "../engagement/engagement";
import type {
  Activity,
  Course,
  Lesson,
  WorkspacePanelMode,
} from "../../lib/lms-types";
import { NotesPanel } from "./panels/notes-panel";
import { BookmarksPanel } from "./panels/bookmarks-panel";
import { FlashcardsPanel } from "./panels/flashcards-panel";
import { TranscriptPanel } from "./panels/transcript-panel";
import { ResourcesPanel } from "./panels/resources-panel";
import { DiscussionPanel } from "./panels/discussion-panel";
import { panelTabs } from "./workspace-config";

const AiTutorPanel = dynamic(
  () =>
    import("./panels/ai-tutor-panel").then((m) => ({ default: m.AiTutorPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground">Loading AI Tutor…</div>
    ),
  },
);

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
  return (
    <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
      {children}
    </div>
  );
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
  if (props.panel === "discussion") {
    return (
      <DiscussionPanel
        course={props.course}
        lesson={props.lesson}
        activity={props.activity}
      />
    );
  }
  if (props.panel === "upcoming") {
    return <WorkspaceUpcomingPanel courseId={props.course.id} />;
  }
  if (props.panel === "flashcards") return <FlashcardsPanel {...props} />;
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
