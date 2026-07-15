"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Copy, Save } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useInstructorCourses, useInstructorQuizzes } from "../../../lib/api-hooks";
import type { Quiz } from "../../../lib/lms-types";

export default function QuizzesPage() {
  const quizzes = useInstructorQuizzes();
  const courses = useInstructorCourses();
  const [statusFilter, setStatusFilter] = useState<"" | Quiz["status"]>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = quizzes.data ?? [];
    if (!statusFilter) return list;
    return list.filter((q) => q.status === statusFilter);
  }, [quizzes.data, statusFilter]);

  async function createQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const courseId = String(form.get("courseId") ?? "").trim() || undefined;
    setBusy(true);
    try {
      const quiz = await api.createQuiz({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        courseId,
        passingScorePercent: Number(form.get("passingScorePercent") ?? 70),
        attemptLimit: Number(form.get("attemptLimit") ?? 1),
        timeLimitMinutes: Number(form.get("timeLimitMinutes") || 0) || undefined,
        showCorrectAnswers: form.get("showCorrectAnswers") === "on",
        showFeedback: true,
      });
      window.location.href = `/instructor/quizzes/${quiz.id}`;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create quiz");
      setBusy(false);
    }
  }

  async function cloneQuiz(quiz: Quiz) {
    setBusy(true);
    try {
      const detail = await api.instructorQuiz(quiz.id);
      const copy = await api.createQuiz({
        title: `${quiz.title} (copy)`,
        description: quiz.description ?? undefined,
        courseId: quiz.courseId ?? undefined,
        passingScorePercent: quiz.passingScorePercent,
        attemptLimit: quiz.attemptLimit,
        timeLimitMinutes: quiz.timeLimitMinutes ?? undefined,
        shuffleQuestions: quiz.shuffleQuestions,
        showCorrectAnswers: quiz.showCorrectAnswers,
        showFeedback: quiz.showFeedback,
      });
      for (const item of detail.questions ?? []) {
        await api.addQuizQuestion(copy.id, {
          questionId: item.questionId,
          points: item.points ?? undefined,
        });
      }
      await quizzes.reload();
      setMessage(`Cloned as draft: ${copy.title}`);
      window.location.href = `/instructor/quizzes/${copy.id}`;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(quiz: Quiz, status: Quiz["status"]) {
    setBusy(true);
    try {
      await api.updateQuiz(quiz.id, { status });
      await quizzes.reload();
      setMessage(`Quiz set to ${status}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate>
      <AppShell>
        <PageHeader
          eyebrow="Quiz engine"
          title="Quizzes"
          description="Build assessments, publish quizzes, and attach them to learning activities."
          actions={<ButtonLink href="/instructor/question-banks">Question banks</ButtonLink>}
        />
        {message ? (
          <div className="mb-4 rounded-md bg-muted px-3 py-2 text-sm" role="status">
            {message}
            <button className="ml-3 text-xs underline" onClick={() => setMessage(null)} type="button">
              dismiss
            </button>
          </div>
        ) : null}
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create quiz</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_160px_100px_100px_100px_auto]" onSubmit={createQuiz}>
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="title" placeholder="Quiz title" required />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="description" placeholder="Description" />
            <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="" name="courseId">
              <option value="">No course</option>
              {(courses.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="70" min={0} name="passingScorePercent" type="number" title="Pass %" />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="1" min={1} name="attemptLimit" type="number" title="Attempts" />
            <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="timeLimitMinutes" placeholder="Min" type="number" />
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Create
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground md:col-span-full">
              <input name="showCorrectAnswers" type="checkbox" />
              Show correct answers after submission
            </label>
          </form>
        </section>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            onChange={(e) => setStatusFilter(e.target.value as "" | Quiz["status"])}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {quizzes.loading ? (
          <LoadingState title="Loading quizzes" />
        ) : quizzes.error ? (
          <ApiErrorState error={quizzes.error} fallbackTitle="Could not load quizzes" />
        ) : filtered.length ? (
          <DataTable
            columns={["Quiz", "Status", "Questions", "Attempts", "Actions"]}
            rows={filtered.map((quiz) => [
              <a key="title" className="font-semibold text-primary" href={`/instructor/quizzes/${quiz.id}`}>
                {quiz.title}
              </a>,
              <StatusBadge
                key="status"
                tone={
                  quiz.status === "PUBLISHED"
                    ? "success"
                    : quiz.status === "ARCHIVED"
                      ? "warning"
                      : "neutral"
                }
                value={quiz.status}
              />,
              String(quiz._count?.questions ?? 0),
              <a
                key="attempts"
                className="text-sm font-semibold text-primary"
                href={`/instructor/quizzes/${quiz.id}/attempts`}
              >
                {quiz._count?.attempts ?? 0} attempts
              </a>,
              <div className="flex flex-wrap gap-2" key="actions">
                <button
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void cloneQuiz(quiz)}
                  type="button"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Clone
                </button>
                {quiz.status === "PUBLISHED" ? (
                  <button
                    className="text-sm font-semibold text-muted-foreground disabled:opacity-40"
                    disabled={busy}
                    onClick={() => void setStatus(quiz, "ARCHIVED")}
                    type="button"
                  >
                    Archive
                  </button>
                ) : null}
                {quiz.status === "ARCHIVED" ? (
                  <button
                    className="text-sm font-semibold text-primary disabled:opacity-40"
                    disabled={busy}
                    onClick={() => void setStatus(quiz, "DRAFT")}
                    type="button"
                  >
                    Unarchive
                  </button>
                ) : null}
                {quiz.status === "DRAFT" ? (
                  <a className="text-sm font-semibold text-primary" href={`/instructor/quizzes/${quiz.id}`}>
                    Edit
                  </a>
                ) : null}
              </div>,
            ])}
          />
        ) : (
          <EmptyState title="No quizzes yet" description="Create a quiz to start building an assessment." />
        )}
      </AppShell>
    </AuthGate>
  );
}
