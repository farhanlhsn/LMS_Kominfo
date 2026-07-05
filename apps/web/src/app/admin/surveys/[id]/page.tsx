"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, ButtonLink, StatusBadge } from "../../../../components/ui/core";
import { SurveyQuestionList, SurveyResponseList } from "../../../../components/experiences/experiences-views";
import {
  useAddSurveyQuestion,
  useDeleteSurvey,
  useRemoveSurveyQuestion,
  useSubmitSurveyResponse,
  useSurvey,
  useSurveyResponses,
  useUpdateSurvey,
} from "../../../../lib/api-hooks";

const QUESTION_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "RATING",
  "SCALE",
  "YES_NO",
] as const;

export default function AdminSurveyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const surveyId = params?.id;
  const query = useSurvey(surveyId ?? null);
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();
  const addQuestion = useAddSurveyQuestion();
  const removeQuestion = useRemoveSurveyQuestion();
  const submitResponse = useSubmitSurveyResponse();
  const responses = useSurveyResponses(surveyId ?? null);
  const [qType, setQType] = useState<typeof QUESTION_TYPES[number]>("SHORT_TEXT");
  const [qPrompt, setQPrompt] = useState("");
  const [qRequired, setQRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState("");

  const survey = query.data;

  const handleAddQuestion = async () => {
    if (!surveyId) return;
    if (!qPrompt.trim()) {
      setError("Prompt is required");
      return;
    }
    setError(null);
    try {
      await addQuestion(surveyId, { type: qType, prompt: qPrompt.trim(), required: qRequired });
      setQPrompt("");
      setQRequired(false);
      await query.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    }
  };

  const handleToggleStatus = async () => {
    if (!survey) return;
    const nextStatus = survey.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    await updateSurvey(survey.id, { status: nextStatus });
    await query.reload();
  };

  const handleDelete = async () => {
    if (!survey) return;
    if (!window.confirm("Delete this survey and all responses?")) return;
    await deleteSurvey(survey.id);
    router.push("/admin/surveys");
  };

  const handleSubmitPreview = async () => {
    const firstQuestion = survey?.questions[0];
    if (!survey || !firstQuestion) return;
    await submitResponse(survey.id, {
      answers: [
        { questionId: firstQuestion.id, value: previewAnswer || "Preview answer" },
      ],
    });
    setPreviewAnswer("");
    await responses.reload();
    await query.reload();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Survey"
        title={survey?.title ?? "Loading…"}
        description={survey?.description ?? undefined}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Surveys", href: "/admin/surveys" },
          { label: survey?.title ?? "Detail" },
        ]}
        actions={
          <div className="flex gap-2">
            {survey ? (
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                onClick={handleToggleStatus}
                type="button"
              >
                {survey.status === "PUBLISHED" ? "Close" : "Publish"}
              </button>
            ) : null}
            <ButtonLink href="/admin/surveys" variant="secondary">
              ← Back
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Questions</h2>
          <SurveyQuestionList survey={survey ?? null} />
          <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-subtle">
            <h3 className="text-sm font-semibold">Add question</h3>
            <div className="mt-3 grid gap-2">
              <select
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                onChange={(e) => setQType(e.target.value as typeof qType)}
                value={qType}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="Question prompt"
                value={qPrompt}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={qRequired}
                  onChange={(e) => setQRequired(e.target.checked)}
                  type="checkbox"
                />
                Required
              </label>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <button
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={handleAddQuestion}
                type="button"
              >
                Add question
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Responses</h2>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              value={`${survey?._count?.responses ?? 0} responses`}
              tone="info"
            />
            {survey ? (
              <button
                className="ml-auto rounded-md border border-destructive px-3 py-1 text-xs font-medium text-destructive"
                onClick={handleDelete}
                type="button"
              >
                Delete survey
              </button>
            ) : null}
          </div>
          <SurveyResponseList responses={(responses.data ?? []) as any} />

          {survey && survey.questions.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-subtle">
              <h3 className="text-sm font-semibold">Submit preview response</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Useful for testing the live flow.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
                  onChange={(e) => setPreviewAnswer(e.target.value)}
                  placeholder="Answer to first question"
                  value={previewAnswer}
                />
                <button
                  className="rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  onClick={handleSubmitPreview}
                  type="button"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : null}

          {survey?.questions?.length ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Question management</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {survey.questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                  >
                    <span className="truncate">{q.prompt}</span>
                    <button
                      className="rounded border border-destructive px-2 py-0.5 text-xs text-destructive"
                      onClick={() => removeQuestion(survey.id, q.id).then(() => query.reload())}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
