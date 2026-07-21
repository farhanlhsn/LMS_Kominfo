"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Paperclip, User } from "lucide-react";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { ButtonLink, PageHeader, StatusBadge } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { api } from "../../../../lib/api-client";
import { useInstructorSubmission } from "../../../../lib/api-hooks";
import type { RubricCriterion } from "../../../../lib/lms-types";

type ScoreEntry = {
  criterionId: string;
  levelId?: string;
  points: number;
  feedback?: string;
};

export default function SubmissionReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = use(params);
  const submission = useInstructorSubmission(submissionId);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!submission.data) return;
    setFeedback(submission.data.feedback ?? "");
    setScores(
      Object.fromEntries(
        (submission.data.rubricScores ?? []).map((score) => [score.criterionId, {
          criterionId: score.criterionId,
          levelId: score.levelId ?? undefined,
          points: score.points,
          feedback: score.feedback ?? undefined,
        }]),
      ),
    );
  }, [submission.data]);

  const rubric = submission.data?.assignment?.rubric;
  const criteria = rubric?.criteria ?? [];
  const score = useMemo(
    () => Object.values(scores).reduce((sum, item) => sum + Number(item.points || 0), 0),
    [scores],
  );

  async function grade() {
    setBusy(true);
    setMessage(null);
    try {
      await api.gradeSubmission(submissionId, {
        score: criteria.length ? score : Number((document.getElementById("manual-score") as HTMLInputElement)?.value || 0),
        maxScore: rubric?.totalPoints ?? submission.data?.maxScore ?? 100,
        feedback: feedback.trim() || undefined,
        rubricScores: criteria.length ? Object.values(scores) : undefined,
      });
      setMessage("Grade submitted.");
      await submission.reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not submit grade");
    } finally {
      setBusy(false);
    }
  }

  async function returnForRevision() {
    setBusy(true);
    setMessage(null);
    try {
      await api.returnSubmission(submissionId, { feedback: feedback.trim() || undefined });
      setMessage("Submission returned for revision.");
      await submission.reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not return submission");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {submission.loading ? <LoadingState title="Loading submission" /> : submission.error || !submission.data ? (
          <ApiErrorState error={submission.error} fallbackTitle="Could not load submission" />
        ) : (
          <>
            <PageHeader
              eyebrow="Assignment grading"
              title="Review submission"
              description={submission.data.assignment?.title ?? "Assignment submission"}
              actions={
                <ButtonLink href={`/instructor/assignments/${submission.data.assignmentId}/submissions`} variant="ghost">
                  <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" /> Back to submissions
                </ButtonLink>
              }
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <section className="space-y-5">
                <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{submission.data.user?.name ?? submission.data.user?.email ?? submission.data.userId}</p>
                    <p className="truncate text-sm text-muted-foreground">{submission.data.user?.email}</p>
                  </div>
                  <StatusBadge value={submission.data.status} />
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <h2 className="mb-4 text-lg font-semibold">Submission content</h2>
                  {submission.data.textAnswer ? <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-4 text-sm leading-6">{submission.data.textAnswer}</p> : null}
                  {submission.data.linkUrl ? <a className="break-all text-sm font-semibold text-primary underline" href={submission.data.linkUrl} rel="noreferrer" target="_blank">{submission.data.linkUrl}</a> : null}
                  {submission.data.fileIds?.length ? (
                    <div className="mt-3 space-y-2">
                      {submission.data.fileIds.map((fileId) => <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm" key={fileId}><Paperclip className="h-4 w-4 text-muted-foreground" />{fileId}</div>)}
                    </div>
                  ) : null}
                  {!submission.data.textAnswer && !submission.data.linkUrl && !submission.data.fileIds?.length ? <p className="text-sm text-muted-foreground">No submission content.</p> : null}
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4 text-sm">
                  {submission.data.status === "LATE" ? <Clock className="h-5 w-5 text-warning" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  <span>{submission.data.submittedAt ? `Submitted ${new Date(submission.data.submittedAt).toLocaleString()}` : "Not submitted"}</span>
                </div>
              </section>

              <aside className="h-fit rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="mb-4 text-lg font-semibold">Grade submission</h2>
                {criteria.length ? <div className="space-y-5">
                  {criteria.map((criterion: RubricCriterion) => {
                    const current = scores[criterion.id] ?? { criterionId: criterion.id, points: 0 };
                    return <div className="space-y-2" key={criterion.id}>
                      <div className="flex justify-between gap-2 text-sm font-medium"><span>{criterion.title}</span><span>{current.points}/{criterion.maxPoints}</span></div>
                      {criterion.levels?.length ? <div className="grid gap-2">{criterion.levels.map((level) => <button className={`rounded-md border p-2 text-left text-sm ${current.levelId === level.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`} key={level.id} onClick={() => setScores((previous) => ({ ...previous, [criterion.id]: { ...current, levelId: level.id, points: level.points } }))} type="button"><span className="flex justify-between"><span>{level.title}</span><span>{level.points}</span></span>{level.description ? <span className="mt-1 block text-xs text-muted-foreground">{level.description}</span> : null}</button>)}</div> : <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" max={criterion.maxPoints} min={0} onChange={(event) => setScores((previous) => ({ ...previous, [criterion.id]: { ...current, points: Number(event.target.value) || 0 } }))} type="number" value={current.points || ""} />}
                    </div>;
                  })}
                  <p className="rounded-md bg-primary/5 p-3 text-center text-sm font-semibold">Total: {score}/{rubric?.totalPoints ?? 0}</p>
                </div> : <label className="block text-sm font-medium">Score<input className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={submission.data.score ?? ""} id="manual-score" min={0} max={submission.data.maxScore ?? 100} type="number" /></label>}
                <label className="mt-5 block text-sm font-medium">Feedback<textarea className="mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" onChange={(event) => setFeedback(event.target.value)} value={feedback} /></label>
                <div className="mt-5 grid gap-2 sm:flex">
                  <button className="min-h-10 flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy} onClick={() => void grade()} type="button">{busy ? "Saving…" : "Submit grade"}</button>
                  <button className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={busy} onClick={() => void returnForRevision()} type="button">Return</button>
                </div>
                {message ? <p className="mt-3 rounded-md bg-muted p-3 text-sm" role="status">{message}</p> : null}
              </aside>
            </div>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
