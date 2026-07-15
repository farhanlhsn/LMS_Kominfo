"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "lms.theme";

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function getSystemDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemDark() ? "dark" : "light";
  return mode;
}

function applyDomTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0f172a" : "#0f766e");
  }
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return "system";
}

/** Inline script: set .dark before paint to avoid flash (run in root layout). */
export const themeModeBootstrapScript = `
(function(){
  try {
    var key = ${JSON.stringify(STORAGE_KEY)};
    var mode = localStorage.getItem(key) || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = readStoredThemeMode();
    setModeState(stored);
    const next = resolveMode(stored);
    setResolved(next);
    applyDomTheme(next);
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolveMode("system");
      setResolved(next);
      applyDomTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const resolvedNext = resolveMode(next);
    setResolved(resolvedNext);
    applyDomTheme(resolvedNext);
  }, []);

  const cycleMode = useCallback(() => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const idx = order.indexOf(mode);
    setMode(order[(idx + 1) % order.length]!);
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, setMode, cycleMode }),
    [mode, resolved, setMode, cycleMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return ctx;
}

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mode, resolved, cycleMode, setMode } = useThemeMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const label =
    mode === "system"
      ? "Theme: system"
      : mode === "dark"
        ? "Theme: dark"
        : "Theme: light";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={menuOpen}
        title={label}
        onClick={() => setMenuOpen((v) => !v)}
        onContextMenu={(e) => {
          e.preventDefault();
          cycleMode();
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-subtle transition hover:text-foreground"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close theme menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-12 z-50 w-40 rounded-lg border border-border bg-card p-1 shadow-panel"
          >
            {(
              [
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ] as const
            ).map(({ value, label: itemLabel, icon: ItemIcon }) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={mode === value}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition",
                  mode === value
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
                onClick={() => {
                  setMode(value);
                  setMenuOpen(false);
                }}
              >
                <ItemIcon aria-hidden="true" className="h-4 w-4" />
                {itemLabel}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
