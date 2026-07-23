"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, Download, Eye, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { ButtonLink, DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { QuestionStemImage } from "../../../components/quiz/question-image";
import { useInstructorCourses, useQuestionBanks, useQuestions } from "../../../lib/api-hooks";
import type { Question, QuestionType } from "../../../lib/lms-types";
import { questionImageFileId, questionTags } from "../../../lib/lms-types";
import {
  csvToQuestions,
  downloadText,
  questionsToCsv,
} from "../../../lib/question-csv";
import {
  allTagsFromQuestions,
  mergeTags,
  metadataWithTags,
  parseTagInput,
} from "../../../lib/question-tags";
import { cn } from "../../../lib/utils";

const QUESTION_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "NUMERIC",
];

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  MULTIPLE_ANSWER: "Multiple answer",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
  ESSAY: "Essay",
  NUMERIC: "Numeric",
};

type OptionDraft = { text: string; isCorrect: boolean; feedback: string };

function defaultOptions(type: QuestionType): OptionDraft[] {
  if (type === "TRUE_FALSE") {
    return [
      { text: "True", isCorrect: true, feedback: "" },
      { text: "False", isCorrect: false, feedback: "" },
    ];
  }
  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_ANSWER") {
    return [
      { text: "", isCorrect: true, feedback: "" },
      { text: "", isCorrect: false, feedback: "" },
      { text: "", isCorrect: false, feedback: "" },
    ];
  }
  return [];
}

function needsOptions(type: QuestionType) {
  return type === "MULTIPLE_CHOICE" || type === "MULTIPLE_ANSWER" || type === "TRUE_FALSE";
}

function needsAccepted(type: QuestionType) {
  return type === "SHORT_ANSWER" || type === "NUMERIC";
}

function optionsFromQuestion(q: Question): OptionDraft[] {
  if (q.options?.length) {
    return q.options.map((o) => ({
      text: o.text,
      isCorrect: Boolean(o.isCorrect),
      feedback: o.feedback ?? "",
    }));
  }
  return defaultOptions(q.type);
}

function buildPayload(form: {
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  options: OptionDraft[];
  acceptedAnswers: string;
  numericTolerance: number;
}) {
  const options = needsOptions(form.type)
    ? form.options
        .filter((o) => o.text.trim())
        .map((o, i) => ({
          text: o.text.trim(),
          isCorrect: o.isCorrect,
          orderIndex: i,
          feedback: o.feedback.trim() || undefined,
        }))
    : [];

  return {
    type: form.type,
    prompt: form.prompt.trim(),
    explanation: form.explanation.trim() || undefined,
    points: form.points,
    acceptedAnswers: needsAccepted(form.type)
      ? form.acceptedAnswers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    numericTolerance: form.type === "NUMERIC" ? form.numericTolerance : undefined,
    options,
  };
}

export default function QuestionBanksPage() {
  const banks = useQuestionBanks();
  const courses = useInstructorCourses();
  const [activeBankId, setActiveBankId] = useState<string | null>(null);
  const questions = useQuestions(activeBankId);
  const [type, setType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [options, setOptions] = useState<OptionDraft[]>(() => defaultOptions("MULTIPLE_CHOICE"));
  const [editing, setEditing] = useState<Question | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState(1);
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [numericTolerance, setNumericTolerance] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [imageFileId, setImageFileId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | QuestionType>("");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const question of questions.data ?? []) {
      const category = question.metadata?.category;
      if (typeof category === "string" && category.trim()) values.add(category.trim());
    }
    return [...values].sort();
  }, [questions.data]);

  useEffect(() => {
    if (!banks.data?.length) {
      setActiveBankId(null);
      return;
    }
    const first = banks.data[0];
    if (first && (!activeBankId || !banks.data.some((b) => b.id === activeBankId))) {
      setActiveBankId(first.id);
    }
  }, [banks.data, activeBankId]);

  const activeBank = useMemo(
    () => banks.data?.find((b) => b.id === activeBankId) ?? null,
    [banks.data, activeBankId],
  );

  const availableTags = useMemo(
    () => allTagsFromQuestions(questions.data ?? []),
    [questions.data],
  );

  const filteredQuestions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (questions.data ?? []).filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (categoryFilter && item.metadata?.category !== categoryFilter) return false;
      if (tagFilter && !questionTags(item).map((t) => t.toLowerCase()).includes(tagFilter)) {
        return false;
      }
      if (!needle) return true;
      const tags = questionTags(item).join(" ");
      return (
        item.prompt.toLowerCase().includes(needle) || tags.toLowerCase().includes(needle)
      );
    });
  }, [questions.data, search, typeFilter, tagFilter, categoryFilter]);

  async function saveCategoryForSelected() {
    const category = categoryInput.trim();
    if (!category || !selectedIds.size) return;
    setSaving(true);
    try {
      await Promise.all([...selectedIds].map((id) => {
        const question = (questions.data ?? []).find((item) => item.id === id);
        return api.updateQuestion(id, { metadata: { ...(question?.metadata ?? {}), category } });
      }));
      setCategoryInput("");
      await questions.reload();
      flash(true, "Category assigned");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not assign category");
    } finally {
      setSaving(false);
    }
  }

  const courseTitle = useMemo(() => {
    const map = new Map((courses.data ?? []).map((c) => [c.id, c.title]));
    return (id?: string | null) => (id ? map.get(id) ?? "Course" : "Org-wide");
  }, [courses.data]);

  function flash(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
  }

  function resetForm() {
    setEditing(null);
    setType("MULTIPLE_CHOICE");
    setOptions(defaultOptions("MULTIPLE_CHOICE"));
    setPrompt("");
    setExplanation("");
    setPoints(1);
    setAcceptedAnswers("");
    setNumericTolerance(0);
    setTagInput("");
    setImageFileId(null);
  }

  function startEdit(q: Question) {
    setEditing(q);
    setPreview(null);
    setType(q.type);
    setOptions(optionsFromQuestion(q));
    setPrompt(q.prompt);
    setExplanation(q.explanation ?? "");
    setPoints(q.points);
    setAcceptedAnswers((q.acceptedAnswers ?? []).join(", "));
    setNumericTolerance(q.numericTolerance ?? 0);
    setTagInput(questionTags(q).join(", "));
    setImageFileId(questionImageFileId(q));
  }

  async function uploadStemImage(file: File) {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "CONTENT");
      const asset = await api.uploadFile(fd);
      setImageFileId(asset.id);
      flash(true, "Image attached");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const ids = filteredQuestions.map((q) => q.id);
      const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allOn) {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }

  function changeType(next: QuestionType) {
    setType(next);
    if (!editing) setOptions(defaultOptions(next));
    else if (needsOptions(next) && !needsOptions(type)) setOptions(defaultOptions(next));
    else if (!needsOptions(next)) setOptions([]);
  }

  function setOptionCorrect(index: number, checked: boolean) {
    setOptions((prev) =>
      prev.map((o, i) => {
        if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
          return { ...o, isCorrect: i === index };
        }
        return i === index ? { ...o, isCorrect: checked } : o;
      }),
    );
  }

  async function createBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const courseId = String(form.get("courseId") ?? "").trim() || undefined;
    setSaving(true);
    try {
      const bank = await api.createQuestionBank({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        courseId,
      });
      formElement.reset();
      await banks.reload();
      setActiveBankId(bank.id);
      flash(true, "Bank created");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not create bank");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeBankId) return;

    if (needsOptions(type)) {
      const filled = options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        flash(false, "Add at least two options");
        return;
      }
      if (!filled.some((o) => o.isCorrect)) {
        flash(false, "Mark at least one correct option");
        return;
      }
    }
    if (type === "SHORT_ANSWER" && !acceptedAnswers.trim()) {
      flash(false, "Add at least one accepted answer");
      return;
    }
    if (type === "NUMERIC" && !acceptedAnswers.trim()) {
      flash(false, "Add the correct numeric value");
      return;
    }

    const tags = parseTagInput(tagInput);
    const meta = metadataWithTags(editing?.metadata, tags);
    if (imageFileId) meta.imageFileId = imageFileId;
    else delete meta.imageFileId;
    const body = {
      ...buildPayload({
        type,
        prompt,
        explanation,
        points,
        options,
        acceptedAnswers,
        numericTolerance,
      }),
      metadata: meta,
    };

    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateQuestion(editing.id, body);
        const forked =
          updated &&
          typeof updated === "object" &&
          "forkedFrom" in updated &&
          Boolean((updated as { forkedFrom?: string }).forkedFrom);
        flash(
          true,
          forked
            ? "Question is in a published quiz — saved as a new copy"
            : "Question updated",
        );
      } else {
        await api.createQuestion({ questionBankId: activeBankId, ...body });
        flash(true, "Question created");
      }
      resetForm();
      await questions.reload();
      await banks.reload();
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not save question");
    } finally {
      setSaving(false);
    }
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected question(s)?`)) return;
    setSaving(true);
    try {
      for (const id of selectedIds) await api.deleteQuestion(id);
      setSelectedIds(new Set());
      if (editing && selectedIds.has(editing.id)) resetForm();
      await questions.reload();
      await banks.reload();
      flash(true, "Deleted selected questions");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkMove(targetBankId: string) {
    if (!selectedIds.size || !targetBankId) return;
    setSaving(true);
    try {
      for (const id of selectedIds) {
        await api.updateQuestion(id, { questionBankId: targetBankId });
      }
      setSelectedIds(new Set());
      resetForm();
      setPreview(null);
      await questions.reload();
      await banks.reload();
      flash(true, "Moved selected questions");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Bulk move failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkTag(mode: "add" | "set") {
    if (!selectedIds.size) return;
    const raw = window.prompt(
      mode === "add" ? "Tags to add (comma-separated)" : "Replace tags (comma-separated)",
      "",
    );
    if (raw === null) return;
    const tags = parseTagInput(raw);
    setSaving(true);
    try {
      for (const q of questions.data ?? []) {
        if (!selectedIds.has(q.id)) continue;
        const next =
          mode === "add" ? mergeTags(questionTags(q), tags) : tags;
        await api.updateQuestion(q.id, {
          metadata: metadataWithTags(q.metadata, next),
        });
      }
      await questions.reload();
      flash(true, mode === "add" ? "Tags added" : "Tags replaced");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Bulk tag failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(q: Question) {
    if (!window.confirm(`Delete question?\n\n${q.prompt.slice(0, 120)}`)) return;
    setSaving(true);
    try {
      await api.deleteQuestion(q.id);
      if (editing?.id === q.id) resetForm();
      if (preview?.id === q.id) setPreview(null);
      await questions.reload();
      await banks.reload();
      flash(true, "Question deleted");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not delete question");
    } finally {
      setSaving(false);
    }
  }

  async function renameBank() {
    if (!activeBank) return;
    const title = window.prompt("Bank title", activeBank.title)?.trim();
    if (!title || title === activeBank.title) return;
    setSaving(true);
    try {
      await api.updateQuestionBank(activeBank.id, { title });
      await banks.reload();
      flash(true, "Bank renamed");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not rename bank");
    } finally {
      setSaving(false);
    }
  }

  async function removeBank() {
    if (!activeBank) return;
    if (
      !window.confirm(
        `Delete bank "${activeBank.title}"? Questions in this bank will be removed from the bank list.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await api.deleteQuestionBank(activeBank.id);
      setActiveBankId(null);
      resetForm();
      setPreview(null);
      await banks.reload();
      flash(true, "Bank deleted");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not delete bank");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateQuestion(q: Question) {
    if (!activeBankId) return;
    setSaving(true);
    try {
      await api.createQuestion({
        questionBankId: activeBankId,
        type: q.type,
        prompt: `${q.prompt} (copy)`,
        explanation: q.explanation ?? undefined,
        points: q.points,
        acceptedAnswers: q.acceptedAnswers ?? [],
        numericTolerance: q.numericTolerance ?? undefined,
        options: (q.options ?? []).map((o, i) => ({
          text: o.text,
          isCorrect: Boolean(o.isCorrect),
          orderIndex: i,
          feedback: o.feedback ?? undefined,
        })),
      });
      await questions.reload();
      await banks.reload();
      flash(true, "Question duplicated");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not duplicate");
    } finally {
      setSaving(false);
    }
  }

  async function moveQuestion(q: Question, targetBankId: string) {
    if (!targetBankId || targetBankId === q.questionBankId) return;
    setSaving(true);
    try {
      await api.updateQuestion(q.id, { questionBankId: targetBankId });
      if (editing?.id === q.id) resetForm();
      if (preview?.id === q.id) setPreview(null);
      await questions.reload();
      await banks.reload();
      flash(true, "Question moved");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not move question");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const list = questions.data ?? [];
    if (!list.length) {
      flash(false, "No questions to export");
      return;
    }
    const name = (activeBank?.title ?? "questions").replace(/[^\w.-]+/g, "_");
    downloadText(`${name}.csv`, questionsToCsv(list));
    flash(true, `Exported ${list.length} questions`);
  }

  async function importCsv(file: File) {
    if (!activeBankId) return;
    setSaving(true);
    try {
      const text = await file.text();
      const rows = csvToQuestions(text);
      if (!rows.length) {
        flash(false, "CSV has no valid question rows");
        return;
      }
      let ok = 0;
      for (const row of rows) {
        await api.createQuestion({
          questionBankId: activeBankId,
          type: row.type,
          prompt: row.prompt,
          points: row.points,
          explanation: row.explanation,
          acceptedAnswers: row.acceptedAnswers ?? [],
          numericTolerance: row.numericTolerance,
          options: row.options ?? [],
        });
        ok += 1;
      }
      await questions.reload();
      await banks.reload();
      flash(true, `Imported ${ok} questions`);
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Import failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <AppShell>
        <PageHeader
          breadcrumbs={[
            { label: "Quizzes", href: "/instructor/quizzes" },
            { label: "Question banks" },
          ]}
          eyebrow="Question bank"
          title="Question Banks"
          description="Create reusable assessment questions, organized by bank."
          actions={<ButtonLink href="/instructor/quizzes">Open quizzes</ButtonLink>}
        />

        {feedback ? (
          <div
            className={cn(
              "mb-4 rounded-md px-3 py-2 text-sm font-medium",
              feedback.ok ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive",
            )}
            role="status"
          >
            {feedback.msg}
            <button className="ml-3 text-xs underline" onClick={() => setFeedback(null)} type="button">
              dismiss
            </button>
          </div>
        ) : null}

        {banks.loading ? (
          <LoadingState title="Loading question banks" />
        ) : banks.error ? (
          <ApiErrorState error={banks.error} fallbackTitle="Could not load question banks" />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-lg font-semibold">Banks</h2>
              <form className="mt-4 grid gap-3" onSubmit={createBank}>
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="title"
                  placeholder="Bank title"
                  required
                />
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="description"
                  placeholder="Description"
                />
                <select
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  defaultValue=""
                  name="courseId"
                >
                  <option value="">Org-wide bank</option>
                  {(courses.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  disabled={saving}
                  type="submit"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Create bank
                </button>
              </form>
              <div className="mt-5 grid gap-2">
                {banks.data?.length ? (
                  banks.data.map((bank) => {
                    const selected = bank.id === activeBankId;
                    return (
                      <div
                        key={bank.id}
                        className={cn(
                          "rounded-md border p-3 transition-colors",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <button
                          className="w-full text-left"
                          onClick={() => {
                            setActiveBankId(bank.id);
                            resetForm();
                            setPreview(null);
                          }}
                          type="button"
                        >
                          <p className="font-semibold">{bank.title}</p>
                          {bank.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{bank.description}</p>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {bank._count?.questions ?? 0} questions · {courseTitle(bank.courseId)}
                          </p>
                        </button>
                        {selected ? (
                          <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                            <button
                              className="text-xs font-semibold text-primary"
                              disabled={saving}
                              onClick={() => void renameBank()}
                              type="button"
                            >
                              Rename
                            </button>
                            <button
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                              disabled={saving}
                              onClick={exportCsv}
                              type="button"
                            >
                              <Download className="h-3 w-3" />
                              Export CSV
                            </button>
                            <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary">
                              <Upload className="h-3 w-3" />
                              Import CSV
                              <input
                                accept=".csv,text/csv"
                                className="sr-only"
                                disabled={saving}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) void importCsv(f);
                                }}
                                type="file"
                              />
                            </label>
                            <button
                              className="text-xs font-semibold text-destructive"
                              disabled={saving}
                              onClick={() => void removeBank()}
                              type="button"
                            >
                              Delete bank
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState title="No banks yet" description="Create a bank to start adding questions." />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {editing ? "Edit question" : "Create question"}
                  {activeBank ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      in {activeBank.title}
                    </span>
                  ) : null}
                </h2>
                {editing ? (
                  <button
                    className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
                    onClick={resetForm}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    Cancel edit
                  </button>
                ) : null}
              </div>

              {!activeBankId ? (
                <EmptyState title="No bank selected" description="Create or select a question bank first." />
              ) : (
                <>
                  <form className="mt-4 grid gap-3" onSubmit={saveQuestion}>
                    <textarea
                      className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm"
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Question prompt"
                      required
                      value={prompt}
                    />
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-primary">
                        {uploadingImage ? "Uploading…" : "Attach image"}
                        <input
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingImage || saving}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void uploadStemImage(f);
                          }}
                          type="file"
                        />
                      </label>
                      {imageFileId ? (
                        <>
                          <span className="text-xs text-muted-foreground">Image attached</span>
                          <button
                            className="text-xs font-semibold text-destructive"
                            onClick={() => setImageFileId(null)}
                            type="button"
                          >
                            Remove
                          </button>
                          <div className="w-full max-w-md">
                            <QuestionStemImage metadata={{ imageFileId }} />
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <select
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          onChange={(e) => changeType(e.target.value as QuestionType)}
                          value={type}
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">Points</span>
                        <input
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          min={0}
                          onChange={(e) => setPoints(Number(e.target.value) || 0)}
                          type="number"
                          value={points}
                        />
                      </label>
                    </div>

                    {needsOptions(type) ? (
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {type === "TRUE_FALSE"
                              ? "Correct answer"
                              : type === "MULTIPLE_ANSWER"
                                ? "Options (check all correct)"
                                : "Options (pick one correct)"}
                          </p>
                          {type !== "TRUE_FALSE" ? (
                            <button
                              className="text-xs font-semibold text-primary"
                              onClick={() =>
                                setOptions((prev) => [
                                  ...prev,
                                  { text: "", isCorrect: false, feedback: "" },
                                ])
                              }
                              type="button"
                            >
                              + Add option
                            </button>
                          ) : null}
                        </div>
                        {options.map((opt, index) => (
                          <>
                            <div className="flex items-center gap-2" key={index}>
                            <input
                              aria-label={
                                type === "MULTIPLE_ANSWER" ? "Correct option" : "Mark as correct"
                              }
                              checked={opt.isCorrect}
                              className="h-4 w-4"
                              onChange={(e) => setOptionCorrect(index, e.target.checked)}
                              type={type === "MULTIPLE_ANSWER" ? "checkbox" : "radio"}
                              name="correct-option"
                            />
                            <input
                              className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
                              onChange={(e) =>
                                setOptions((prev) =>
                                  prev.map((o, i) =>
                                    i === index ? { ...o, text: e.target.value } : o,
                                  ),
                                )
                              }
                              placeholder={`Option ${index + 1}`}
                              readOnly={type === "TRUE_FALSE"}
                              value={opt.text}
                            />
                             {type !== "TRUE_FALSE" && options.length > 2 ? (
                              <button
                                aria-label="Remove option"
                                className="text-destructive"
                                onClick={() =>
                                  setOptions((prev) => prev.filter((_, i) => i !== index))
                                }
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                          {type !== "TRUE_FALSE" ? (
                            <input
                              className="ml-6 h-9 flex-1 rounded-md border border-input bg-card px-3 text-xs text-muted-foreground"
                              onChange={(e) =>
                                setOptions((prev) =>
                                  prev.map((o, i) =>
                                    i === index ? { ...o, feedback: e.target.value } : o,
                                  ),
                                )
                              }
                              placeholder="Option feedback (shown after attempt)"
                              value={opt.feedback}
                            />
                          ) : null}
                          </>
                        ))}
                      </div>
                    ) : null}

                    {type === "SHORT_ANSWER" ? (
                      <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">
                          Accepted answers (comma-separated)
                        </span>
                        <input
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          onChange={(e) => setAcceptedAnswers(e.target.value)}
                          placeholder="e.g. paris, Paris"
                          value={acceptedAnswers}
                        />
                      </label>
                    ) : null}

                    {type === "NUMERIC" ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                          <span className="text-muted-foreground">Correct value</span>
                          <input
                            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                            onChange={(e) => setAcceptedAnswers(e.target.value)}
                            placeholder="e.g. 42"
                            value={acceptedAnswers}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-muted-foreground">Tolerance</span>
                          <input
                            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                            min={0}
                            onChange={(e) => setNumericTolerance(Number(e.target.value) || 0)}
                            type="number"
                            value={numericTolerance}
                          />
                        </label>
                      </div>
                    ) : null}

                    {type === "ESSAY" ? (
                      <p className="text-sm text-muted-foreground">
                        Essay answers are graded manually after submission.
                      </p>
                    ) : null}

                    <label className="grid gap-1 text-sm">
                      <span className="text-muted-foreground">Explanation (optional)</span>
                      <textarea
                        className="min-h-16 rounded-md border border-input bg-card px-3 py-2 text-sm"
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Shown as feedback when enabled on the quiz"
                        value={explanation}
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-muted-foreground">Tags (comma-separated)</span>
                      <input
                        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                        list="question-tag-suggestions"
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="e.g. midterm, chapter-1"
                        value={tagInput}
                      />
                      <datalist id="question-tag-suggestions">
                        {availableTags.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </label>

                    <button
                      className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      disabled={saving}
                      type="submit"
                    >
                      <Save aria-hidden="true" className="h-4 w-4" />
                      {editing ? "Update question" : "Save question"}
                    </button>
                  </form>

                  {preview ? (
                    <div className="mt-5 rounded-md border border-border bg-muted/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Preview</p>
                        <button
                          className="text-xs font-semibold text-muted-foreground"
                          onClick={() => setPreview(null)}
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                      <p className="font-medium">{preview.prompt}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {TYPE_LABELS[preview.type]} · {preview.points} pts
                      </p>
                      {needsOptions(preview.type) ? (
                        <ul className="mt-3 grid gap-1 text-sm">
                          {preview.options.map((o) => (
                            <li key={o.id}>
                              {o.isCorrect ? "✓ " : "○ "}
                              {o.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {needsAccepted(preview.type) && preview.acceptedAnswers?.length ? (
                        <p className="mt-3 text-sm">
                          Accepted: {preview.acceptedAnswers.join(", ")}
                          {preview.type === "NUMERIC" && preview.numericTolerance
                            ? ` (±${preview.numericTolerance})`
                            : ""}
                        </p>
                      ) : null}
                      {preview.explanation ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Explanation: {preview.explanation}
                        </p>
                      ) : null}
                      {questionTags(preview).length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Tags: {questionTags(preview).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5">
                    {(questions.data?.length ?? 0) > 0 ? (
                      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_160px_140px]">
                        <input
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search prompt or tags…"
                          value={search}
                        />
                        <select
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          onChange={(e) => setTypeFilter(e.target.value as "" | QuestionType)}
                          value={typeFilter}
                        >
                          <option value="">All types</option>
                          {QUESTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                          onChange={(e) => setTagFilter(e.target.value)}
                          value={tagFilter}
                        >
                          <option value="">All tags</option>
                          {availableTags.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" onChange={(e) => setCategoryFilter(e.target.value)} value={categoryFilter}>
                          <option value="">All categories</option>
                          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </div>
                    ) : null}
                    {selectedIds.size > 0 ? (
                      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-medium">{selectedIds.size} selected</span>
                        <button
                          className="font-semibold text-primary"
                          disabled={saving}
                          onClick={() => void bulkTag("add")}
                          type="button"
                        >
                          Add tags
                        </button>
                        <button
                          className="font-semibold text-primary"
                          disabled={saving}
                          onClick={() => void bulkTag("set")}
                          type="button"
                        >
                          Set tags
                        </button>
                        {(banks.data?.length ?? 0) > 1 ? (
                          <select
                            aria-label="Bulk move"
                            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                            defaultValue=""
                            disabled={saving}
                            onChange={(e) => {
                              const v = e.target.value;
                              e.target.value = "";
                              if (v) void bulkMove(v);
                            }}
                          >
                            <option value="">Move to…</option>
                            {banks.data
                              ?.filter((b) => b.id !== activeBankId)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title}
                                </option>
                              ))}
                          </select>
                        ) : null}
                        <input className="h-8 w-36 rounded-md border border-input bg-card px-2 text-xs" onChange={(event) => setCategoryInput(event.target.value)} placeholder="Category" value={categoryInput} />
                        <button className="font-semibold text-primary" disabled={saving || !categoryInput.trim()} onClick={() => void saveCategoryForSelected()} type="button">Set category</button>
                        <button
                          className="font-semibold text-destructive"
                          disabled={saving}
                          onClick={() => void bulkDelete()}
                          type="button"
                        >
                          Delete
                        </button>
                        <button
                          className="text-muted-foreground underline"
                          onClick={() => setSelectedIds(new Set())}
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {questions.loading ? (
                      <LoadingState title="Loading questions" />
                    ) : questions.error ? (
                      <ApiErrorState
                        error={questions.error}
                        fallbackTitle="Could not load questions"
                      />
                    ) : questions.data?.length ? (
                      filteredQuestions.length ? (
                        <DataTable
                          columns={[
                            <label className="inline-flex items-center gap-1" key="sel">
                              <input
                                checked={
                                  filteredQuestions.length > 0 &&
                                  filteredQuestions.every((q) => selectedIds.has(q.id))
                                }
                                onChange={toggleSelectAllFiltered}
                                type="checkbox"
                              />
                            </label>,
                            "Prompt",
                            "Type",
                            "Tags",
                            "Category",
                            "Points",
                            "Actions",
                          ]}
                          rows={filteredQuestions.map((question) => [
                            <input
                              key="cb"
                              checked={selectedIds.has(question.id)}
                              onChange={() => toggleSelect(question.id)}
                              type="checkbox"
                            />,
                            <span className="line-clamp-2" key="prompt">
                              {question.prompt}
                            </span>,
                            <StatusBadge key="type" value={TYPE_LABELS[question.type] ?? question.type} />,
                            <span className="text-xs text-muted-foreground" key="tags">
                              {questionTags(question).join(", ") || "—"}
                            </span>,
                            <span className="text-xs text-muted-foreground" key="category">{typeof question.metadata?.category === "string" ? question.metadata.category : "—"}</span>,
                            String(question.points),
                            <div className="flex flex-wrap items-center gap-2" key="actions">
                              <button
                                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                                onClick={() => setPreview(question)}
                                type="button"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Preview
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                                onClick={() => startEdit(question)}
                                type="button"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                                disabled={saving}
                                onClick={() => void duplicateQuestion(question)}
                                type="button"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Dup
                              </button>
                              {(banks.data?.length ?? 0) > 1 ? (
                                <select
                                  aria-label="Move to bank"
                                  className="h-8 max-w-[9rem] rounded-md border border-input bg-card px-2 text-xs"
                                  defaultValue=""
                                  disabled={saving}
                                  onChange={(e) => {
                                    const target = e.target.value;
                                    e.target.value = "";
                                    if (target) void moveQuestion(question, target);
                                  }}
                                >
                                  <option value="">Move…</option>
                                  {banks.data
                                    ?.filter((b) => b.id !== activeBankId)
                                    .map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.title}
                                      </option>
                                    ))}
                                </select>
                              ) : null}
                              <button
                                className="inline-flex items-center gap-1 text-sm font-semibold text-destructive"
                                disabled={saving}
                                onClick={() => void removeQuestion(question)}
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>,
                          ])}
                        />
                      ) : (
                        <EmptyState
                          title="No matches"
                          description="Try a different search or type filter."
                        />
                      )
                    ) : (
                      <EmptyState
                        title="No questions yet"
                        description="Add a question to this bank. It can be reused across quizzes."
                      />
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
