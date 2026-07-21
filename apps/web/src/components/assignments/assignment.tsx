"use client";

import { ClipboardCheck, FileUp, LinkIcon, Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  useCreateSubmission,
  useLearnerAssignment,
  useSubmitSubmission,
  useUpdateSubmission,
} from "../../lib/api-hooks";
import type { ActivityContentResponse } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";

export function AssignmentActivityRenderer({
  response,
}: {
  response: ActivityContentResponse;
}) {
  const assignmentId =
    typeof response.activity.completionRule === "object" &&
    response.activity.completionRule &&
    "assignmentId" in response.activity.completionRule
      ? String(response.activity.completionRule.assignmentId)
      : typeof response.content?.content?.assignmentId === "string"
        ? response.content.content.assignmentId
        : null;
  const state = useLearnerAssignment(assignmentId);
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  const submitSubmission = useSubmitSubmission();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubmissionId(state.data?.latestSubmission?.id ?? null);
  }, [state.data?.latestSubmission?.id]);

  if (!assignmentId) {
    return (
      <EmptyState
        title="Assignment is not attached"
        description="This activity needs an assignment before learners can submit work."
      />
    );
  }
  if (state.loading) return <LoadingState title="Loading assignment" />;
  if (state.error) {
    return <ApiErrorState error={state.error} fallbackTitle="Assignment unavailable" />;
  }
  if (!state.data) return null;

  const assignment = state.data.assignment;
  const latest = state.data.latestSubmission;
  const editable = !latest || ["DRAFT", "RETURNED", "RESUBMITTED"].includes(latest.status);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const fileIds = String(form.get("fileIds") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const payload = {
      textAnswer: String(form.get("textAnswer") ?? ""),
      linkUrl: String(form.get("linkUrl") ?? ""),
      fileIds,
    };
    try {
      const saved = submissionId
        ? await updateSubmission(submissionId, payload)
        : await createSubmission(assignment.id, payload);
      setSubmissionId(saved.id);
      setMessage("Draft saved.");
      await state.reload();
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!submissionId) return;
    setSaving(true);
    setMessage(null);
    try {
      await submitSubmission(submissionId);
      setMessage("Assignment submitted.");
      await state.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-5 shadow-subtle">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          <StatusBadge value={assignment.status} />
          <StatusBadge value={assignment.submissionType} />
        </div>
        <h2 className="mt-3 text-xl font-semibold">{assignment.title}</h2>
        {assignment.description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {assignment.description}
          </p>
        ) : null}
        {assignment.instructions ? (
          <div className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">
            {assignment.instructions}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {assignment.dueAt ? <span>Due {new Date(assignment.dueAt).toLocaleString()}</span> : null}
          {assignment.maxAttempts ? <span>{assignment.maxAttempts} attempts</span> : null}
          {latest ? <StatusBadge value={latest.status} /> : null}
        </div>
      </div>

      {assignment.rubric?.criteria?.length ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-base font-semibold">Rubric</h3>
          <div className="mt-3 grid gap-3">
            {assignment.rubric.criteria.map((criterion) => (
              <div key={criterion.id} className="rounded-md border border-border bg-background p-3">
                <p className="text-sm font-semibold">
                  {criterion.title} ({criterion.maxPoints} pts)
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {criterion.description ?? "No description."}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <form className="grid gap-3 rounded-lg border border-border bg-card p-5" onSubmit={save}>
        <h3 className="text-base font-semibold">Submission</h3>
        <textarea
          className="min-h-36 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue={latest?.textAnswer ?? ""}
          disabled={!editable || saving}
          name="textAnswer"
          placeholder="Write your answer"
        />
        <label className="grid gap-1 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <LinkIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            Link
          </span>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue={latest?.linkUrl ?? ""}
            disabled={!editable || saving}
            name="linkUrl"
            placeholder="https://"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <FileUp aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            File IDs
          </span>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue={(latest?.fileIds ?? []).join(", ")}
            disabled={!editable || saving}
            name="fileIds"
            placeholder="Attach uploaded file ids, separated by commas"
          />
        </label>
        {latest?.feedback ? (
          <div className="rounded-md border border-info/30 bg-info/10 p-3 text-sm">
            <p className="font-semibold">Instructor feedback</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{latest.feedback}</p>
          </div>
        ) : null}
        {latest?.status === "GRADED" ? (
          <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm">
            Score: {latest.score ?? 0} / {latest.maxScore ?? 0}
          </div>
        ) : null}
        {message ? <p className="text-sm font-medium text-success">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={!editable || saving}
            type="submit"
          >
            Save draft
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={!editable || !submissionId || saving}
            onClick={submit}
            type="button"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Submit
          </button>
        </div>
      </form>
    </section>
  );
}
