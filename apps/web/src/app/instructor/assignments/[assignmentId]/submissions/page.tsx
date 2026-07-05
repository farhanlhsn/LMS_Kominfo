"use client";

import { FormEvent } from "react";
import { use } from "react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import { useAssignmentSubmissions, useGradeSubmission } from "../../../../../lib/api-hooks";

export default function AssignmentSubmissionsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const submissions = useAssignmentSubmissions(assignmentId);
  const gradeSubmission = useGradeSubmission();

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
            <DataTable
              columns={["Learner", "Status", "Attempt", "Score", "Submitted"]}
              rows={submissions.data.map((submission) => [
                submission.user?.name ?? submission.user?.email ?? submission.userId,
                <StatusBadge key="status" value={submission.status} />,
                String(submission.attemptNumber),
                submission.score != null ? `${submission.score}/${submission.maxScore ?? 0}` : "Not graded",
                submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Draft",
              ])}
            />
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
          </div>
        ) : (
          <EmptyState title="No submissions yet" description="Learner submissions will appear here." />
        )}
      </AppShell>
    </AuthGate>
  );
}
