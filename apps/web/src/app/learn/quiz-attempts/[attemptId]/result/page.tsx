"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { QuizResultPanel } from "../../../../../components/quiz/quiz";
import { PageHeader } from "../../../../../components/ui/core";
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
      <AppShell>
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
              <QuizResultPanel result={result} />
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
