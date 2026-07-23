import { describe, expect, it } from "vitest";
import { CORE_ACTIVITY_TYPES } from "./activity";
import {
  ACCESS_CONTEXT_TYPES,
  CAPABILITY_EFFECTS,
  CAPABILITY_RISKS,
  PERMISSIONS,
  SYSTEM_ROLES,
} from "./permissions";
import {
  CORE_PLUGIN_MANIFESTS,
  INTERNAL_PLUGIN_MANIFESTS,
  MARKETPLACE_PLUGIN_MANIFESTS,
  isValidPluginCategory,
  PLUGIN_CATEGORIES,
} from "./plugins";
import * as shared from "./index";

describe("shared constants", () => {
  it("exports core activity type keys", () => {
    expect(CORE_ACTIVITY_TYPES.text).toBe("core.text");
    expect(CORE_ACTIVITY_TYPES.video).toBe("core.video");
    expect(CORE_ACTIVITY_TYPES.quiz).toBe("core.quiz");
    expect(CORE_ACTIVITY_TYPES.assignment).toBe("core.assignment");
  });

  it("exports system roles and permission keys", () => {
    expect(SYSTEM_ROLES.learner).toBe("learner");
    expect(SYSTEM_ROLES.superAdmin).toBe("super_admin");
    expect(PERMISSIONS.coursesRead).toBe("courses:read");
    expect(PERMISSIONS.platformAdmin).toBe("platform:admin");
    expect(PERMISSIONS.rolesOverride).toBe("roles:override");
    expect(ACCESS_CONTEXT_TYPES).toContain("ACTIVITY");
    expect(CAPABILITY_EFFECTS).toContain("PROHIBIT");
    expect(CAPABILITY_RISKS.dataLoss).toBeGreaterThan(0);
    expect(Object.keys(SYSTEM_ROLES).length).toBeGreaterThan(5);
    expect(Object.keys(PERMISSIONS).length).toBeGreaterThan(10);
  });

  it("lists internal plugin manifests with unique keys", () => {
    expect(INTERNAL_PLUGIN_MANIFESTS.length).toBeGreaterThan(5);
    const keys = INTERNAL_PLUGIN_MANIFESTS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("plugin.code_runner");
    expect(CORE_PLUGIN_MANIFESTS.every((m) => m.distribution === "CORE")).toBe(
      true,
    );
    expect(
      MARKETPLACE_PLUGIN_MANIFESTS.every(
        (m) => m.distribution === "MARKETPLACE",
      ),
    ).toBe(true);
    expect(CORE_PLUGIN_MANIFESTS.map((m) => m.key)).not.toContain(
      "plugin.3d_viewer",
    );
  });

  it("validates plugin categories", () => {
    for (const category of PLUGIN_CATEGORIES) {
      expect(isValidPluginCategory(category)).toBe(true);
    }
    expect(isValidPluginCategory("NOT_A_CATEGORY")).toBe(false);
    expect(isValidPluginCategory("")).toBe(false);
  });

  it("re-exports package surface from index", () => {
    expect(shared.CORE_ACTIVITY_TYPES).toBeDefined();
    expect(shared.createApiSuccess).toBeTypeOf("function");
    expect(shared.normalizePageLimit).toBeTypeOf("function");
    expect(shared.PERMISSIONS).toBeDefined();
    expect(shared.isValidPluginCategory).toBeTypeOf("function");
    expect(shared.sanitizeRichTextHtml).toBeTypeOf("function");
  });
});
