import { describe, expect, it } from "vitest";
import { authHeaders } from "./api-client";
import type { AuthSession } from "./lms-types";

const session: AuthSession = {
  accessToken: "tok-1",
  refreshToken: "ref-1",
  user: { id: "u1", email: "a@b.c", name: "A" },
  activeOrganization: {
    id: "org-99",
    slug: "demo",
    name: "Demo",
    permissionKeys: [],
  },
};

describe("authHeaders (F0 multi-tenant)", () => {
  it("sets Authorization and x-organization-id", () => {
    const headers = authHeaders(session, {
      "Content-Type": "application/json",
    });
    expect(headers.get("Authorization")).toBe("Bearer tok-1");
    expect(headers.get("x-organization-id")).toBe("org-99");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("omits tenant header when org id is empty", () => {
    const headers = authHeaders({
      ...session,
      activeOrganization: {
        id: "",
        slug: "",
        name: "",
        permissionKeys: [],
      },
    });
    expect(headers.get("Authorization")).toBe("Bearer tok-1");
    expect(headers.has("x-organization-id")).toBe(false);
  });

  it("works with null session", () => {
    const headers = authHeaders(null);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("x-organization-id")).toBe(false);
  });
});
