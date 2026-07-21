"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save, Send } from "lucide-react";
import { AuthGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../components/ui/states";
import { api } from "../../../../lib/api-client";
import { useInstructorQuiz, useQuestionBanks, useQuestions } from "../../../../lib/api-hooks";
import type { QuestionType } from "../../../../lib/lms-types";

const TYPE_FILTERS: Array<"" | QuestionType> = [
  "",
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "NUMERIC",
];

export default function QuizBuilderPage() {
  const params = useParams<{ quizId: string }>();
  const quizQuery = useInstructorQuiz(params.quizId);
  const banks = useQuestionBanks();
  const [bankId, setBankId] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | QuestionType>("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [poolBankId, setPoolBankId] = useState("");
  const [poolCount, setPoolCount] = useState(3);
  const [poolType, setPoolType] = useState<"" | QuestionType>("");
  const questions = useQuestions(bankId || null);
  const quiz = quizQuery.data;
  const locked = quiz?.status === "PUBLISHED" || quiz?.status === "ARCHIVED";

  const randomPools = useMemo(() => {
    const raw = quiz?.metadata?.randomPools;
    if (!Array.isArray(raw)) return [] as Array<{ bankId: string; count: number; type?: string }>;
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const rec = item as { bankId?: string; count?: number; type?: string };
        if (!rec.bankId || !rec.count) return null;
        return { bankId: rec.bankId, count: Number(rec.count), type: rec.type };
      })
      .filter(Boolean) as Array<{ bankId: string; count: number; type?: string }>;
  }, [quiz?.metadata]);

  const addedIds = useMemo(
    () => new Set(quiz?.questions?.map((q) => q.questionId) ?? []),
    [quiz?.questions],
  );

  const available = useMemo(() => {
    const needle = pickerSearch.trim().toLowerCase();
    return (questions.data ?? []).filter((q) => {
      if (addedIds.has(q.id)) return false;
      if (typeFilter && q.type !== typeFilter) return false;
      if (needle && !q.prompt.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [questions.data, addedIds, typeFilter, pickerSearch]);

  const ordered = useMemo(
    () => [...(quiz?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [quiz?.questions],
  );

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.addQuizQuestion(params.quizId, {
        questionId: String(form.get("questionId") ?? ""),
        points: Number(form.get("points") || 0) || undefined,
      });
      event.currentTarget.reset();
      await quizQuery.reload();
      setMessage("Question added");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add question");
    } finally {
      setBusy(false);
    }
  }

  async function addRandom(count: number) {
    if (locked || !available.length) return;
    const n = Math.min(Math.max(1, count), available.length);
    // Fisher–Yates pick without dep
    const pool = [...available];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = t;
    }
    const pick = pool.slice(0, n);
    setBusy(true);
    try {
      for (const q of pick) {
        await api.addQuizQuestion(params.quizId, { questionId: q.id });
      }
      await quizQuery.reload();
      setMessage(`Added ${pick.length} random question(s)`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add random questions");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.updateQuiz(params.quizId, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? "") || undefined,
        passingScorePercent: Number(form.get("passingScorePercent") ?? 70),
        attemptLimit: Number(form.get("attemptLimit") ?? 1),
        timeLimitMinutes: Number(form.get("timeLimitMinutes") || 0) || undefined,
        shuffleQuestions: form.get("shuffleQuestions") === "on",
        showCorrectAnswers: form.get("showCorrectAnswers") === "on",
        showFeedback: form.get("showFeedback") === "on",
        metadata: {
          ...(quiz?.metadata ?? {}),
          randomPools,
        },
      });
      await quizQuery.reload();
      setMessage("Settings saved");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  async function saveRandomPools(
    next: Array<{ bankId: string; count: number; type?: string }>,
  ) {
    if (locked) return;
    setBusy(true);
    try {
      await api.updateQuiz(params.quizId, {
        metadata: {
          ...(quiz?.metadata ?? {}),
          randomPools: next,
        },
      });
      await quizQuery.reload();
      setMessage("Random pools updated");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update pools");
    } finally {
      setBusy(false);
    }
  }

  function addPool() {
    if (!poolBankId || poolCount < 1) return;
    void saveRandomPools([
      ...randomPools,
      {
        bankId: poolBankId,
        count: poolCount,
        ...(poolType ? { type: poolType } : {}),
      },
    ]);
  }

  function removePool(index: number) {
    void saveRandomPools(randomPools.filter((_, i) => i !== index));
  }

  async function move(index: number, dir: -1 | 1) {
    if (locked || !ordered.length) return;
    const next = index + dir;
    if (next < 0 || next >= ordered.length) return;
    const ids = ordered.map((q) => q.id);
    const tmp = ids[index]!;
    ids[index] = ids[next]!;
    ids[next] = tmp;
    setBusy(true);
    try {
      await api.reorderQuizQuestions(params.quizId, ids);
      await quizQuery.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not reorder");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (locked || (!ordered.length && !randomPools.length)) return;
    setBusy(true);
    try {
      await api.publishQuiz(params.quizId);
      await quizQuery.reload();
      setMessage("Quiz published");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  const bankTitle = useMemo(() => {
    const map = new Map((banks.data ?? []).map((b) => [b.id, b.title]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [banks.data]);

  return (
    <AuthGate>
      <AppShell>
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
                  <ButtonLink href="/instructor/question-banks" variant="secondary">
                    Question banks
                  </ButtonLink>
                  <ButtonLink href={`/instructor/quizzes/${quiz.id}/attempts`} variant="secondary">
                    Attempts
                  </ButtonLink>
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={
                      locked ||
                      busy ||
                      (!ordered.length && !randomPools.length)
                    }
                    onClick={() => void publish()}
                    type="button"
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    {locked ? quiz.status : "Publish"}
                  </button>
                </>
              }
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Settings</h2>
                <StatusBadge tone={locked ? "success" : "neutral"} value={quiz.status} />
                {locked ? (
                  <span className="text-xs text-muted-foreground">
                    {quiz.status === "ARCHIVED"
                      ? "Archived quizzes are locked. Unarchive from the quiz list to edit."
                      : "Published quizzes are locked for editing."}
                  </span>
                ) : null}
              </div>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={saveSettings}>
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm md:col-span-2"
                  defaultValue={quiz.title}
                  disabled={locked}
                  name="title"
                  placeholder="Title"
                  required
                />
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm md:col-span-2"
                  defaultValue={quiz.description ?? ""}
                  disabled={locked}
                  name="description"
                  placeholder="Description"
                />
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Pass %</span>
                  <input
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    defaultValue={quiz.passingScorePercent}
                    disabled={locked}
                    min={0}
                    name="passingScorePercent"
                    type="number"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Attempt limit</span>
                  <input
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    defaultValue={quiz.attemptLimit}
                    disabled={locked}
                    min={1}
                    name="attemptLimit"
                    type="number"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Time limit (minutes)</span>
                  <input
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    defaultValue={quiz.timeLimitMinutes ?? ""}
                    disabled={locked}
                    min={1}
                    name="timeLimitMinutes"
                    placeholder="None"
                    type="number"
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input defaultChecked={quiz.shuffleQuestions} disabled={locked} name="shuffleQuestions" type="checkbox" />
                    Shuffle questions
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input defaultChecked={quiz.showCorrectAnswers} disabled={locked} name="showCorrectAnswers" type="checkbox" />
                    Show correct answers
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input defaultChecked={quiz.showFeedback} disabled={locked} name="showFeedback" type="checkbox" />
                    Show feedback
                  </label>
                </div>
                {!locked ? (
                  <button
                    className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={busy}
                    type="submit"
                  >
                    <Save className="h-4 w-4" />
                    Save settings
                  </button>
                ) : null}
              </form>
            </section>

            <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-lg font-semibold">Random pools (per attempt)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each attempt draws N questions from a bank. Different from “add random” which fixes picks now.
              </p>
              {randomPools.length ? (
                <ul className="mt-3 grid gap-2 text-sm">
                  {randomPools.map((pool, index) => (
                    <li
                      key={`${pool.bankId}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <span>
                        {pool.count} from <strong>{bankTitle(pool.bankId)}</strong>
                        {pool.type ? ` · ${pool.type}` : ""}
                      </span>
                      {!locked ? (
                        <button
                          className="text-sm font-semibold text-destructive"
                          disabled={busy}
                          onClick={() => removePool(index)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No pools yet.</p>
              )}
              {!locked ? (
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_100px_160px_auto]">
                  <select
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    onChange={(e) => setPoolBankId(e.target.value)}
                    value={poolBankId}
                  >
                    <option value="">Select bank</option>
                    {banks.data?.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    min={1}
                    onChange={(e) => setPoolCount(Number(e.target.value) || 1)}
                    type="number"
                    value={poolCount}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    onChange={(e) => setPoolType(e.target.value as "" | QuestionType)}
                    value={poolType}
                  >
                    <option value="">Any type</option>
                    {TYPE_FILTERS.filter(Boolean).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={busy || !poolBankId}
                    onClick={addPool}
                    type="button"
                  >
                    Add pool
                  </button>
                </div>
              ) : null}
            </section>

            {!locked ? (
              <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="text-lg font-semibold">Add question (fixed)</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <select
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    onChange={(e) => setBankId(e.target.value)}
                    value={bankId}
                  >
                    <option value="">All banks</option>
                    {banks.data?.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    onChange={(e) => setTypeFilter(e.target.value as "" | QuestionType)}
                    value={typeFilter}
                  >
                    {TYPE_FILTERS.map((t) => (
                      <option key={t || "all"} value={t}>
                        {t || "All types"}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search prompt…"
                    value={pickerSearch}
                  />
                </div>
                <form className="mt-3 grid gap-3 md:grid-cols-[1fr_100px_auto]" onSubmit={addQuestion}>
                  <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="questionId" required>
                    <option value="">Select question ({available.length})</option>
                    {available.map((question) => (
                      <option key={question.id} value={question.id}>
                        [{question.type}] {question.prompt.slice(0, 80)}
                      </option>
                    ))}
                  </select>
                  <input className="h-10 rounded-md border border-input bg-card px-3 text-sm" name="points" placeholder="Points" type="number" />
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={busy || available.length === 0}
                    type="submit"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add
                  </button>
                </form>
                {available.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Random from filtered pool:</span>
                    {[1, 3, 5].map((n) => (
                      <button
                        key={n}
                        className="rounded-md border border-border px-2 py-1 font-semibold text-primary disabled:opacity-40"
                        disabled={busy || available.length < n}
                        onClick={() => void addRandom(n)}
                        type="button"
                      >
                        +{n}
                      </button>
                    ))}
                    <button
                      className="rounded-md border border-border px-2 py-1 font-semibold text-primary disabled:opacity-40"
                      disabled={busy}
                      onClick={() => {
                        const raw = window.prompt(
                          `How many? (max ${available.length})`,
                          String(Math.min(5, available.length)),
                        );
                        const n = Number(raw);
                        if (n > 0) void addRandom(n);
                      }}
                      type="button"
                    >
                      Custom…
                    </button>
                  </div>
                ) : null}
                {!questions.loading && available.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No available questions{bankId ? " in this bank" : ""}.{" "}
                    <a className="font-semibold text-primary" href="/instructor/question-banks">
                      Manage question banks
                    </a>
                  </p>
                ) : null}
              </section>
            ) : null}

            {ordered.length ? (
              <DataTable
                columns={["#", "Question (fixed)", "Type", "Points", "Actions"]}
                rows={ordered.map((item, index) => [
                  String(index + 1),
                  item.question.prompt,
                  <StatusBadge key="type" value={item.question.type} />,
                  String(item.points ?? item.question.points),
                  <div className="flex flex-wrap gap-2" key="actions">
                    {!locked ? (
                      <>
                        <button
                          aria-label="Move up"
                          className="text-primary disabled:opacity-30"
                          disabled={busy || index === 0}
                          onClick={() => void move(index, -1)}
                          type="button"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Move down"
                          className="text-primary disabled:opacity-30"
                          disabled={busy || index === ordered.length - 1}
                          onClick={() => void move(index, 1)}
                          type="button"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          className="text-sm font-semibold text-destructive"
                          disabled={busy}
                          onClick={() =>
                            void api
                              .removeQuizQuestion(quiz.id, item.questionId)
                              .then(() => quizQuery.reload())
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    )}
                  </div>,
                ])}
              />
            ) : randomPools.length ? (
              <EmptyState
                title="Pools only"
                description="This quiz uses random pools only — no fixed questions."
              />
            ) : (
              <EmptyState
                title="No questions"
                description="Add fixed questions and/or a random pool before publishing."
              />
            )}
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
