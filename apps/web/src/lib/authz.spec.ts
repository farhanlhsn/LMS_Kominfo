import { describe, expect, it } from "vitest";
import {
  canManageQuizzes,
  canUseContentLibrary,
  canUseFileWorkspace,
  canUseInstructorWorkspace,
  hasAnyPermission,
  hasPermission,
  visibleNavigationKeys,
} from "./authz";

function buildSession(roleKeys: string[], permissionKeys: string[] = []) {
  return {
    user: { id: "u", email: "u@e.c", name: "U", avatarUrl: null, role: roleKeys[0] ?? "learner", isPlatformAdmin: false, activeOrganizationId: "o" },
    accessToken: "x",
    refreshToken: "y",
    activeOrganization: {
      id: "o",
      slug: "demo",
      name: "Demo",
      memberId: "m",
      roleKeys,
      permissionKeys,
      isPlatformAdmin: false,
    },
    expiresAt: Date.now() + 1000,
  } as any;
}

describe("authz.hasPermission", () => {
  it("returns true when the permission is granted", () => {
    expect(hasPermission(buildSession([], ["courses:read"]), "courses:read")).toBe(true);
  });

  it("returns false when the permission is missing", () => {
    expect(hasPermission(buildSession([], ["courses:read"]), "courses:update")).toBe(false);
  });

  it("returns false when no session is provided", () => {
    expect(hasPermission(null, "courses:read")).toBe(false);
  });
});

describe("authz.hasAnyPermission", () => {
  it("returns true if any permission is granted", () => {
    expect(hasAnyPermission(buildSession([], ["courses:read"]), ["courses:read", "courses:update"])).toBe(true);
  });

  it("returns false when none of the permissions are granted", () => {
    expect(hasAnyPermission(buildSession([], ["courses:read"]), ["billing:read"])).toBe(false);
  });

  it("returns true when no permissions are required and the session exists", () => {
    expect(hasAnyPermission(buildSession([], []), [])).toBe(true);
  });

  it("returns false when no permissions are required and no session is provided", () => {
    expect(hasAnyPermission(null, [])).toBe(false);
  });
});

describe("authz.workspace capabilities", () => {
  it("canUseInstructorWorkspace follows course permissions", () => {
    expect(canUseInstructorWorkspace(buildSession([], ["courses:create"]))).toBe(true);
    expect(canUseInstructorWorkspace(buildSession([], []))).toBe(false);
  });

  it("canUseFileWorkspace follows file permissions", () => {
    expect(canUseFileWorkspace(buildSession([], ["files:read"]))).toBe(true);
    expect(canUseFileWorkspace(buildSession([], []))).toBe(false);
  });

  it("canManageQuizzes and canUseContentLibrary follow dedicated permissions", () => {
    expect(canManageQuizzes(buildSession([], ["quiz:manage"]))).toBe(true);
    expect(canUseContentLibrary(buildSession([], ["content-library:manage"]))).toBe(true);
    expect(canManageQuizzes(buildSession([], []))).toBe(false);
  });
});

describe("authz.visibleNavigationKeys", () => {
  it("defaults to dashboard/catalog/my-learning for learners", () => {
    expect(visibleNavigationKeys(buildSession(["learner"]))).toEqual(["dashboard", "catalog", "my-learning"]);
  });

  it("adds instructor when courses permissions are present", () => {
    const keys = visibleNavigationKeys(buildSession([], ["courses:create"]));
    expect(keys).toContain("instructor");
  });

  it("adds admin and moderation for org_admin role", () => {
    const keys = visibleNavigationKeys(buildSession(["org_admin"]));
    expect(keys).toContain("admin");
    expect(keys).toContain("moderation");
  });

  it("always exposes the public navigation keys even without a session", () => {
    expect(visibleNavigationKeys(null)).toEqual(["dashboard", "catalog", "my-learning"]);
  });
});
