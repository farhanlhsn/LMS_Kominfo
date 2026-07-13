"use client";

import { useState } from "react";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { EmptyState } from "../../../components/ui/states";
import { CheckSquare } from "lucide-react";
import { useSubmitSurveyResponse, useSurveys } from "../../../lib/api-hooks";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

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
    <AppShell>
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
    </AppShell>
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle className="leading-tight">{survey.title}</CardTitle>
          {survey.description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{survey.description}</p>
          ) : null}
        </div>
        <StatusBadge
          value={survey.status}
          tone={isOpen ? "success" : "neutral"}
        />
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">This survey has no questions yet.</p>
          </div>
        ) : (
          <ol className="space-y-6">
            {questions.map((q, idx) => (
              <li key={q.id}>
                <p className="text-sm font-semibold text-foreground">
                  {idx + 1}. {q.prompt}{" "}
                  {q.required ? <span className="text-destructive">*</span> : null}
                </p>
                <div className="mt-3">
                  {q.type === "SINGLE_CHOICE" || q.type === "YES_NO" ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {(q.options.length > 0
                        ? q.options
                        : [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]
                      ).map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-muted/50 ${
                            answers[q.id] === opt.label ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                          }`}
                        >
                          <input
                            checked={answers[q.id] === opt.label}
                            name={`q-${q.id}`}
                            className="h-4 w-4 text-primary focus:ring-primary accent-primary"
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                            type="radio"
                          />
                          <span className="font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === "RATING" || q.type === "SCALE" ? (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm transition-colors ${
                            answers[q.id] === String(n)
                              ? "border-primary bg-primary font-bold text-primary-foreground shadow-sm"
                              : "border-border bg-card hover:bg-muted text-foreground"
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
                      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Type your answer here..."
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      value={answers[q.id] ?? ""}
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
        {submitted ? (
          <div className="mt-4 rounded-md bg-success/10 p-3 text-sm font-medium text-success">
            Response submitted successfully. Thank you for your feedback!
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          disabled={!isOpen || submitting || questions.length === 0 || submitted}
          onClick={handleSubmit}
          className="w-full sm:w-auto"
        >
          {submitting ? "Submitting…" : submitted ? "Submitted" : "Submit response"}
        </Button>
      </CardFooter>
    </Card>
  );
}
