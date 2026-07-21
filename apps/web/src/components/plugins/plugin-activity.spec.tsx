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
    expect(PluginRendererRegistry.keys()).toContain("plugin.code_runner");
    expect(PluginRendererRegistry.keys()).toContain("plugin.3d_viewer");
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
      "CoreActivityEditor",
    );
  });

  it("renders code runner plugin activities with the runner UI", () => {
    const html = renderToStaticMarkup(
      createElement(PluginActivityRenderer, {
        response: {
          activity: {
            id: "activity_code",
            title: "FizzBuzz",
            activityTypeKey: "plugin.code_runner",
          },
          plugin: {
            key: "plugin.code_runner",
            name: "Code Runner Activity",
            enabled: true,
            available: true,
            placeholder: false,
            reason: "enabled",
          },
          content: {
            id: "content_code",
            activityId: "activity_code",
            textContent: "Solve the kata.",
            content: {
              language: "javascript",
              starterCode: "console.log('hello');",
            },
          },
          fileAccess: null,
        },
      }),
    );

    expect(html).toContain("Code exercise");
    expect(html).toContain("Solve the kata.");
    expect(html).not.toContain("Unsupported activity renderer");
  });

  it("renders SCORM plugin activities as runtime bridge launchers", () => {
    const html = renderToStaticMarkup(
      createElement(PluginActivityRenderer, {
        response: {
          activity: {
            id: "activity_scorm",
            title: "SCORM module",
            activityTypeKey: "plugin.scorm",
          },
          plugin: {
            key: "plugin.scorm",
            name: "SCORM Activity",
            enabled: true,
            available: true,
            placeholder: false,
            reason: "enabled",
          },
          content: {
            id: "content_scorm",
            activityId: "activity_scorm",
            externalUrl: "https://example.com/scorm/index.html",
            content: { version: "2004" },
          },
          fileAccess: null,
        },
      }),
    );

    expect(html).toContain("SCORM module");
    expect(html).toContain("runtime bridge");
    expect(html).not.toContain("placeholder runtime");
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

  it("renders practice lab launch modes for lab link activities", () => {
    const html = renderToStaticMarkup(
      createElement(PluginActivityRenderer, {
        response: {
          activity: {
            id: "activity_lab",
            title: "Lab: Practice with GPT",
            activityTypeKey: "core.link",
          },
          content: {
            id: "content_lab",
            activityId: "activity_lab",
            externalUrl: "https://chatgpt.com/",
            textContent: "Practice prompt iteration in an external lab.",
            metadata: {
              lab: {
                enabled: true,
                providerName: "ChatGPT",
                instructions: ["Read the guide", "Open the lab"],
              },
            },
          },
          fileAccess: null,
        },
      }),
    );

    expect(html).toContain("Practice lab");
    expect(html).toContain("Side by side");
    expect(html).toContain("New tab + PiP");
    expect(html).toContain("Dual monitor");
    expect(html).toContain("Choose how you want to learn");
    expect(html).not.toContain("Before you launch");
    expect(html).not.toContain("Read the guide");
  });
});
