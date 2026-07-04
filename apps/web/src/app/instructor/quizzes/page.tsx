"use client";

import type { FormEvent } from "react";
import { Save } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useInstructorQuizzes } from "../../../lib/api-hooks";

export default function QuizzesPage() {
  const quizzes = useInstructorQuizzes();

  async function createQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quiz = await api.createQuiz({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      passingScorePercent: Number(form.get("passingScorePercent") ?? 70),
      attemptLimit: Number(form.get("attemptLimit") ?? 1),
      timeLimitMinutes: Number(form.get("timeLimitMinutes") || 0) || undefined,
      showCorrectAnswers: form.get("showCorrectAnswers") === "on",
      showFeedback: true,
    });
    window.location.href = `/instructor/quizzes/${quiz.id}`;
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Quiz engine"
          title="Quizzes"
          description="Build assessments, publish quizzes, and attach them to learning activities."
          actions={<ButtonLink href="/instructor/question-banks">Question banks</ButtonLink>}
        />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create quiz</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_120px_120px_120px_auto]" onSubmit={createQuiz}>
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="title" placeholder="Quiz title" required />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="description" placeholder="Description" />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="70" min={0} name="passingScorePercent" type="number" />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="1" min={1} name="attemptLimit" type="number" />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="timeLimitMinutes" placeholder="Minutes" type="number" />
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
              <Save aria-hidden="true" className="h-4 w-4" />
              Create
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground md:col-span-full">
              <input name="showCorrectAnswers" type="checkbox" />
              Show correct answers after submission
            </label>
          </form>
        </section>

        {quizzes.loading ? (
          <LoadingState title="Loading quizzes" />
        ) : quizzes.error ? (
          <ApiErrorState error={quizzes.error} fallbackTitle="Could not load quizzes" />
        ) : quizzes.data?.length ? (
          <DataTable
            columns={["Quiz", "Status", "Questions", "Attempts"]}
            rows={quizzes.data.map((quiz) => [
              <a key="title" className="font-semibold text-primary" href={`/instructor/quizzes/${quiz.id}`}>{quiz.title}</a>,
              <StatusBadge key="status" tone={quiz.status === "PUBLISHED" ? "success" : "neutral"} value={quiz.status} />,
              String(quiz._count?.questions ?? 0),
              <a key="attempts" className="text-sm font-semibold text-primary" href={`/instructor/quizzes/${quiz.id}/attempts`}>
                {quiz._count?.attempts ?? 0} attempts
              </a>,
            ])}
          />
        ) : (
          <EmptyState title="No quizzes yet" description="Create a quiz to start building an assessment." />
        )}
      </AppShell>
    </AuthGate>
  );
}
