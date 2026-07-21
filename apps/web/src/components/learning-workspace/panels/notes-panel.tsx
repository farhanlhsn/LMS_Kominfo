"use client";

import { type FormEvent, useState } from "react";
import { StickyNote } from "lucide-react";
import {
  useCreateLearnerNote,
  useDeleteLearnerNote,
  useLearnerNotes,
} from "../../../lib/api-hooks";
import type { Activity, Course, LearnerNote, Lesson } from "../../../lib/lms-types";
import { PopoutPanelButton } from "../workspace-popout";
import {
  PanelFrame,
  PanelList,
  TimestampNoteButton,
  formatTimestamp,
} from "./panel-shared";

export function NotesPanel({
  course,
  lesson,
  activity,
  videoTime,
  policy,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
  policy?: { allowPopout: boolean };
}) {
  const notes = useLearnerNotes({
    courseId: course.id,
    lessonId: lesson.id,
    activityId: activity.id,
  });
  const createNote = useCreateLearnerNote();
  const deleteNote = useDeleteLearnerNote();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("content") ?? "").trim();
    if (!content) return;
    setSaving(true);
    try {
      await createNote({
        courseId: course.id,
        lessonId: lesson.id,
        activityId: activity.id,
        content,
        videoTimeSeconds: Math.round(videoTime),
      });
      formElement.reset();
      await notes.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelFrame
      action={
        policy?.allowPopout !== false ? (
          <PopoutPanelButton
            activityId={activity.id}
            courseId={course.id}
            lessonId={lesson.id}
            panel="notes"
          />
        ) : null
      }
      icon={<StickyNote aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="Notes"
    >
      <TimestampNoteButton videoTime={videoTime} />
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <textarea
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="content"
          placeholder="Write a private note..."
        />
        <button
          className="inline-flex min-h-9 w-fit items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving" : "Save note"}
        </button>
      </form>
      <PanelList
        empty="No notes yet"
        error={notes.error}
        loading={notes.loading}
        items={notes.data}
        render={(note: LearnerNote) => (
          <article
            key={note.id}
            className="rounded-md border border-border bg-background p-3"
          >
            <p className="whitespace-pre-wrap text-sm leading-6">
              {note.content}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(note.videoTimeSeconds)}
              </span>
              <button
                className="text-xs font-semibold text-destructive"
                onClick={() =>
                  void deleteNote(note.id).then(() => notes.reload())
                }
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        )}
      />
    </PanelFrame>
  );
}
