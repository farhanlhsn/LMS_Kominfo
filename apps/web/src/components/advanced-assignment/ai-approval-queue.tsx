"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useApproveAiItem,
  useListInstructorAiItems,
  usePublishAiItem,
  useRejectAiItem,
  useUpdateAiItem,
} from "../../lib/api-hooks";
import type { AiGeneratedItem, QuestionType } from "../../lib/lms-types";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Pilihan ganda",
  MULTIPLE_ANSWER: "Multi jawaban",
  TRUE_FALSE: "Benar / salah",
  SHORT_ANSWER: "Isian singkat",
  ESSAY: "Esai",
  NUMERIC: "Numerik",
};

export interface AiApprovalQueueProps {
  activityId?: string;
  courseId?: string;
}

export function AiApprovalQueue({
  activityId,
  courseId,
}: AiApprovalQueueProps) {
  const allItems = useListInstructorAiItems({ activityId, courseId });
  const approve = useApproveAiItem();
  const reject = useRejectAiItem();
  const publish = usePublishAiItem();
  const update = useUpdateAiItem();
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const items: AiGeneratedItem[] =
    (allItems.data as unknown as AiGeneratedItem[]) ?? [];
  const pending = items.filter((item) => item.status === "DRAFT");
  const approved = items.filter((item) => item.status === "APPROVED");
  const published = items.filter((item) => item.status === "PUBLISHED");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending drafts</CardTitle>
          <CardDescription>
            Review, edit, and approve generated items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allItems.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No drafts need review.
            </p>
          ) : (
            pending.map((item) => (
              <DraftItem
                key={item.id}
                item={item}
                editing={editing === item.id}
                editPrompt={editPrompt}
                onEditPromptChange={setEditPrompt}
                onStartEdit={() => {
                  setEditing(item.id);
                  setEditPrompt(
                    String((item as { prompt?: string }).prompt ?? ""),
                  );
                }}
                onCancelEdit={() => setEditing(null)}
                onApprove={async () => {
                  await approve(item.id);
                  await allItems.refresh();
                }}
                onReject={async (reason) => {
                  await reject(item.id, reason || undefined);
                  await allItems.refresh();
                }}
                onSaveEdit={async () => {
                  await update(item.id, { prompt: editPrompt });
                  setEditing(null);
                  await allItems.refresh();
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved & published</CardTitle>
          <CardDescription>Publish approved items to learners.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {approved.length === 0 && published.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing approved yet.
            </p>
          ) : null}
          {approved.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.status}
                  {item.type === "QUIZ"
                    ? " · Publish sends questions to a new question bank"
                    : ""}
                </p>
                {item.type === "QUIZ" ? <QuizDraftPreview item={item} /> : null}
              </div>
              <Button
                onClick={async () => {
                  await publish(item.id);
                  await allItems.refresh();
                }}
              >
                {item.type === "QUIZ" ? "Publish to bank" : "Publish"}
              </Button>
            </div>
          ))}
          {published.map((item) => {
            const bankId =
              item.metadata && typeof item.metadata === "object"
                ? String(
                    (item.metadata as { questionBankId?: string })
                      .questionBankId ?? "",
                  )
                : "";
            const count =
              item.metadata && typeof item.metadata === "object"
                ? Number(
                    (item.metadata as { questionsCreated?: number })
                      .questionsCreated ?? 0,
                  )
                : 0;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.status}
                    {item.type === "QUIZ" && count
                      ? ` · ${count} questions in bank`
                      : ""}
                  </p>
                </div>
                {item.type === "QUIZ" && bankId ? (
                  <a
                    className="text-sm font-semibold text-primary"
                    href="/instructor/question-banks"
                  >
                    Open question banks
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Published
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function DraftItem({
  item,
  editing,
  editPrompt,
  onEditPromptChange,
  onStartEdit,
  onCancelEdit,
  onApprove,
  onReject,
  onSaveEdit,
}: {
  item: AiGeneratedItem;
  editing: boolean;
  editPrompt: string;
  onEditPromptChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onSaveEdit: () => Promise<void>;
}) {
  const save = useApiMutation(onSaveEdit);
  const approve = useApiMutation(onApprove);
  const reject = useApiMutation(() => onReject(rejectReason));
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">{item.title ?? item.type}</p>
          <p className="text-xs text-muted-foreground">Status: {item.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button variant="secondary" size="sm" onClick={onStartEdit}>
              Edit prompt
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={async () => {
              await approve.mutate();
            }}
            disabled={approve.loading}
          >
            {approve.loading ? "Approving…" : "Approve"}
          </Button>
          {!rejecting ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRejecting(true)}
              disabled={reject.loading}
            >
              Reject
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-40 rounded border border-input bg-background px-2 text-xs outline-none"
                placeholder="Reject reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejecting(false)}
                disabled={reject.loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await reject.mutate();
                  setRejecting(false);
                }}
                disabled={reject.loading}
              >
                {reject.loading ? "Rejecting…" : "Confirm"}
              </Button>
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={editPrompt}
            onChange={(event) => onEditPromptChange(event.target.value)}
            placeholder="Edit the generation prompt for re-use"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await save.mutate();
              }}
              disabled={save.loading}
            >
              {save.loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
      {item.type === "QUIZ" ? <QuizDraftPreview item={item} /> : null}
    </div>
  );
}

function QuizDraftPreview({ item }: { item: AiGeneratedItem }) {
  const output = item.output ?? {};
  const questions = Array.isArray(output.questions) ? output.questions : [];
  if (!questions.length) return null;

  return (
    <ul className="mt-3 max-h-72 divide-y overflow-y-auto rounded-md border">
      {questions.slice(0, 8).map((q, i) => {
        const record =
          q && typeof q === "object" && !Array.isArray(q)
            ? (q as Record<string, unknown>)
            : {};
        const prompt =
          typeof record.prompt === "string" ? record.prompt : "Question";
        const type =
          typeof record.type === "string" && record.type in QUESTION_TYPE_LABELS
            ? (record.type as QuestionType)
            : "SHORT_ANSWER";
        const options = Array.isArray(record.options)
          ? record.options.filter(
              (option): option is Record<string, unknown> =>
                Boolean(option) &&
                typeof option === "object" &&
                !Array.isArray(option) &&
                typeof (option as Record<string, unknown>).text === "string",
            )
          : [];
        const suggestedAnswer =
          typeof record.suggestedAnswer === "string"
            ? record.suggestedAnswer
            : "";

        return (
          <li key={i} className="space-y-2 p-3 text-xs">
            <div className="flex items-start gap-2">
              <span className="pt-0.5 font-medium text-muted-foreground">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {QUESTION_TYPE_LABELS[type]}
                  </span>
                  <p className="text-sm text-foreground">{prompt}</p>
                </div>
                {options.length ? (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {options.map((option, optionIndex) => (
                      <li
                        key={`${i}-${optionIndex}`}
                        className={
                          option.isCorrect === true
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        {String.fromCharCode(65 + optionIndex)}.{" "}
                        {String(option.text)}
                        {option.isCorrect === true ? " (benar)" : ""}
                      </li>
                    ))}
                  </ul>
                ) : suggestedAnswer ? (
                  <p className="text-muted-foreground">
                    Jawaban acuan: {suggestedAnswer}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
      {questions.length > 8 ? (
        <li className="p-3 text-xs text-muted-foreground">
          ...dan {questions.length - 8} soal lain
        </li>
      ) : null}
    </ul>
  );
}
