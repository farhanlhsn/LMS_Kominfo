import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PluginListingRecord } from "../../lib/lms-types";
import { PluginListingCard } from "./plugin-listing-card";

function listing(
  overrides: Partial<PluginListingRecord> = {},
): PluginListingRecord {
  return {
    id: "listing-1",
    pluginId: "plugin.3d_viewer",
    organizationId: "org-1",
    name: "3D Viewer",
    description: "Interactive models",
    longDescription: null,
    categories: ["ACTIVITY"],
    screenshots: [],
    pricing: { version: "1.0.0" },
    status: "PUBLISHED",
    submittedAt: null,
    publishedAt: "2026-07-23T00:00:00.000Z",
    reviewedBy: null,
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("PluginListingCard", () => {
  it("offers installation for a published uninstalled plugin", () => {
    const html = renderToStaticMarkup(
      createElement(PluginListingCard, {
        listing: listing(),
        onInstall: vi.fn(),
      }),
    );

    expect(html).toContain("3D Viewer");
    expect(html).toContain("plugin.3d_viewer");
    expect(html).toContain(">Install<");
  });

  it("shows active installation state and disables install", () => {
    const html = renderToStaticMarkup(
      createElement(PluginListingCard, {
        listing: listing({
          currentInstallation: {
            id: "installation-1",
            status: "ACTIVE",
            installedAt: "2026-07-23T00:00:00.000Z",
          },
        }),
        onInstall: vi.fn(),
      }),
    );

    expect(html).toContain("Installed");
    expect(html).toContain("disabled");
  });
});
