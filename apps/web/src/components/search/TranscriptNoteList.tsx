"use client";

import { useState } from "react";
import {
  useDeleteTranscriptNote,
  useTranscriptNotes,
  useUpdateTranscriptNote,
  useExportTranscriptNotes,
} from "../../lib/api-hooks";
import type { TranscriptNote, TranscriptNoteColor } from "../../lib/lms-types";
import { cn } from "../../lib/utils";

const COLOR_CLASSES: Record<TranscriptNoteColor, string> = {
  yellow: "bg-warning/10 border-warning/30",
  green: "bg-success/10 border-success/30",
  blue: "bg-info/10 border-info/30",
  pink: "bg-pink-100 border-pink-200",
  purple: "bg-purple-100 border-purple-200",
};

const COLOR_DOT: Record<TranscriptNoteColor, string> = {
  yellow: "bg-warning",
  green: "bg-success",
  blue: "bg-info",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
};

export interface TranscriptNoteListProps {
  lessonId?: string;
  onSelect?: (note: TranscriptNote) => void;
  selectedId?: string;
  className?: string;
}

export function TranscriptNoteList({
  lessonId,
  onSelect,
  selectedId,
  className,
}: TranscriptNoteListProps) {
  const notes = useTranscriptNotes(lessonId);
  const update = useUpdateTranscriptNote();
  const remove = useDeleteTranscriptNote();
  const exportNotes = useExportTranscriptNotes();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleColor = async (note: TranscriptNote, color: TranscriptNoteColor) => {
    setBusyId(note.id);
    try {
      await update(note.id, { color });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (note: TranscriptNote) => {
    if (!confirm("Delete this note?")) return;
    setBusyId(note.id);
    try {
      await remove(note.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    setExportStatus("Generating…");
    try {
      const result = await exportNotes({ lessonId });
      setExportStatus(`Exported ${result.count} notes (${result.format})`);
    } catch (error) {
      setExportStatus((error as Error).message);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Transcript Notes</h3>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-border bg-card px-3 py-1 text-xs hover:bg-muted"
        >
          Export Markdown
        </button>
      </div>
      {exportStatus && <p className="text-xs text-muted-foreground">{exportStatus}</p>}
      {notes.loading && <p className="text-sm text-muted-foreground">Loading notes…</p>}
      {notes.error && <p className="text-sm text-destructive">{notes.error.message}</p>}
      {notes.data && notes.data.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          No notes yet. Capture a few to build your study guide.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {notes.data?.map((note) => (
          <li
            key={note.id}
            className={cn(
              "rounded-md border bg-card p-3 text-sm",
              COLOR_CLASSES[note.color],
              selectedId === note.id && "ring-2 ring-primary",
            )}
            onClick={() => onSelect?.(note)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground/80">
                {Math.floor(note.timestampSeconds)}s
              </span>
              <div className="flex items-center gap-1">
                {(Object.keys(COLOR_CLASSES) as TranscriptNoteColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Set color ${color}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleColor(note, color);
                    }}
                    className={cn(
                      "h-4 w-4 rounded-full border border-border",
                      COLOR_DOT[color],
                      note.color === color && "ring-2 ring-foreground",
                    )}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Delete note"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(note);
                  }}
                  className="ml-1 text-xs text-destructive"
                  disabled={busyId === note.id}
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
            {Array.isArray(note.tags) && (note.tags as string[]).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {(note.tags as string[]).map((tag) => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5">#{tag}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
