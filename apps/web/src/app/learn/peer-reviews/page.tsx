"use client";

import { useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { useApiMutation } from "../../../components/hooks/use-api-mutation";
import {
  useLearnerPeerReviews,
  useSubmitLearnerPeerReview,
} from "../../../lib/api-hooks";
import type { PeerReviewMatch } from "../../../lib/lms-types";

export default function LearnerPeerReviewsPage() {
  const reviewsQuery = useLearnerPeerReviews();
  const submit = useSubmitLearnerPeerReview();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  const matches: PeerReviewMatch[] = (reviewsQuery.data ?? []) as PeerReviewMatch[];

  const submitReview = useApiMutation(async (matchId: string) => {
    await submit(matchId, {
      overallScore: Number.isFinite(score) ? score : undefined,
      feedback: feedback || undefined,
    });
    setExpanded(null);
    setScore(0);
    setFeedback("");
    await reviewsQuery.refresh();
  });

  return (
    <AuthGate>
      <AppShell currentPath="/learn">
        <PageHeader
          eyebrow="Peer reviews"
          title="Review your peers"
          description="Submit thoughtful feedback on peer submissions for the assignments you were matched with."
        />
        {reviewsQuery.loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No peer reviews assigned to you yet.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <CardTitle>Submission {match.submissionId.slice(0, 6)}…</CardTitle>
                  <CardDescription>Status: {match.status}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="rounded-md border border-border p-3 text-sm">
                    {match.submission?.textAnswer ? (
                      <p className="whitespace-pre-wrap">{match.submission.textAnswer}</p>
                    ) : (
                      <p className="text-muted-foreground">No text answer in submission.</p>
                    )}
                  </div>
                  {match.review?.submittedAt ? (
                    <p className="text-xs text-muted-foreground">
                      You submitted this review on {new Date(match.review.submittedAt).toLocaleString()}.
                    </p>
                  ) : expanded === match.id ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-[160px,1fr]">
                        <Input
                          type="number"
                          value={score}
                          onChange={(event) => setScore(Number(event.target.value))}
                          placeholder="Score"
                        />
                        <Textarea
                          value={feedback}
                          onChange={(event) => setFeedback(event.target.value)}
                          rows={4}
                          placeholder="Feedback"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setExpanded(null)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            await submitReview.mutate(match.id);
                          }}
                          disabled={submitReview.loading}
                        >
                          {submitReview.loading ? "Submitting…" : "Submit review"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setExpanded(match.id)}>Open review form</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
