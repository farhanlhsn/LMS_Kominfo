import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  apiBaseUrl,
  apiList,
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
    statusText: status === 200 ? "OK" : "ERR",
    json: async () => body,
  } as unknown as Response;
}

function emptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "ERR",
    json: async () => {
      throw new SyntaxError("no json");
    },
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

describe("apiBaseUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
  });

  it("falls back to a same-origin api path when NEXT_PUBLIC_API_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(apiBaseUrl()).toBe("/api/v1");
  });

  it("uses NEXT_PUBLIC_API_URL when provided", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api/v1";
    expect(apiBaseUrl()).toBe("https://api.example.com/api/v1");
  });
});

describe("apiRequest", () => {
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

  it("returns the data payload on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: { id: 1, name: "alpha" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ id: number; name: string }>("/items/1");

    expect(result).toEqual({ id: 1, name: "alpha" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/items/1");
    // The default fetch is GET when no method is provided.
    expect(init.method ?? "GET").toBe("GET");
  });

  it("builds the full URL using the configured API base", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const previousUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.org/api/v1";
    try {
      await apiRequest("/courses");
      const [url] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://api.example.org/api/v1/courses");
    } finally {
      if (previousUrl === undefined) {
        delete process.env.NEXT_PUBLIC_API_URL;
      } else {
        process.env.NEXT_PUBLIC_API_URL = previousUrl;
      }
    }
  });

  it("attaches a Content-Type header by default for JSON requests", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: { ok: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/items", {
      method: "POST",
      body: JSON.stringify({ name: "x" }),
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not force a Content-Type when the body is FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: { id: 1 } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.append("file", new Blob(["x"]), "file.txt");

    await apiRequest("/upload", { method: "POST", body: form });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("forwards caller-provided headers alongside the auth headers", async () => {
    setSession(baseSession);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: { ok: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/items", {
      method: "GET",
      headers: { "X-Trace-Id": "trace-1" },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("X-Trace-Id")).toBe("trace-1");
    expect(headers.get("Authorization")).toBe("Bearer access-old");
  });

  it("injects the Authorization header from the current session", async () => {
    setSession(baseSession);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/me");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-old");
  });

  it("injects the x-organization-id header from the active organization", async () => {
    setSession(baseSession);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/items");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("x-organization-id")).toBe("org-1");
  });

  it("does not inject organization or auth headers when no session exists", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/public");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("x-organization-id")).toBe(false);
  });

  it("throws an ApiClientError with structured code and details on a failure body", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(422, {
          success: false,
          error: { code: "VALIDATION", message: "Bad name", details: { field: "name" } },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    try {
      await apiRequest("/items", { method: "POST" });
      throw new Error("expected apiRequest to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiError = err as ApiClientError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe("VALIDATION");
      expect(apiError.message).toBe("Bad name");
      expect(apiError.details).toEqual({ field: "name" });
    }
  });

  it("falls back to statusText when the failure body is empty", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(500));
    vi.stubGlobal("fetch", fetchMock);

    try {
      await apiRequest("/items");
      throw new Error("expected apiRequest to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiError = err as ApiClientError;
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe("ERR");
    }
  });

  it("throws ApiClientError with the response status for non-2xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(404, {
          success: false,
          error: { message: "Not found" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/missing")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("returns the raw body when it is not wrapped in the success envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { items: [1, 2, 3] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ items: number[] }>("/items");
    expect(result).toEqual({ items: [1, 2, 3] });
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
    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall).toBeDefined();
    expect(String(refreshCall?.[0])).toContain("/auth/refresh");

    const retryCall = fetchMock.mock.calls[2];
    expect(retryCall).toBeDefined();
    const retryHeaders = retryCall?.[1]?.headers as Headers;
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

  it("does not recursively refresh when the path is /auth/refresh", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { message: "expired" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/auth/refresh", { method: "POST" })).rejects.toBeInstanceOf(
      ApiClientError,
    );
    // The refresh retry is skipped for /auth/refresh, so only the original
    // call is made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("apiList", () => {
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

  it("returns the data array and meta on success", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: { page: 1, total: 2 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiList<{ id: number }>("/items");

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.meta).toEqual({ page: 1, total: 2 });
  });

  it("returns an empty array and undefined meta on a non-success body", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { items: [{ id: 1 }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiList<{ id: number }>("/items");
    expect(result.data).toEqual([]);
    expect(result.meta).toBeUndefined();
  });

  it("uses the configured base URL for the request", async () => {
    const previousUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api/v1";
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: [], meta: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      await apiList("/catalog");
      const [url] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://api.example.com/api/v1/catalog");
    } finally {
      if (previousUrl === undefined) {
        delete process.env.NEXT_PUBLIC_API_URL;
      } else {
        process.env.NEXT_PUBLIC_API_URL = previousUrl;
      }
    }
  });

  it("forwards the organization and authorization headers", async () => {
    setSession(baseSession);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: [], meta: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiList("/items");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-old");
    expect(headers.get("x-organization-id")).toBe("org-1");
  });

  it("throws ApiClientError on a non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(500, {
          success: false,
          error: { message: "Server boom" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiList("/items")).rejects.toMatchObject({
      status: 500,
      message: "Server boom",
    });
  });

  it("refreshes the access token on 401 and retries the list request", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { message: "expired" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: { tokens: { accessToken: "access-new", refreshToken: "refresh-2" } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: [{ id: 9 }],
          meta: { page: 1 },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiList<{ id: number }>("/items");

    expect(result.data).toEqual([{ id: 9 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const retryHeaders = retryInit.headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer access-new");
    expect(getSession()?.accessToken).toBe("access-new");
  });

  it("clears the session when the list request 401s and refresh fails", async () => {
    setSession(baseSession);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { message: "expired" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { message: "bad" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiList("/items")).rejects.toBeInstanceOf(ApiClientError);
    expect(getSession()).toBeNull();
  });
});
