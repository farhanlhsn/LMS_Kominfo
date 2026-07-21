"use client";

import { useEffect, useState } from "react";
import {
  useGenerateNoteContext,
  useNoteContext,
} from "../../lib/api-hooks";
import type { NoteContext, TranscriptNote } from "../../lib/lms-types";
import { cn } from "../../lib/utils";

export interface NoteContextPanelProps {
  note: TranscriptNote | null;
  className?: string;
}

export function NoteContextPanel({ note, className }: NoteContextPanelProps) {
  const noteId = note?.id ?? null;
  const context = useNoteContext(noteId);
  const generate = useGenerateNoteContext();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<NoteContext | null>(null);

  useEffect(() => {
    setLatest(null);
    setStatus(null);
    setError(null);
  }, [noteId]);

  useEffect(() => {
    if (context.data) {
      setLatest(context.data);
    }
  }, [context.data]);

  if (!note) {
    return (
      <div className={cn("rounded-md border border-dashed border-border p-4", className)}>
        <p className="text-sm text-muted-foreground">Select a note to view its AI-generated context.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setStatus("Generating…");
    setError(null);
    try {
      const result = await generate(note.id, {});
      setLatest(result);
      setStatus("Context refreshed");
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    }
  };

  const data = latest ?? context.data;

  return (
    <div className={cn("flex flex-col gap-2 rounded-md border border-border bg-card p-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Context</h3>
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
        >
          {data ? "Regenerate" : "Generate"}
        </button>
      </div>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {context.loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {data && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{data.aiContextSummary}</p>
          {Array.isArray(data.relatedNotes) && data.relatedNotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Related notes</p>
              <ul className="mt-1 flex flex-col gap-1">
                {data.relatedNotes.map((related) => (
                  <li key={related.id} className="rounded-md border border-border bg-muted/40 p-2 text-xs">
                    <p className="font-semibold">Relevance {Math.round(related.relevance * 100)}%</p>
                    <p className="text-muted-foreground">{related.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.metadata && (
            <p className="text-[10px] text-muted-foreground">Provider: {data.providerKey}</p>
          )}
        </div>
      )}
      {!data && !context.loading && (
        <p className="text-xs text-muted-foreground">No context yet — click Generate to summarise.</p>
      )}
    </div>
  );
}
