"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Save } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import { useQuizAttempts } from "../../../../../lib/api-hooks";
import type { Question, QuizAnswer, QuizAttempt } from "../../../../../lib/lms-types";

type AttemptDetail = QuizAttempt & {
  answers: Array<QuizAnswer & { question: Question }>;
};

export default function QuizAttemptsPage() {
  const params = useParams<{ quizId: string }>();
  const attempts = useQuizAttempts(params.quizId);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function openAttempt(attemptId: string) {
    setDetail(await api.quizAttemptDetail(attemptId));
  }

  async function grade(event: FormEvent<HTMLFormElement>, answerId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.manualGradeAnswer(answerId, {
      pointsAwarded: Number(form.get("pointsAwarded") ?? 0),
      feedback: String(form.get("feedback") ?? ""),
    });
    setMessage("Answer graded.");
    if (detail) await openAttempt(detail.id);
    await attempts.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          breadcrumbs={[
            { label: "Quizzes", href: "/instructor/quizzes" },
            { label: "Attempts" },
          ]}
          eyebrow="Manual grading"
          title="Quiz Attempts"
          description="Review submissions and grade manual answers."
          actions={<ButtonLink href={`/instructor/quizzes/${params.quizId}`}>Back to quiz</ButtonLink>}
        />
        {attempts.loading ? (
          <LoadingState title="Loading attempts" />
        ) : attempts.error ? (
          <ApiErrorState error={attempts.error} fallbackTitle="Could not load attempts" />
        ) : attempts.data?.length ? (
          <DataTable
            columns={["Learner", "Status", "Score", "Action"]}
            rows={attempts.data.map((attempt) => [
              attempt.user?.email ?? attempt.userId,
              <StatusBadge key="status" tone={attempt.passed ? "success" : "warning"} value={attempt.status} />,
              `${Math.round(attempt.percentage)}%`,
              <button key="open" className="text-sm font-semibold text-primary" onClick={() => void openAttempt(attempt.id)} type="button">
                Review
              </button>,
            ])}
          />
        ) : (
          <EmptyState title="No attempts yet" description="Learner submissions appear here." />
        )}

        {detail ? (
          <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{detail.user?.email}</p>
                <h2 className="text-lg font-semibold">Attempt {detail.attemptNumber}</h2>
              </div>
              <StatusBadge value={`${Math.round(detail.percentage)}%`} />
            </div>
            {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
            <div className="mt-5 grid gap-4">
              {detail.answers.map((answer) => (
                <article key={answer.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {answer.question.type}
                      </p>
                      <h3 className="mt-1 font-semibold">{answer.question.prompt}</h3>
                    </div>
                    <StatusBadge value={answer.status} />
                  </div>
                  {answer.textAnswer ? (
                    <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-6">{answer.textAnswer}</p>
                  ) : null}
                  <form className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_auto]" onSubmit={(event) => void grade(event, answer.id)}>
                    <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue={answer.pointsAwarded} max={answer.maxPoints} min={0} name="pointsAwarded" type="number" />
                    <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue={answer.feedback ?? ""} name="feedback" placeholder="Feedback" />
                    <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
                      <Save aria-hidden="true" className="h-4 w-4" />
                      Grade
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </AppShell>
    </AuthGate>
  );
}
