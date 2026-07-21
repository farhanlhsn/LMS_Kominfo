"use client";

import { FormEvent, useMemo, useState } from "react";
import { use } from "react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import { useAssignmentSubmissions, useGradeSubmission, useReviewLateSubmission } from "../../../../../lib/api-hooks";
import { PlagiarismPanel } from "../../../../../components/advanced-assignment/plagiarism-panel";
import { SubmissionAnnotations } from "../../../../../components/advanced-assignment/submission-annotations";

export default function AssignmentSubmissionsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const submissions = useAssignmentSubmissions(assignmentId);
  const gradeSubmission = useGradeSubmission();
  const reviewLateSubmission = useReviewLateSubmission();
  const [tab, setTab] = useState<"all" | "late">("all");
  const [lateBusy, setLateBusy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkScore, setBulkScore] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedSubmission = (submissions.data ?? []).find((item) => item.id === selectedId) ?? null;
  const filteredSubmissions = useMemo(
    () => (submissions.data ?? []).filter((submission) => tab === "all" || submission.status === "LATE"),
    [submissions.data, tab],
  );

  async function grade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submissionId = String(form.get("submissionId") ?? "");
    await gradeSubmission(submissionId, {
      score: Number(form.get("score") ?? 0),
      maxScore: Number(form.get("maxScore") ?? 100),
      feedback: String(form.get("feedback") ?? ""),
    });
    event.currentTarget.reset();
    await submissions.reload();
  }

  async function bulkGrade() {
    if (!selectedIds.size || bulkScore === "") return;
    setLateBusy("bulk");
    try {
      await Promise.all([...selectedIds].map((id) => gradeSubmission(id, {
        score: Number(bulkScore),
        maxScore: 100,
        feedback: bulkFeedback.trim() || undefined,
      })));
      setSelectedIds(new Set());
      setBulkScore("");
      setBulkFeedback("");
      await submissions.reload();
    } finally {
      setLateBusy(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Assignment grading"
          title="Submissions"
          description="Review learner work, assign scores, return drafts, and provide feedback."
        />
        {submissions.loading ? (
          <LoadingState title="Loading submissions" />
        ) : submissions.error ? (
          <ApiErrorState error={submissions.error} fallbackTitle="Could not load submissions" />
        ) : submissions.data?.length ? (
          <div className="grid gap-5">
            <div className="flex gap-2"><button className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} onClick={() => setTab("all")} type="button">All submissions</button><button className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === "late" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} onClick={() => setTab("late")} type="button">Late ({submissions.data.filter((item) => item.status === "LATE").length})</button></div>
            {selectedIds.size > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"><span className="text-sm font-semibold">{selectedIds.size} selected</span><input className="h-9 w-24 rounded-md border border-input bg-card px-2 text-sm" min="0" onChange={(event) => setBulkScore(event.target.value)} placeholder="Score" type="number" value={bulkScore} /><input className="h-9 min-w-56 flex-1 rounded-md border border-input bg-card px-2 text-sm" onChange={(event) => setBulkFeedback(event.target.value)} placeholder="Shared feedback" value={bulkFeedback} /><button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!bulkScore || lateBusy === "bulk"} onClick={() => void bulkGrade()} type="button">{lateBusy === "bulk" ? "Grading…" : "Bulk grade"}</button><button className="text-sm text-muted-foreground underline" onClick={() => setSelectedIds(new Set())} type="button">Clear</button></div> : null}
            <DataTable
              columns={[<input aria-label="Select all visible submissions" checked={filteredSubmissions.length > 0 && filteredSubmissions.every((item) => selectedIds.has(item.id))} key="select" onChange={(event) => setSelectedIds(event.target.checked ? new Set(filteredSubmissions.map((item) => item.id)) : new Set())} type="checkbox" />, "Learner", "Status", "Attempt", "Score", "Submitted", "Review"]}
              rows={filteredSubmissions.map((submission) => [
                <input aria-label={`Select ${submission.user?.name ?? submission.user?.email ?? submission.userId}`} checked={selectedIds.has(submission.id)} key="select" onChange={() => toggleSelected(submission.id)} type="checkbox" />,
                submission.user?.name ?? submission.user?.email ?? submission.userId,
                <StatusBadge key="status" value={submission.status} />,
                String(submission.attemptNumber),
                submission.score != null ? `${submission.score}/${submission.maxScore ?? 0}` : "Not graded",
                submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Draft",
                <div className="flex flex-wrap gap-2" key="review"><a className="font-semibold text-primary" href={`/instructor/submissions/${submission.id}`}>Review</a><button className="text-sm font-semibold text-muted-foreground underline" onClick={() => setSelectedId(submission.id)} type="button">Details</button>{submission.status === "LATE" ? <><button className="text-sm font-semibold text-emerald-600 disabled:opacity-50" disabled={lateBusy === submission.id} onClick={() => { setLateBusy(submission.id); void reviewLateSubmission(submission.id, { action: "APPROVE" }).then(submissions.reload).finally(() => setLateBusy(null)); }} type="button">Approve</button><button className="text-sm font-semibold text-destructive disabled:opacity-50" disabled={lateBusy === submission.id} onClick={() => { const feedback = window.prompt("Reason for rejecting late submission:"); if (feedback === null) return; setLateBusy(submission.id); void reviewLateSubmission(submission.id, { action: "REJECT", feedback }).then(submissions.reload).finally(() => setLateBusy(null)); }} type="button">Reject</button></> : null}</div>,
              ])}
            />
            {!filteredSubmissions.length ? <EmptyState title="No late submissions" description="No late submissions need review." /> : null}
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Grade submission</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_120px_auto]" onSubmit={grade}>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="submissionId" required>
                  <option value="">Select submission</option>
                  {submissions.data.map((submission) => (
                    <option key={submission.id} value={submission.id}>
                      {submission.user?.email ?? submission.userId} attempt {submission.attemptNumber}
                    </option>
                  ))}
                </select>
                <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="score" type="number" min="0" placeholder="Score" />
                <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="maxScore" type="number" min="0" defaultValue="100" />
                <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Grade</button>
                <textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-full" name="feedback" placeholder="Feedback" />
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {submissions.data.map((submission) => (
                  <button key={submission.id} className="rounded-md border border-border px-3 py-2 text-xs font-semibold" onClick={() => void api.returnSubmission(submission.id, { feedback: "Returned for revision." }).then(submissions.reload)} type="button">
                    Return {submission.user?.email ?? submission.attemptNumber}
                  </button>
                ))}
              </div>
            </section>
            {selectedSubmission ? (
              <section className="grid gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Submission details ·{" "}
                    {selectedSubmission.user?.email ?? selectedSubmission.userId} attempt{" "}
                    {selectedSubmission.attemptNumber}
                  </h2>
                  <button
                    className="text-sm text-muted-foreground underline"
                    onClick={() => setSelectedId(null)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <PlagiarismPanel
                  submissionId={selectedSubmission.id}
                  textAnswer={selectedSubmission.textAnswer ?? null}
                />
                <SubmissionAnnotations submissionId={selectedSubmission.id} />
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No submissions yet" description="Learner submissions will appear here." />
        )}
      </AppShell>
    </AuthGate>
  );
}
