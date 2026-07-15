"use client";

import {
  ChevronLeft,
  Maximize2,
  MonitorUp,
  PanelRight,
} from "lucide-react";
import type { Activity } from "../../lib/lms-types";

export function LearningTopbar({
  activity,
  hasPanels,
  onToggleSidebar,
  onToggleRight,
}: {
  activity: Activity | null;
  hasPanels: boolean;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Learning workspace
        </p>
        <h2 className="mt-1 truncate text-base font-semibold text-foreground">
          {activity?.title ?? "Select an activity"}
        </h2>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
          onClick={onToggleSidebar}
          title="Show or hide curriculum"
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Curriculum
        </button>
        {hasPanels ? (
          <button
            className="hidden h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted md:inline-flex"
            onClick={onToggleRight}
            title="Show or hide learning panel"
            type="button"
          >
            <PanelRight aria-hidden="true" className="h-4 w-4" />
            Right panel
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FocusModeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <Maximize2 aria-hidden="true" className="h-4 w-4" />
      {active ? "Exit focus" : "Focus"}
    </button>
  );
}

export function TheatreModeToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold whitespace-nowrap hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <MonitorUp aria-hidden="true" className="h-4 w-4" />
      {active ? "Exit theatre" : "Theatre"}
    </button>
  );
}
