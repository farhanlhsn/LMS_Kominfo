"use client";

import { FormEvent, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/input";
import { Label } from "../ui/label";
import {
  useCreateSubmissionAnnotation,
  useDeleteSubmissionAnnotation,
  useSubmissionAnnotations,
  useUpdateSubmissionAnnotation,
} from "../../lib/api-hooks";
import type { SubmissionAnnotation } from "../../lib/lms-types";

export interface SubmissionAnnotationsProps {
  submissionId: string;
}

export function SubmissionAnnotations({ submissionId }: SubmissionAnnotationsProps) {
  const annotationsQuery = useSubmissionAnnotations(submissionId);
  const create = useCreateSubmissionAnnotation();
  const update = useUpdateSubmissionAnnotation();
  const remove = useDeleteSubmissionAnnotation();
  const [selectedText, setSelectedText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const annotations = (annotationsQuery.data ?? []) as SubmissionAnnotation[];

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!comment.trim()) {
      setError("Comment is required.");
      return;
    }
    try {
      await create(submissionId, {
        startOffset: 0,
        endOffset: (selectedText ?? "").length,
        selectedText: selectedText || "(general note)",
        comment: comment.trim(),
      });
      setSelectedText("");
      setComment("");
      await annotationsQuery.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save annotation.");
    }
  }

  async function toggleResolved(annotation: SubmissionAnnotation) {
    await update(submissionId, annotation.id, { resolved: !annotation.resolved });
    await annotationsQuery.reload();
  }

  async function deleteAnnotation(annotation: SubmissionAnnotation) {
    await remove(submissionId, annotation.id);
    await annotationsQuery.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annotations</CardTitle>
        <CardDescription>
          Add inline notes for the grader and mark sections that need attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {annotationsQuery.loading ? (
          <p className="text-sm text-muted-foreground">Loading annotations…</p>
        ) : annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No annotations yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {annotations.map((annotation) => (
              <li
                key={annotation.id}
                className="rounded-md border border-border p-3"
              >
                <p className="text-xs italic text-muted-foreground">
                  “{annotation.selectedText}”
                </p>
                <p className="mt-1">{annotation.comment}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleResolved(annotation)}
                  >
                    {annotation.resolved ? "Reopen" : "Resolve"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnnotation(annotation)}
                  >
                    Delete
                  </Button>
                  {annotation.resolved ? (
                    <span className="text-xs text-success">Resolved</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form className="space-y-2 border-t border-border pt-3" onSubmit={add}>
          <div className="space-y-1">
            <Label htmlFor="annotation-text">Highlighted text (optional)</Label>
            <Input
              id="annotation-text"
              onChange={(event) => setSelectedText(event.target.value)}
              placeholder="Quoted passage"
              value={selectedText}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="annotation-comment">Comment</Label>
            <Textarea
              id="annotation-comment"
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a note for this submission"
              value={comment}
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button size="sm" type="submit">
            Add annotation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
