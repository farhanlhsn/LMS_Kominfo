import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readStoredThemeMode } from "./theme-mode";

describe("theme mode storage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to system when empty", () => {
    expect(readStoredThemeMode()).toBe("system");
  });

  it("reads valid stored modes", () => {
    store.set("lms.theme", "dark");
    expect(readStoredThemeMode()).toBe("dark");
    store.set("lms.theme", "light");
    expect(readStoredThemeMode()).toBe("light");
  });

  it("ignores invalid values", () => {
    store.set("lms.theme", "neon");
    expect(readStoredThemeMode()).toBe("system");
  });
});
