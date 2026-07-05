import { describe, expect, it } from "vitest";
import {
  clampRightPanelWidth,
  PluginWorkspacePanelRegistry,
  visiblePanelsForActivity,
  workspaceLayouts,
} from "./workspace";
import type { Activity } from "../../lib/lms-types";

function activity(activityTypeKey: Activity["activityTypeKey"]): Activity {
  return {
    id: activityTypeKey,
    courseId: "course_1",
    lessonId: "lesson_1",
    title: activityTypeKey,
    activityTypeKey,
    orderIndex: 0,
    isRequired: true,
    isPublished: true,
    estimatedMinutes: 5,
  };
}

describe("LearningWorkspace foundation", () => {
  it("registers advanced workspace layouts", () => {
    expect(workspaceLayouts.map((layout) => layout.value)).toEqual(
      expect.arrayContaining([
        "standard",
        "side_by_side",
        "focus",
        "theatre",
        "split_video_transcript",
        "split_content_notes",
        "split_content_ai",
        "dual_window",
        "popout_panel",
        "picture_in_picture_video",
      ]),
    );
  });

  it("registers core workspace panels and rejects unknown panels", () => {
    expect(PluginWorkspacePanelRegistry.keys()).toContain("notes");
    expect(PluginWorkspacePanelRegistry.keys()).toContain("transcript");
    expect(PluginWorkspacePanelRegistry.has("ai")).toBe(true);
    expect(PluginWorkspacePanelRegistry.has("unknown" as never)).toBe(false);
    expect(PluginWorkspacePanelRegistry.keys()).not.toContain("activity_info");
  });

  it("shows only panels relevant to each activity type", () => {
    const allPanels = new Set(PluginWorkspacePanelRegistry.keys());

    expect(
      Array.from(visiblePanelsForActivity(activity("core.quiz"), allPanels)),
    ).toEqual(["upcoming"]);
    expect(
      Array.from(visiblePanelsForActivity(activity("core.text"), allPanels)),
    ).toEqual(["notes", "resources", "ai", "discussion", "upcoming"]);
    expect(
      Array.from(visiblePanelsForActivity(activity("core.video"), allPanels)),
    ).toEqual(["notes", "transcript", "resources", "ai", "bookmarks", "discussion", "upcoming"]);
  });

  it("keeps the learning panel resizable within usable desktop bounds", () => {
    expect(
      clampRightPanelWidth({
        width: 80,
        viewportWidth: 2048,
        sidebarCollapsed: false,
        compact: false,
      }),
    ).toBe(360);

    expect(
      clampRightPanelWidth({
        width: 1400,
        viewportWidth: 2048,
        sidebarCollapsed: false,
        compact: false,
      }),
    ).toBe(920);
  });
});
