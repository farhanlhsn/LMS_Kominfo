"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import type { QuizResult } from "../../../../../lib/lms-types";

export default function QuizResultPage() {
  const params = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    void api
      .quizResult(params.attemptId)
      .then(setResult)
      .catch((caught) =>
        setError(caught instanceof Error ? caught : new Error(String(caught))),
      );
  }, [params.attemptId]);

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        {!result && !error ? (
          <LoadingState title="Loading quiz result" />
        ) : error || !result ? (
          <ApiErrorState error={error} fallbackTitle="Could not load result" />
        ) : (
          <>
            <PageHeader
              eyebrow="Quiz result"
              title={result.quiz.title}
              description={`Attempt ${result.attempt.attemptNumber}`}
            />
            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {Math.round(result.attempt.percentage)}%
                  </p>
                </div>
                <StatusBadge
                  tone={result.attempt.passed ? "success" : "warning"}
                  value={result.attempt.passed ? "Passed" : result.attempt.status}
                />
              </div>
              <div className="mt-5 grid gap-3">
                {result.quiz.questions.map((question, index) => {
                  const answer = result.answers.find(
                    (item) => item.questionId === question.id,
                  );
                  return (
                    <article key={question.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className="text-sm font-semibold">
                          {index + 1}. {question.prompt}
                        </h2>
                        {answer ? <StatusBadge value={answer.status} /> : null}
                      </div>
                      {answer?.feedback ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {answer.feedback}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
