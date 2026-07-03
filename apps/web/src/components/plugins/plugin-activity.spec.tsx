import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PluginActivityRenderer,
  PluginEditorRegistry,
  PluginRendererRegistry,
} from "./plugin-activity";

describe("plugin activity registries", () => {
  it("resolves core renderers and falls back for unknown keys", () => {
    expect(PluginRendererRegistry.keys()).toContain("core.text");
    expect(PluginRendererRegistry.get("core.video").name).toBe(
      "CoreVideoRenderer",
    );
    expect(PluginRendererRegistry.get("plugin.missing").name).toBe(
      "UnknownActivityRenderer",
    );
  });

  it("resolves core editors and falls back for unsupported keys", () => {
    expect(PluginEditorRegistry.keys()).toContain("core.file");
    expect(PluginEditorRegistry.get("plugin.scorm").name).toBe(
      "UnsupportedActivityEditor",
    );
  });

  it("renders unavailable fallback when a plugin is disabled", () => {
    const html = renderToStaticMarkup(
      createElement(PluginActivityRenderer, {
        response: {
          activity: {
            id: "activity_1",
            title: "Disabled link",
            activityTypeKey: "core.link",
          },
          plugin: {
            key: "core.link",
            name: "Link Activity",
            enabled: false,
            available: true,
            reason: "disabled",
          },
          content: {
            id: "content_1",
            activityId: "activity_1",
            externalUrl: "https://example.com",
            textContent: "Open link",
          },
          fileAccess: null,
        },
      }),
    );

    expect(html).toContain("Activity unavailable");
    expect(html).not.toContain("Open resource");
  });
});
