import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  apiRequest,
  clearSession,
  getSession,
  setSession,
} from "./api-client";
import type { AuthSession } from "./lms-types";

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  } as unknown as Response;
}

const baseSession: AuthSession = {
  accessToken: "access-old",
  refreshToken: "refresh-1",
  user: { id: "user-1", email: "user@example.com", name: "User" },
  activeOrganization: {
    id: "org-1",
    slug: "demo",
    name: "Demo",
    permissionKeys: ["courses.read"],
  },
};

describe("apiRequest token refresh", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: createStorage(),
      dispatchEvent: () => true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refreshes the access token on 401 and retries the request", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { message: "Access token expired" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: {
            tokens: {
              accessToken: "access-new",
              refreshToken: "refresh-2",
              expiresIn: 900,
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, data: { ok: true } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ ok: boolean }>("/protected");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/auth/refresh");

    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer access-new");

    // Tokens rotated but hydrated org context preserved.
    const stored = getSession();
    expect(stored?.accessToken).toBe("access-new");
    expect(stored?.refreshToken).toBe("refresh-2");
    expect(stored?.activeOrganization.permissionKeys).toEqual(["courses.read"]);
  });

  it("clears the session and throws when refresh fails", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { message: "expired" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { message: "Invalid refresh token" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/protected")).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(getSession()).toBeNull();
  });

  it("does not attempt refresh when there is no refresh token", async () => {
    setSession({ ...baseSession, refreshToken: undefined });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { message: "expired" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/protected")).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Session is left intact for callers that manage their own auth state.
    expect(getSession()?.accessToken).toBe("access-old");

    clearSession();
  });
});
