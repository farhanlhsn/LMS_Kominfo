"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
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

type FacilityRow = {
  questionId: string;
  prompt: string;
  type: string;
  graded: number;
  correct: number;
  facility: number | null;
};

export default function QuizAttemptsPage() {
  const params = useParams<{ quizId: string }>();
  const attempts = useQuizAttempts(params.quizId);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [facility, setFacility] = useState<FacilityRow[] | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(false);

  const submitted = useMemo(
    () =>
      (attempts.data ?? []).filter(
        (a) => a.status !== "IN_PROGRESS" && a.status !== "EXPIRED",
      ),
    [attempts.data],
  );

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

  // ponytail: client-side facility from attempt details; server aggregate if scale hurts
  async function loadFacility() {
    if (!submitted.length) {
      setFacility([]);
      return;
    }
    setFacilityLoading(true);
    try {
      const map = new Map<
        string,
        { prompt: string; type: string; graded: number; correct: number }
      >();
      // Cap sample to keep UI snappy
      const sample = submitted.slice(0, 50);
      for (const attempt of sample) {
        const d = await api.quizAttemptDetail(attempt.id);
        for (const answer of d.answers) {
          if (
            answer.status === "NEEDS_MANUAL_GRADING" ||
            answer.status === "NOT_GRADED"
          ) {
            continue;
          }
          const cur = map.get(answer.questionId) ?? {
            prompt: answer.question.prompt,
            type: answer.question.type,
            graded: 0,
            correct: 0,
          };
          cur.graded += 1;
          if (answer.isCorrect) cur.correct += 1;
          map.set(answer.questionId, cur);
        }
      }
      setFacility(
        [...map.entries()].map(([questionId, v]) => ({
          questionId,
          prompt: v.prompt,
          type: v.type,
          graded: v.graded,
          correct: v.correct,
          facility: v.graded ? Math.round((v.correct / v.graded) * 100) : null,
        })),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not compute facility");
    } finally {
      setFacilityLoading(false);
    }
  }

  return (
    <AuthGate>
      <AppShell>
        <PageHeader
          breadcrumbs={[
            { label: "Quizzes", href: "/instructor/quizzes" },
            { label: "Attempts" },
          ]}
          eyebrow="Manual grading"
          title="Quiz Attempts"
          description="Review submissions, grade essays, and check question facility."
          actions={
            <>
              <button
                className="inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-50"
                disabled={facilityLoading || !submitted.length}
                onClick={() => void loadFacility()}
                type="button"
              >
                {facilityLoading ? "Computing…" : "Question stats"}
              </button>
              <ButtonLink href={`/instructor/quizzes/${params.quizId}`}>Back to quiz</ButtonLink>
            </>
          }
        />
        {message ? (
          <p className="mb-3 text-sm text-muted-foreground">{message}</p>
        ) : null}

        {facility ? (
          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Facility (sample ≤50 attempts)</h2>
              <button
                className="text-xs font-semibold text-muted-foreground"
                onClick={() => setFacility(null)}
                type="button"
              >
                Close
              </button>
            </div>
            {facility.length ? (
              <DataTable
                columns={["Question", "Type", "Graded", "Correct %"]}
                rows={facility.map((row) => [
                  <span className="line-clamp-2" key="p">
                    {row.prompt}
                  </span>,
                  row.type,
                  String(row.graded),
                  row.facility === null ? "—" : `${row.facility}%`,
                ])}
              />
            ) : (
              <EmptyState title="No graded answers yet" description="Stats appear after graded submissions." />
            )}
          </section>
        ) : null}

        {attempts.loading ? (
          <LoadingState title="Loading attempts" />
        ) : attempts.error ? (
          <ApiErrorState error={attempts.error} fallbackTitle="Could not load attempts" />
        ) : attempts.data?.length ? (
          <DataTable
            columns={["Learner", "Status", "Score", "Action"]}
            rows={attempts.data.map((attempt) => [
              attempt.user?.email ?? attempt.userId,
              <StatusBadge
                key="status"
                tone={attempt.passed ? "success" : "warning"}
                value={attempt.status}
              />,
              `${Math.round(attempt.percentage)}%`,
              <button
                key="open"
                className="text-sm font-semibold text-primary"
                onClick={() => void openAttempt(attempt.id)}
                type="button"
              >
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
            <div className="mt-5 grid gap-4">
              {detail.answers.map((answer) => {
                const selected = answer.selectedOptionIds?.length
                  ? answer.question.options
                      .filter((o) => answer.selectedOptionIds?.includes(o.id))
                      .map((o) => o.text)
                      .join(", ")
                  : null;
                const needsGrade =
                  answer.status === "NEEDS_MANUAL_GRADING" ||
                  answer.question.type === "ESSAY";
                return (
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
                    <dl className="mt-3 grid gap-1 text-sm">
                      {selected ? (
                        <div>
                          <dt className="text-muted-foreground">Selected</dt>
                          <dd className="font-medium">{selected}</dd>
                        </div>
                      ) : null}
                      {answer.numericAnswer !== null && answer.numericAnswer !== undefined ? (
                        <div>
                          <dt className="text-muted-foreground">Numeric</dt>
                          <dd className="font-medium">{answer.numericAnswer}</dd>
                        </div>
                      ) : null}
                      {answer.textAnswer ? (
                        <div>
                          <dt className="text-muted-foreground">Text answer</dt>
                          <dd className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 leading-6">
                            {answer.textAnswer}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-muted-foreground">Points</dt>
                        <dd>
                          {answer.pointsAwarded}/{answer.maxPoints}
                        </dd>
                      </div>
                    </dl>
                    {needsGrade ? (
                      <form
                        className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_auto]"
                        onSubmit={(event) => void grade(event, answer.id)}
                      >
                        <input
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          defaultValue={answer.pointsAwarded}
                          max={answer.maxPoints}
                          min={0}
                          name="pointsAwarded"
                          type="number"
                        />
                        <input
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          defaultValue={answer.feedback ?? ""}
                          name="feedback"
                          placeholder="Feedback"
                        />
                        <button
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                          type="submit"
                        >
                          <Save aria-hidden="true" className="h-4 w-4" />
                          Grade
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </AppShell>
    </AuthGate>
  );
}
