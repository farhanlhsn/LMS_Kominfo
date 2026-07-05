"use client";

import { useState } from "react";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { EmptyState } from "../../../components/ui/states";
import { CheckSquare } from "lucide-react";
import { useSubmitSurveyResponse, useSurveys } from "../../../lib/api-hooks";

export default function LearnerSurveysPage() {
  const query = useSurveys();
  const submit = useSubmitSurveyResponse();
  const surveys = (query.data ?? []) as Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    anonymous: boolean;
    allowMultipleSubmissions: boolean;
    closesAt?: string | null;
    questions?: Array<{ id: string; prompt: string; type: string; required: boolean; options: Array<{ id: string; label: string }> }>;
  }>;

  return (
    <div>
      <PageHeader
        eyebrow="Learner"
        title="My surveys"
        description="Share your feedback and help improve the course experience."
      />

      <FilterBar>
        <StatusBadge value={`${surveys.length} surveys`} tone="info" />
      </FilterBar>

      <div className="mt-4 space-y-4">
        {surveys.length === 0 ? (
          <EmptyState
            title="No surveys available"
            description="When instructors publish a survey, you can respond here."
            icon={CheckSquare}
          />
        ) : (
          surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onSubmit={async (answers) => {
                await submit(survey.id, { answers });
                await query.reload();
              }}
            />
          ))
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <ButtonLink href="/learn" variant="secondary">
          ← Back to learning
        </ButtonLink>
      </div>
    </div>
  );
}

function SurveyCard({
  survey,
  onSubmit,
}: {
  survey: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    questions?: Array<{ id: string; prompt: string; type: string; required: boolean; options: Array<{ id: string; label: string }> }>;
  };
  onSubmit: (answers: Array<{ questionId: string; value: string }>) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = survey.questions ?? [];
  const isOpen = survey.status === "PUBLISHED";

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions
        .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
        .map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" }));
      await onSubmit(payload);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{survey.title}</h2>
          {survey.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
          ) : null}
        </div>
        <StatusBadge
          value={survey.status}
          tone={isOpen ? "success" : "neutral"}
        />
      </div>

      {questions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">This survey has no questions yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {questions.map((q, idx) => (
            <li key={q.id} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium text-foreground">
                {idx + 1}. {q.prompt}{" "}
                {q.required ? <span className="text-destructive">*</span> : null}
              </p>
              <div className="mt-2">
                {q.type === "SINGLE_CHOICE" || q.type === "YES_NO" ? (
                  <div className="flex flex-wrap gap-2">
                    {(q.options.length > 0
                      ? q.options
                      : [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]
                    ).map((opt) => (
                      <label
                        key={opt.id}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                      >
                        <input
                          checked={answers[q.id] === opt.label}
                          name={`q-${q.id}`}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                          type="radio"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                ) : q.type === "RATING" || q.type === "SCALE" ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={`rounded-md border px-3 py-1 text-sm ${
                          answers[q.id] === String(n)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card"
                        }`}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: String(n) }))}
                        type="button"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    value={answers[q.id] ?? ""}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {submitted ? (
        <p className="mt-2 text-xs text-success">Response submitted. Thank you!</p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={!isOpen || submitting || questions.length === 0 || submitted}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? "Submitting…" : submitted ? "Submitted" : "Submit response"}
        </button>
      </div>
    </article>
  );
}
