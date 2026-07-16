"use client";

import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useMyQuizAttempts } from "../../../lib/api-hooks";

export default function QuizAttemptsPage() {
  const attemptsQuery = useMyQuizAttempts();

  return (
    <AuthGate>
      <AppShell>
        <PageHeader
          eyebrow="Quizzes"
          title="My quiz attempts"
          description="Review your past quiz attempts and results."
        />
        {attemptsQuery.loading ? (
          <LoadingState title="Loading attempts" />
        ) : attemptsQuery.error ? (
          <ApiErrorState error={attemptsQuery.error} fallbackTitle="Could not load attempts" />
        ) : (attemptsQuery.data ?? []).length ? (
          <ul className="grid gap-3">
            {(attemptsQuery.data ?? []).map((attempt) => (
              <li key={attempt.id}>
                <a
                  className="block rounded-lg border border-border bg-card p-5 shadow-subtle hover:bg-muted/40"
                  href={`/learn/quiz-attempts/${attempt.id}/result`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Attempt {attempt.attemptNumber}
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        {attempt.quiz?.title ?? "Quiz"}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        attempt.status === "IN_PROGRESS"
                          ? "info"
                          : attempt.passed
                            ? "success"
                            : "warning"
                      }
                      value={
                        attempt.status === "IN_PROGRESS"
                          ? "In progress"
                          : attempt.status === "NEEDS_MANUAL_GRADING"
                            ? "Needs grading"
                            : attempt.passed
                              ? "Passed"
                              : "Not passed"
                      }
                    />
                  </div>
                  {attempt.status !== "IN_PROGRESS" ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {Math.round(attempt.percentage)}% · {attempt.score}/
                      {attempt.maxScore} points ·{" "}
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleString()
                        : new Date(attempt.startedAt).toLocaleString()}
                    </p>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No quiz attempts yet" description="Your completed quiz attempts will appear here." />
        )}
      </AppShell>
    </AuthGate>
  );
}
