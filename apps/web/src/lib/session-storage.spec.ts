import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, getSession, setSession } from "./api-client";

const SESSION_KEY = "lms.session.v1";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
}

const sampleSession = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  user: {
    id: "u1",
    email: "a@b.c",
    name: "Tester",
    avatarUrl: null,
    role: "learner",
    isPlatformAdmin: false,
  },
  activeOrganization: {
    id: "org-1",
    slug: "demo",
    name: "Demo",
    roleKeys: ["learner"],
    permissionKeys: [],
    isPlatformAdmin: false,
  },
  expiresAt: Date.now() + 60_000,
};

beforeEach(() => {
  const storage = createMemoryStorage();
  const dispatchEvent = vi.fn();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage, dispatchEvent });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api-client session storage", () => {
  it("returns null when no session is stored", () => {
    expect(getSession()).toBeNull();
  });

  it("persists session in localStorage and reads it back", () => {
    setSession(sampleSession as any);
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "{}");
    expect(stored.accessToken).toBe("access-1");

    const loaded = getSession();
    expect(loaded?.user.id).toBe("u1");
    expect(loaded?.activeOrganization.id).toBe("org-1");
  });

  it("ignores malformed session payloads", () => {
    localStorage.setItem(SESSION_KEY, "{not-json");
    expect(getSession()).toBeNull();
  });

  it("clearSession removes the entry and notifies listeners", () => {
    setSession(sampleSession as any);
    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(getSession()).toBeNull();
  });
});
