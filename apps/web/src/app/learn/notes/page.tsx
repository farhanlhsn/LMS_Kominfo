"use client";

import { useState } from "react";
import {
  useCreateTranscriptNote,
  useTranscriptNotes,
} from "../../../lib/api-hooks";
import { TranscriptNoteList } from "../../../components/search/TranscriptNoteList";
import { NoteContextPanel } from "../../../components/search/NoteContextPanel";
import type { TranscriptNote, TranscriptNoteColor } from "../../../lib/lms-types";

const COLORS: TranscriptNoteColor[] = ["yellow", "green", "blue", "pink", "purple"];

export default function TranscriptNotesPage() {
  const [lessonId, setLessonId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    content: "",
    timestampSeconds: 0,
    color: "yellow" as TranscriptNoteColor,
    tags: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  const notes = useTranscriptNotes(lessonId || undefined);
  const create = useCreateTranscriptNote();
  const selected: TranscriptNote | null =
    notes.data?.find((note) => note.id === selectedId) ?? null;

  const handleCreate = async () => {
    if (!lessonId.trim() || !draft.content.trim()) {
      setStatus("Lesson and content are required.");
      return;
    }
    setStatus(null);
    try {
      await create({
        lessonId: lessonId.trim(),
        content: draft.content.trim(),
        timestampSeconds: Number(draft.timestampSeconds) || 0,
        color: draft.color,
        tags: draft.tags ? draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      });
      setDraft({ content: "", timestampSeconds: 0, color: "yellow", tags: "" });
      setStatus("Note saved.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Transcript Notes</h1>
        <p className="text-sm text-muted-foreground">
          Capture key moments from a lesson, tag them, and let the AI tutor surface related context.
        </p>
      </header>
      {status && <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs">{status}</p>}
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Quick capture</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
            placeholder="Lesson ID"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-2"
          />
          <input
            type="number"
            min={0}
            value={draft.timestampSeconds}
            onChange={(event) => setDraft((current) => ({ ...current, timestampSeconds: Number(event.target.value) }))}
            placeholder="Timestamp (seconds)"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          />
          <select
            aria-label="Color"
            value={draft.color}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value as TranscriptNoteColor }))}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <textarea
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
            placeholder="What did the instructor just say?"
            rows={3}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-3"
          />
          <input
            value={draft.tags}
            onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
            placeholder="tags (comma separated)"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-3"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Save note
        </button>
      </section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <TranscriptNoteList
            lessonId={lessonId || undefined}
            onSelect={(note) => setSelectedId(note.id)}
            selectedId={selectedId ?? undefined}
          />
        </div>
        <div>
          <NoteContextPanel note={selected} />
        </div>
      </div>
    </main>
  );
}
