"use client";

import { ExternalLink } from "lucide-react";
import type { WorkspacePanelMode } from "../../lib/lms-types";

export function openPopoutPanel(input: {
  courseId: string;
  lessonId: string;
  activityId: string;
  panel: WorkspacePanelMode;
}) {
  const params = new URLSearchParams(input);
  window.open(
    `/learn/popout?${params.toString()}`,
    "lms-popout",
    "width=460,height=760",
  );
}

export function PopoutPanelButton({
  courseId,
  lessonId,
  activityId,
  panel,
}: {
  courseId: string;
  lessonId: string;
  activityId: string;
  panel: WorkspacePanelMode;
}) {
  return (
    <button
      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => openPopoutPanel({ courseId, lessonId, activityId, panel })}
      type="button"
    >
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
      Popout
    </button>
  );
}
