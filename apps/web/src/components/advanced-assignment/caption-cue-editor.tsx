"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useCreateCaptionCue,
  useDeleteCaptionCue,
  useListCaptionCues,
  useReorderCaptionCues,
  useUpdateCaptionCue,
} from "../../lib/api-hooks";

export interface CaptionCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface CaptionCueEditorProps {
  trackId: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds - hours * 3600 - minutes * 60;
  const whole = Math.floor(secs);
  const ms = Math.floor((secs - whole) * 1000);
  const pad = (value: number, width = 2) => value.toString().padStart(width, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(whole)}.${pad(ms, 3)}`;
  }
  return `${pad(minutes)}:${pad(whole)}.${pad(ms, 3)}`;
}

function parseTime(value: string): number | null {
  const match = value
    .trim()
    .match(/(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const millis = Number((match[4] ?? "0").padEnd(3, "0"));
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function CaptionCueEditor({ trackId }: CaptionCueEditorProps) {
  const cuesQuery = useListCaptionCues(trackId);
  const createCue = useCreateCaptionCue();
  const updateCue = useUpdateCaptionCue();
  const deleteCue = useDeleteCaptionCue();
  const reorder = useReorderCaptionCues();
  const [newStart, setNewStart] = useState("00:00.000");
  const [newEnd, setNewEnd] = useState("00:03.000");
  const [newText, setNewText] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("00:00.000");
  const [editEnd, setEditEnd] = useState("00:03.000");
  const [editText, setEditText] = useState("");

  const cues: CaptionCue[] = useMemo(
    () => ((cuesQuery.data ?? []) as CaptionCue[]),
    [cuesQuery.data],
  );

  useEffect(() => {
    if (editing === null) return;
    const cue = cues[editing];
    if (!cue) return;
    setEditStart(formatTime(cue.startSeconds));
    setEditEnd(formatTime(cue.endSeconds));
    setEditText(cue.text);
  }, [editing, cues]);

  const addCue = useApiMutation(async () => {
    const startSeconds = parseTime(newStart);
    const endSeconds = parseTime(newEnd);
    if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds) {
      return;
    }
    await createCue(trackId, {
      startSeconds,
      endSeconds,
      text: newText,
    });
    setNewText("");
    await cuesQuery.refresh();
  });

  const moveCue = useApiMutation(async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= cues.length) return;
    const permutation = cues.map((_, i) => i);
    const value = permutation[index]!;
    permutation[index] = permutation[target]!;
    permutation[target] = value;
    await reorder(trackId, permutation);
    await cuesQuery.refresh();
  });

  const saveCue = useApiMutation(async () => {
    if (editing === null) return;
    const startSeconds = parseTime(editStart);
    const endSeconds = parseTime(editEnd);
    if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds) {
      return;
    }
    await updateCue(trackId, editing, {
      startSeconds,
      endSeconds,
      text: editText,
    });
    setEditing(null);
    await cuesQuery.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caption cue editor</CardTitle>
        <CardDescription>
          Edit individual cues directly. Times use HH:MM:SS.mmm or MM:SS.mmm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[160px,160px,1fr,auto]">
          <Input
            value={newStart}
            onChange={(event) => setNewStart(event.target.value)}
            placeholder="Start"
          />
          <Input
            value={newEnd}
            onChange={(event) => setNewEnd(event.target.value)}
            placeholder="End"
          />
          <Input
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            placeholder="Cue text"
          />
          <Button
            onClick={addCue.mutate}
            disabled={addCue.loading || !newText.trim()}
          >
            {addCue.loading ? "Adding…" : "Add cue"}
          </Button>
        </div>

        {cuesQuery.loading ? (
          <p className="text-sm text-muted-foreground">Loading cues…</p>
        ) : cues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cues yet.</p>
        ) : (
          <ul className="space-y-2">
            {cues.map((cue, index) => (
              <li
                key={`${cue.startSeconds}-${index}`}
                className="rounded-md border border-border p-3"
              >
                {editing === index ? (
                  <div className="grid gap-2 md:grid-cols-[160px,160px,1fr,auto]">
                    <Input
                      value={editStart}
                      onChange={(event) => setEditStart(event.target.value)}
                    />
                    <Input
                      value={editEnd}
                      onChange={(event) => setEditEnd(event.target.value)}
                    />
                    <Textarea
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveCue.mutate} disabled={saveCue.loading}>
                        {saveCue.loading ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(cue.startSeconds)} → {formatTime(cue.endSeconds)}
                      </p>
                      <p>{cue.text}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(index)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await deleteCue(trackId, index);
                          await cuesQuery.refresh();
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await moveCue.mutate(index, -1);
                        }}
                        disabled={index === 0}
                      >
                        Up
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await moveCue.mutate(index, 1);
                        }}
                        disabled={index === cues.length - 1}
                      >
                        Down
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
