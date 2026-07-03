import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@lms/shared";
import {
  canUseContentLibrary,
  canUseFileWorkspace,
  canUseInstructorWorkspace,
  visibleNavigationKeys,
} from "./authz";
import type { AuthSession } from "./lms-types";

function session(permissionKeys: string[]): AuthSession {
  return {
    accessToken: "token",
    refreshToken: "refresh",
    user: {
      id: "user-1",
      email: "user@example.com",
      name: "User",
    },
    activeOrganization: {
      id: "org-1",
      slug: "demo",
      name: "Demo",
      permissionKeys,
      roleKeys: [],
      isPlatformAdmin: false,
    },
  };
}

describe("authz", () => {
  it("shows learner navigation without instructor tools", () => {
    expect(visibleNavigationKeys(session([PERMISSIONS.coursesRead]))).toEqual([
      "dashboard",
      "catalog",
      "my-learning",
    ]);
  });

  it("shows instructor tools when course write permissions exist", () => {
    const value = session([
      PERMISSIONS.coursesRead,
      PERMISSIONS.coursesUpdate,
    ]);

    expect(canUseInstructorWorkspace(value)).toBe(true);
    expect(visibleNavigationKeys(value)).toContain("instructor");
  });

  it("splits file and library workspaces by permission", () => {
    const value = session([
      PERMISSIONS.filesRead,
      PERMISSIONS.contentLibraryManage,
    ]);

    expect(canUseFileWorkspace(value)).toBe(true);
    expect(canUseContentLibrary(value)).toBe(true);
    expect(visibleNavigationKeys(value)).toEqual([
      "dashboard",
      "catalog",
      "my-learning",
      "files",
      "library",
    ]);
  });
});
