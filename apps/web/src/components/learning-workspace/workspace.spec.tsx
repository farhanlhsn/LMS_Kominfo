import { describe, expect, it } from "vitest";
import {
  PluginWorkspacePanelRegistry,
  workspaceLayouts,
} from "./workspace";

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
  });
});
