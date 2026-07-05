"use client";

import { useCallback, useState } from "react";
import { LayoutGrid, Save } from "lucide-react";
import {
  useAvailablePanels,
  usePanelLayout,
  useSavePanelLayout,
} from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import { ApiErrorState, LoadingState } from "../ui/states";
import type { PanelEntry, PanelPosition, PanelSize } from "../../lib/lms-types";

const SIZE_OPTIONS: PanelSize[] = ["sm", "md", "lg"];
const POSITION_OPTIONS: PanelPosition[] = ["left", "right", "top", "bottom"];

export interface PanelGridProps {
  layoutKey: string;
  onLayoutChange?: (entries: PanelEntry[]) => void;
}

export function PanelGrid({ layoutKey, onLayoutChange }: PanelGridProps) {
  const panelsQuery = useAvailablePanels();
  const layoutQuery = usePanelLayout(layoutKey);
  const saveLayout = useSavePanelLayout();
  const [entries, setEntries] = useState<PanelEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availablePanels = panelsQuery.data ?? [];
  const savedEntries = layoutQuery.data?.panels ?? [];
  const effective = entries.length ? entries : savedEntries;

  const handleToggle = useCallback(
    (panelKey: string) => {
      setEntries((current) => {
        const base = current.length ? current : savedEntries;
        const exists = base.find((entry) => entry.panelKey === panelKey);
        if (exists) {
          return base.map((entry) =>
            entry.panelKey === panelKey ? { ...entry, visible: !entry.visible } : entry,
          );
        }
        return [
          ...base,
          { panelKey, size: "md" as PanelSize, position: "right" as PanelPosition, visible: true },
        ];
      });
    },
    [savedEntries],
  );

  const handleSize = useCallback(
    (panelKey: string, size: PanelSize) => {
      setEntries((current) => {
        const base = current.length ? current : savedEntries;
        return base.map((entry) => (entry.panelKey === panelKey ? { ...entry, size } : entry));
      });
    },
    [savedEntries],
  );

  const handlePosition = useCallback(
    (panelKey: string, position: PanelPosition) => {
      setEntries((current) => {
        const base = current.length ? current : savedEntries;
        return base.map((entry) =>
          entry.panelKey === panelKey ? { ...entry, position } : entry,
        );
      });
    },
    [savedEntries],
  );

  const handleSave = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await saveLayout(layoutKey, { panels: effective });
      setEntries([]);
      setStatus(`Saved ${result.panels.length} panel${result.panels.length === 1 ? "" : "s"}`);
      onLayoutChange?.(result.panels);
      await layoutQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save layout");
    } finally {
      setBusy(false);
    }
  }, [saveLayout, layoutKey, effective, onLayoutChange, layoutQuery]);

  if (panelsQuery.isLoading || layoutQuery.isLoading) {
    return <LoadingState title="Loading plugin panels" />;
  }
  if (panelsQuery.error) {
    return <ApiErrorState error={panelsQuery.error} />;
  }
  if (layoutQuery.error) {
    return <ApiErrorState error={layoutQuery.error} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayoutGrid aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Workspace panel layout</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure which plugin panels are visible, and where they appear in the workspace.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="text-xs text-emerald-600" role="status">
            {status}
          </p>
        ) : null}
        <ul className="space-y-2">
          {availablePanels.map((panel) => {
            const entry = effective.find((e) => e.panelKey === panel.panelKey);
            return (
              <li
                key={panel.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{panel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {panel.pluginId} • {panel.allowedRoutes.length} routes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={entry?.visible ? "success" : "neutral"}
                      value={entry?.visible ? "Visible" : "Hidden"}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(panel.panelKey)}
                    >
                      {entry?.visible ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
                {entry?.visible ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <label>
                      Size
                      <select
                        className="mt-1 w-full rounded border border-border px-2 py-1"
                        value={entry.size ?? "md"}
                        onChange={(e) => handleSize(panel.panelKey, e.target.value as PanelSize)}
                      >
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Position
                      <select
                        className="mt-1 w-full rounded border border-border px-2 py-1"
                        value={entry.position ?? "right"}
                        onChange={(e) => handlePosition(panel.panelKey, e.target.value as PanelPosition)}
                      >
                        {POSITION_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={busy}>
            <Save className="mr-2 h-4 w-4" /> {busy ? "Saving…" : "Save layout"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
