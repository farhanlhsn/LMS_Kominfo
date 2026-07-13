"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { EmptyState } from "../../../components/ui/states";
import { PollResultsView } from "../../../components/experiences/experiences-views";
import { usePollResults, usePolls, useVotePoll } from "../../../lib/api-hooks";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function LearnerPollsPage() {
  const query = usePolls();
  const polls = (query.data ?? []) as Array<{
    id: string;
    question: string;
    options: Array<{ id: string; label: string }>;
    allowMultiple: boolean;
    status: string;
  }>;

  return (
    <AppShell>
      <div>
        <PageHeader
        eyebrow="Learner"
        title="Live polls"
        description="Cast your vote on instructor-led polls."
      />

      <FilterBar>
        <StatusBadge value={`${polls.length} polls`} tone="info" />
      </FilterBar>

      <div className="mt-4 space-y-4">
        {polls.length === 0 ? (
          <EmptyState
            title="No active polls"
            description="When an instructor opens a poll, you can vote here."
            icon={CircleDot}
          />
        ) : (
          polls.map((poll) => <PollCard key={poll.id} poll={poll} />)
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

function PollCard({
  poll,
}: {
  poll: {
    id: string;
    question: string;
    options: Array<{ id: string; label: string }>;
    allowMultiple: boolean;
    status: string;
  };
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vote = useVotePoll();
  const results = usePollResults(voted ? poll.id : null);
  const isActive = poll.status === "ACTIVE";

  const toggle = (id: string) => {
    setSelected((prev) =>
      poll.allowMultiple
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  };

  const handleVote = async () => {
    if (selected.length === 0) {
      setError("Select at least one option");
      return;
    }
    setError(null);
    try {
      await vote(poll.id, selected);
      setVoted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-lg leading-tight">{poll.question}</CardTitle>
        <StatusBadge value={poll.status} tone={isActive ? "success" : "neutral"} />
      </CardHeader>
      <CardContent>
        <div className="mt-2 flex flex-wrap gap-2">
          {poll.options.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary font-medium text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => toggle(opt.id)}
                type="button"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
        
        {voted ? (
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">Live results</h3>
            <PollResultsView results={results.data ?? null} />
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          disabled={!isActive || voted}
          onClick={handleVote}
          className="w-full sm:w-auto"
        >
          {voted ? "Vote recorded" : "Submit vote"}
        </Button>
      </CardFooter>
    </Card>
  );
}
