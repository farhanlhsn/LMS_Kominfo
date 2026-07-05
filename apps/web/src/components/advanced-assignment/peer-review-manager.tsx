"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useApiMutation } from "../hooks/use-api-mutation";
import {
  useGeneratePeerReviewMatches,
  usePeerReviewConfig,
  usePeerReviewMatches,
  useUpsertPeerReviewConfig,
} from "../../lib/api-hooks";
import type { PeerReviewConfig, PeerReviewMatch } from "../../lib/lms-types";

export interface PeerReviewManagerProps {
  assignmentId: string;
}

export function PeerReviewManager({ assignmentId }: PeerReviewManagerProps) {
  const configQuery = usePeerReviewConfig(assignmentId);
  const matchesQuery = usePeerReviewMatches(assignmentId);
  const upsert = useUpsertPeerReviewConfig();
  const generate = useGeneratePeerReviewMatches();

  const [reviewsRequired, setReviewsRequired] = useState(2);
  const [reviewsToReceive, setReviewsToReceive] = useState(2);
  const [dueAt, setDueAt] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [anonymize, setAnonymize] = useState(true);
  const [allowSelfReview, setAllowSelfReview] = useState(false);
  const [status, setStatus] = useState<"DRAFT" | "OPEN" | "CLOSED">("DRAFT");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const config: PeerReviewConfig | null | undefined = configQuery.data;
    if (config) {
      setReviewsRequired(config.reviewsRequired);
      setReviewsToReceive(config.reviewsToReceive);
      setDueAt(config.dueAt ? new Date(config.dueAt).toISOString().slice(0, 16) : "");
      setRubricId(config.rubricId ?? "");
      setAnonymize(config.anonymize);
      setAllowSelfReview(config.allowSelfReview);
      setStatus((config.status as "DRAFT" | "OPEN" | "CLOSED") ?? "DRAFT");
    }
    if (!configQuery.loading) setHydrated(true);
  }, [configQuery.data, configQuery.loading, hydrated]);

  const save = useApiMutation(async () => {
    await upsert(
      assignmentId,
      {
        reviewsRequired,
        reviewsToReceive,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        rubricId: rubricId || undefined,
        anonymize,
        allowSelfReview,
        status,
      },
      "POST",
    );
    await configQuery.refresh();
  });

  const generateMatches = useApiMutation(async () => {
    await generate(assignmentId);
    await matchesQuery.refresh();
  });

  const matches: PeerReviewMatch[] = (matchesQuery.data ?? []) as PeerReviewMatch[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Peer review configuration</CardTitle>
          <CardDescription>
            Define how learners review each other's submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reviews required per reviewer</label>
            <Input
              type="number"
              min={1}
              value={reviewsRequired}
              onChange={(event) => setReviewsRequired(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reviews each submission receives</label>
            <Input
              type="number"
              min={1}
              value={reviewsToReceive}
              onChange={(event) => setReviewsToReceive(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due at</label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rubric ID (optional)</label>
            <Input value={rubricId} onChange={(event) => setRubricId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as "DRAFT" | "OPEN" | "CLOSED")}
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymize}
                onChange={(event) => setAnonymize(event.target.checked)}
              />
              Anonymize
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowSelfReview}
                onChange={(event) => setAllowSelfReview(event.target.checked)}
              />
              Allow self review
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button onClick={save.mutate} disabled={save.loading}>
              {save.loading ? "Saving…" : configQuery.data ? "Update config" : "Create config"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
          <CardDescription>
            Generate and review peer review matches for this assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={generateMatches.mutate}
            disabled={generateMatches.loading || !configQuery.data}
            variant="secondary"
          >
            {generateMatches.loading ? "Generating…" : "Generate matches"}
          </Button>
          {matchesQuery.loading ? (
            <p className="text-sm text-muted-foreground">Loading matches…</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {matches.map((match) => (
                <li
                  key={match.id}
                  className="flex items-center justify-between rounded-md border border-border p-2"
                >
                  <span>
                    Reviewer {match.reviewer?.name ?? match.reviewerUserId} → Submission {match.submissionId.slice(0, 6)}…
                  </span>
                  <span className="text-xs text-muted-foreground">{match.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
