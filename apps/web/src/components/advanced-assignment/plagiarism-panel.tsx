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
import { useApiMutation } from "../hooks/use-api-mutation";
import { usePlagiarismChecks, useRunPlagiarismCheck } from "../../lib/api-hooks";
import type { PlagiarismCheck } from "../../lib/lms-types";

export interface PlagiarismPanelProps {
  submissionId: string;
  textAnswer?: string | null;
}

export function PlagiarismPanel({ submissionId, textAnswer }: PlagiarismPanelProps) {
  const checksQuery = usePlagiarismChecks(submissionId);
  const runCheck = useRunPlagiarismCheck();
  const [error, setError] = useState<string | null>(null);
  const submit = useApiMutation(async () => {
    setError(null);
    if (!textAnswer || !textAnswer.trim()) {
      setError("Submission has no text answer to check.");
      return;
    }
    await runCheck(submissionId, { provider: "mock" });
    await checksQuery.refresh();
  });

  const checks: PlagiarismCheck[] = (checksQuery.data ?? []) as PlagiarismCheck[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plagiarism check</CardTitle>
        <CardDescription>
          Run a provider-backed similarity scan against the submission text.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={submit.mutate} disabled={submit.loading}>
          {submit.loading ? "Running…" : "Run check"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {checksQuery.loading ? (
          <p className="text-sm text-muted-foreground">Loading checks…</p>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plagiarism checks yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {checks.map((check) => (
              <li
                key={check.id}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{check.provider}</span>
                  <span className="text-xs text-muted-foreground">{check.status}</span>
                </div>
                {check.similarityScore != null ? (
                  <p className="mt-1 text-sm">
                    Similarity: {check.similarityScore.toFixed(1)}%
                  </p>
                ) : null}
                {check.matchedSources && check.matchedSources.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {check.matchedSources.map((source) => (
                      <li key={`${source.url ?? source.title ?? "x"}`}>
                        {source.title ?? source.url ?? "Unnamed source"}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {check.errorMessage ? (
                  <p className="mt-1 text-xs text-destructive">{check.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
