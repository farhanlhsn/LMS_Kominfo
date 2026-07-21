"use client";

import type { WorkspacePanelMode } from "../../lib/lms-types";
import { panelTabs } from "./workspace-config";

export function MobileWorkspaceDock({
  value,
  availablePanels,
  disabledPanels,
  onPanelChange,
}: {
  value: WorkspacePanelMode | null;
  availablePanels: Set<WorkspacePanelMode>;
  disabledPanels: Set<WorkspacePanelMode>;
  onPanelChange: (panel: WorkspacePanelMode) => void;
}) {
  return (
    <nav
      aria-label="Learning tools"
      className="absolute inset-x-0 bottom-0 z-40 flex h-14 items-stretch overflow-x-auto border-t border-border bg-card"
    >
      {panelTabs
        .filter((tab) => availablePanels.has(tab.value))
        .map((tab) => {
          const Icon = tab.icon;
          const active = value === tab.value;
          const disabled = disabledPanels.has(tab.value);
          return (
            <button
              aria-pressed={active}
              className={[
                "flex min-w-24 flex-1 flex-col items-center justify-center gap-1 px-3 text-[11px] font-semibold",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground",
              ].join(" ")}
              disabled={disabled}
              key={tab.value}
              onClick={() => onPanelChange(tab.value)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
    </nav>
  );
}
