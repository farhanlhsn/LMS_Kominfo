"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Boxes,
  FileCheck2,
  Library,
  ListTree,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type {
  AiIndexedSource,
  AiQuestionScope,
  Course,
  GenerateCourseAiQuestionsInput,
  QuestionType,
} from "../../lib/lms-types";
import {
  buildAiQuestionGenerationInput,
  isAiQuestionScopeComplete,
} from "../../lib/ai-question-scope";

const INPUT =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const SCOPE_OPTIONS: Array<{
  value: AiQuestionScope;
  label: string;
  icon: typeof BookOpen;
}> = [
  { value: "COURSE", label: "Course", icon: BookOpen },
  { value: "MODULE", label: "Module", icon: Boxes },
  { value: "LESSON", label: "Lesson", icon: ListTree },
  { value: "ACTIVITY", label: "Activity", icon: FileCheck2 },
  { value: "DOCUMENTS", label: "Materials", icon: Library },
];

const QUESTION_TYPE_OPTIONS: Array<{
  value: QuestionType;
  label: string;
  description: string;
}> = [
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple choice",
    description: "One correct option",
  },
  {
    value: "MULTIPLE_ANSWER",
    label: "Multiple answer",
    description: "Several correct options",
  },
  {
    value: "TRUE_FALSE",
    label: "True / false",
    description: "Binary statement",
  },
  {
    value: "SHORT_ANSWER",
    label: "Short answer",
    description: "Brief typed response",
  },
  {
    value: "ESSAY",
    label: "Essay",
    description: "Long-form response",
  },
  {
    value: "NUMERIC",
    label: "Numeric",
    description: "Number with tolerance",
  },
];

export function AiQuestionScopeDialog({
  open,
  onOpenChange,
  course,
  sources,
  sourcesLoading,
  generating,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  sources: AiIndexedSource[];
  sourcesLoading: boolean;
  generating: boolean;
  onGenerate: (input: GenerateCourseAiQuestionsInput) => Promise<boolean>;
}) {
  const [scope, setScope] = useState<AiQuestionScope>("COURSE");
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [sourceDocumentIds, setSourceDocumentIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    "MULTIPLE_CHOICE",
    "SHORT_ANSWER",
  ]);
  const [difficulty, setDifficulty] =
    useState<GenerateCourseAiQuestionsInput["difficulty"]>("medium");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!open) return;
    setScope("COURSE");
    setModuleId("");
    setLessonId("");
    setActivityId("");
    setSourceDocumentIds([]);
    setQuestionCount(5);
    setQuestionTypes(["MULTIPLE_CHOICE", "SHORT_ANSWER"]);
    setDifficulty("medium");
    setPrompt("");
  }, [open]);

  const lessons = useMemo(
    () =>
      (course.modules ?? []).flatMap((module) =>
        module.lessons.map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
        })),
      ),
    [course.modules],
  );
  const activities = useMemo(
    () =>
      lessons.flatMap((lesson) =>
        lesson.activities.map((activity) => ({
          ...activity,
          lessonTitle: lesson.title,
        })),
      ),
    [lessons],
  );
  const lessonNames = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson.title])),
    [lessons],
  );
  const activityNames = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity.title])),
    [activities],
  );

  const selection = {
    scope,
    moduleId,
    lessonId,
    activityId,
    sourceDocumentIds,
    questionCount,
    questionTypes,
    difficulty,
    prompt,
  };
  const selectionComplete = isAiQuestionScopeComplete(selection);

  function toggleSource(id: string) {
    setSourceDocumentIds((current) =>
      current.includes(id)
        ? current.filter((sourceId) => sourceId !== id)
        : [...current, id],
    );
  }

  function toggleQuestionType(type: QuestionType) {
    setQuestionTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    );
  }

  async function submit() {
    if (!selectionComplete || generating) return;
    const input = buildAiQuestionGenerationInput(selection);
    if (await onGenerate(input)) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate questions</DialogTitle>
          <DialogDescription>
            Choose exactly which indexed knowledge AI may use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Knowledge scope
            </legend>
            <div
              aria-label="Question knowledge scope"
              className="grid grid-cols-2 gap-1 rounded-md border border-border p-1 sm:grid-cols-5"
              role="tablist"
            >
              {SCOPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = scope === option.value;
                return (
                  <button
                    aria-selected={active}
                    className={`flex min-h-10 items-center justify-center gap-1.5 rounded px-2 text-xs font-semibold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    role="tab"
                    type="button"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {scope === "MODULE" ? (
            <label className="block text-sm font-medium">
              Module
              <select
                aria-label="Module"
                className={`mt-1.5 ${INPUT}`}
                onChange={(event) => setModuleId(event.target.value)}
                value={moduleId}
              >
                <option value="">Select module</option>
                {(course.modules ?? []).map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === "LESSON" ? (
            <label className="block text-sm font-medium">
              Lesson
              <select
                aria-label="Lesson"
                className={`mt-1.5 ${INPUT}`}
                onChange={(event) => setLessonId(event.target.value)}
                value={lessonId}
              >
                <option value="">Select lesson</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.moduleTitle} / {lesson.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === "ACTIVITY" ? (
            <label className="block text-sm font-medium">
              Activity
              <select
                aria-label="Activity"
                className={`mt-1.5 ${INPUT}`}
                onChange={(event) => setActivityId(event.target.value)}
                value={activityId}
              >
                <option value="">Select activity</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.lessonTitle} / {activity.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === "DOCUMENTS" ? (
            <fieldset>
              <legend className="text-sm font-medium">Indexed materials</legend>
              <p className="mt-1 text-xs text-muted-foreground">
                Select up to 20 sources. AI cannot read unselected materials.
              </p>
              <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-border">
                {sourcesLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Loading indexed materials...
                  </p>
                ) : sources.length ? (
                  sources.map((source) => {
                    const context =
                      activityNames.get(source.activityId ?? "") ??
                      lessonNames.get(source.lessonId ?? "") ??
                      "Course material";
                    const checked = sourceDocumentIds.includes(source.id);
                    return (
                      <label
                        className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
                        key={source.id}
                      >
                        <input
                          checked={checked}
                          className="mt-0.5 h-4 w-4"
                          disabled={!checked && sourceDocumentIds.length >= 20}
                          onChange={() => toggleSource(source.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {source.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {context} | {source.sourceType} |{" "}
                            {source.chunkCount} chunks
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No indexed materials. Run Index course knowledge first.
                  </p>
                )}
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="text-sm font-medium">Question types</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Select one or more types. Mixed drafts rotate through selected
              types.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPE_OPTIONS.map((option) => {
                const checked = questionTypes.includes(option.value);
                return (
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={checked}
                      className="mt-0.5 h-4 w-4"
                      onChange={() => toggleQuestionType(option.value)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {!questionTypes.length ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                Select at least one question type.
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Question count
              <input
                aria-label="Question count"
                className={`mt-1.5 ${INPUT}`}
                max={20}
                min={1}
                onChange={(event) =>
                  setQuestionCount(
                    Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
                type="number"
                value={questionCount}
              />
            </label>
            <label className="text-sm font-medium">
              Difficulty
              <select
                aria-label="Difficulty"
                className={`mt-1.5 ${INPUT}`}
                onChange={(event) =>
                  setDifficulty(
                    event.target
                      .value as GenerateCourseAiQuestionsInput["difficulty"],
                  )
                }
                value={difficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Additional instruction
            <textarea
              aria-label="Additional instruction"
              className="mt-1.5 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Optional: focus on practical application and common misconceptions."
              value={prompt}
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted"
            disabled={generating}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectionComplete || generating}
            onClick={() => void submit()}
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Generate draft"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
