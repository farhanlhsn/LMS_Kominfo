import {
  Bot,
  Bookmark,
  CalendarDays,
  FileText,
  MessageSquare,
  StickyNote,
  Subtitles,
  Layers,
} from "lucide-react";
import type { Activity, WorkspaceLayoutMode, WorkspacePanelMode } from "../../lib/lms-types";

export const primaryWorkspaceLayouts: Array<{
  value: WorkspaceLayoutMode;
  label: string;
}> = [
  { value: "standard", label: "Standard" },
  { value: "side_by_side", label: "Side by side" },
  { value: "focus", label: "Focus" },
];

export const advancedWorkspaceLayouts: Array<{
  value: WorkspaceLayoutMode;
  label: string;
}> = [
  { value: "theatre", label: "Theatre" },
  { value: "split_video_transcript", label: "Video + transcript" },
  { value: "split_content_notes", label: "Content + notes" },
  { value: "split_content_ai", label: "Content + AI" },
  { value: "dual_window", label: "Dual window" },
  { value: "popout_panel", label: "Popout panel" },
  { value: "picture_in_picture_video", label: "Picture in picture" },
];

/** Full list (tests + advanced UI). Prefer primaryWorkspaceLayouts for defaults. */
export const workspaceLayouts = [
  ...primaryWorkspaceLayouts,
  ...advancedWorkspaceLayouts,
];

export const panelTabs: Array<{
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
  { value: "flashcards", label: "Flashcards", icon: Layers },
];

export const RIGHT_PANEL_STORAGE_KEY = "lms.workspace.rightPanelWidth";
export const RIGHT_PANEL_DEFAULT_WIDTH = 560;
export const RIGHT_PANEL_MIN_WIDTH = 360;
export const RIGHT_PANEL_MAX_WIDTH = 920;
export const MAIN_PANEL_MIN_WIDTH = 520;
export const CURRICULUM_SIDEBAR_WIDTH = 280;

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

export function panelForLayout(
  layout: WorkspaceLayoutMode,
): WorkspacePanelMode | null {
  if (layout === "split_video_transcript") return "transcript";
  if (layout === "split_content_notes") return "notes";
  if (layout === "split_content_ai") return "ai";
  return null;
}

export function layoutUsesRightPanel(layout: WorkspaceLayoutMode) {
  return [
    "side_by_side",
    "split_video_transcript",
    "split_content_notes",
    "split_content_ai",
    "dual_window",
    "popout_panel",
  ].includes(layout);
}

export function isVideoActivity(activity: Activity | null) {
  return activity?.activityTypeKey === "core.video";
}

export function activityKind(activity: Activity) {
  if (activity.activityTypeKey === "core.video") return "Video";
  if (activity.activityTypeKey === "core.text") return "Reading";
  if (activity.activityTypeKey === "core.file") return "File";
  if (activity.activityTypeKey === "core.quiz") return "Quiz";
  if (activity.activityTypeKey === "core.link") return "Link / Lab";
  return "Activity";
}

const panelsByActivityType: Record<string, WorkspacePanelMode[]> = {
  "core.video": [
    "notes",
    "transcript",
    "resources",
    "ai",
    "bookmarks",
    "discussion",
    "upcoming",
    "flashcards",
  ],
  "core.text": ["notes", "resources", "ai", "discussion", "upcoming", "flashcards"],
  "core.file": ["notes", "resources", "ai", "discussion", "upcoming", "flashcards"],
  "core.link": ["notes", "resources", "ai", "discussion", "upcoming", "flashcards"],
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
