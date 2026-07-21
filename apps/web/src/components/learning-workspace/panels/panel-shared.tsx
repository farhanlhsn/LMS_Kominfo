"use client";

import type { ReactNode } from "react";
import { Bookmark } from "lucide-react";
import { ApiErrorState, LoadingState } from "../../ui/states";

export function PanelFrame({
  icon,
  title,
  action,
  children,
  scrollable = true,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div
        className={`mt-4 ${scrollable ? "min-h-0 flex-1 overflow-y-auto pr-2" : "flex min-h-0 flex-1 flex-col"}`}
      >
        {children}
      </div>
    </section>
  );
}

export function PanelList<T>({
  items,
  loading,
  error,
  empty,
  render,
}: {
  items: T[] | null;
  loading: boolean;
  error: Error | null;
  empty: string;
  render: (item: T) => ReactNode;
}) {
  if (loading) return <LoadingState title="Loading panel" />;
  if (error) return <ApiErrorState error={error} fallbackTitle="Panel error" />;
  if (!items?.length) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{empty}</p>
        <p className="mt-1">Saved items appear here.</p>
      </div>
    );
  }
  return <div className="mt-4 space-y-3">{items.map(render)}</div>;
}

export function formatTimestamp(value?: number | null) {
  const seconds = Math.max(Math.round(value ?? 0), 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function TimestampNoteButton({ videoTime }: { videoTime: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      New notes include timestamp {formatTimestamp(videoTime)} when video time
      is available.
    </p>
  );
}

export function TimestampBookmarkButton({
  videoTime,
  onClick,
}: {
  videoTime: number;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <Bookmark aria-hidden="true" className="h-4 w-4 text-primary" />
      Bookmark {formatTimestamp(videoTime)}
    </button>
  );
}

export function seekVideo(seconds: number) {
  const video = document.querySelector("video");
  if (video) {
    video.currentTime = seconds;
    void video.play().catch(() => undefined);
  }
}
