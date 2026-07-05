"use client";

import type { FormEvent } from "react";
import { Save } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useQuestionBanks, useQuestions } from "../../../lib/api-hooks";

export default function QuestionBanksPage() {
  const banks = useQuestionBanks();
  const activeBankId = banks.data?.[0]?.id ?? null;
  const questions = useQuestions(activeBankId);

  async function createBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api.createQuestionBank({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
    });
    formElement.reset();
    await banks.reload();
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeBankId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type") ?? "MULTIPLE_CHOICE");
    const correct = String(form.get("correct") ?? "");
    const options =
      type === "ESSAY" || type === "SHORT_ANSWER" || type === "NUMERIC"
        ? []
        : ["A", "B", "C"].map((label) => ({
            text: String(form.get(`option${label}`) ?? ""),
            isCorrect: correct.split(",").map((item) => item.trim()).includes(label),
          }));
    await api.createQuestion({
      questionBankId: activeBankId,
      type,
      prompt: String(form.get("prompt") ?? ""),
      points: Number(form.get("points") ?? 1),
      acceptedAnswers: String(form.get("acceptedAnswers") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      numericTolerance: Number(form.get("numericTolerance") ?? 0),
      options,
    });
    formElement.reset();
    await questions.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Question bank"
          title="Question Banks"
          description="Create reusable assessment questions for quizzes."
          actions={<ButtonLink href="/instructor/quizzes">Open quizzes</ButtonLink>}
        />
        {banks.loading ? (
          <LoadingState title="Loading question banks" />
        ) : banks.error ? (
          <ApiErrorState error={banks.error} fallbackTitle="Could not load question banks" />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-lg font-semibold">Create bank</h2>
              <form className="mt-4 grid gap-3" onSubmit={createBank}>
                <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="title" placeholder="Bank title" required />
                <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="description" placeholder="Description" />
                <button className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                  <Save aria-hidden="true" className="h-4 w-4" />
                  Save bank
                </button>
              </form>
              <div className="mt-5 grid gap-2">
                {banks.data?.map((bank) => (
                  <article key={bank.id} className="rounded-md border border-border p-3">
                    <p className="font-semibold">{bank.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{bank.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{bank._count?.questions ?? 0} questions</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-lg font-semibold">Create question</h2>
              {!activeBankId ? (
                <EmptyState title="No bank selected" description="Create a question bank first." />
              ) : (
                <>
                  <form className="mt-4 grid gap-3" onSubmit={createQuestion}>
                    <textarea className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm" name="prompt" placeholder="Question prompt" required />
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="type">
                        {["MULTIPLE_CHOICE", "MULTIPLE_ANSWER", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY", "NUMERIC"].map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="1" min={0} name="points" type="number" />
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="A" name="correct" placeholder="Correct options e.g. A,B" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="optionA" placeholder="Option A" />
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="optionB" placeholder="Option B" />
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="optionC" placeholder="Option C" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="acceptedAnswers" placeholder="Accepted answers, comma-separated" />
                      <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="0" name="numericTolerance" type="number" />
                    </div>
                    <button className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                      <Save aria-hidden="true" className="h-4 w-4" />
                      Save question
                    </button>
                  </form>
                  <div className="mt-5">
                    {questions.loading ? (
                      <LoadingState title="Loading questions" />
                    ) : questions.data?.length ? (
                      <DataTable
                        columns={["Prompt", "Type", "Points"]}
                        rows={questions.data.map((question) => [
                          question.prompt,
                          <StatusBadge key="type" value={question.type} />,
                          String(question.points),
                        ])}
                      />
                    ) : (
                      <EmptyState title="No questions yet" description="Questions created for the first bank appear here." />
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
