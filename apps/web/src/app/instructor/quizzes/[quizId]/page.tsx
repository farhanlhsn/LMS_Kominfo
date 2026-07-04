"use client";

import type { FormEvent } from "react";
import { useParams } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../components/ui/states";
import { api } from "../../../../lib/api-client";
import { useInstructorQuiz, useQuestions } from "../../../../lib/api-hooks";

export default function QuizBuilderPage() {
  const params = useParams<{ quizId: string }>();
  const quizQuery = useInstructorQuiz(params.quizId);
  const questions = useQuestions();
  const quiz = quizQuery.data;

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.addQuizQuestion(params.quizId, {
      questionId: String(form.get("questionId") ?? ""),
      points: Number(form.get("points") || 0) || undefined,
    });
    await quizQuery.reload();
  }

  async function publish() {
    await api.publishQuiz(params.quizId);
    await quizQuery.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {quizQuery.loading ? (
          <LoadingState title="Loading quiz builder" />
        ) : quizQuery.error || !quiz ? (
          <ApiErrorState error={quizQuery.error} fallbackTitle="Could not load quiz" />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Quizzes", href: "/instructor/quizzes" },
                { label: quiz.title },
              ]}
              eyebrow="Quiz builder"
              title={quiz.title}
              description={quiz.description ?? "Configure questions and publish this quiz."}
              actions={
                <>
                  <ButtonLink href={`/instructor/quizzes/${quiz.id}/attempts`} variant="secondary">
                    Attempts
                  </ButtonLink>
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={quiz.status === "PUBLISHED"}
                    onClick={() => void publish()}
                    type="button"
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    {quiz.status === "PUBLISHED" ? "Published" : "Publish"}
                  </button>
                </>
              }
            />
            <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={quiz.status === "PUBLISHED" ? "success" : "neutral"} value={quiz.status} />
                <StatusBadge value={`${quiz.passingScorePercent}% pass`} />
                <StatusBadge value={`${quiz.attemptLimit} attempts`} />
                {quiz.timeLimitMinutes ? <StatusBadge value={`${quiz.timeLimitMinutes} min`} /> : null}
              </div>
            </section>
            <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-lg font-semibold">Add question</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]" onSubmit={addQuestion}>
                <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="questionId" required>
                  <option value="">Select question</option>
                  {questions.data?.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.prompt}
                    </option>
                  ))}
                </select>
                <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="points" placeholder="Points" type="number" />
                <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add
                </button>
              </form>
            </section>
            {quiz.questions?.length ? (
              <DataTable
                columns={["Question", "Type", "Points", "Action"]}
                rows={quiz.questions.map((item) => [
                  item.question.prompt,
                  <StatusBadge key="type" value={item.question.type} />,
                  String(item.points ?? item.question.points),
                  <button
                    key="remove"
                    className="text-sm font-semibold text-destructive"
                    onClick={() =>
                      void api.removeQuizQuestion(quiz.id, item.questionId).then(() => quizQuery.reload())
                    }
                    type="button"
                  >
                    Remove
                  </button>,
                ])}
              />
            ) : (
              <EmptyState title="No questions" description="Add at least one question before publishing." />
            )}
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
