"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { EmptyState } from "../../../components/ui/states";
import { PollResultsView } from "../../../components/experiences/experiences-views";
import { usePollResults, usePolls, useVotePoll } from "../../../lib/api-hooks";

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
    <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{poll.question}</h2>
        <StatusBadge value={poll.status} tone={isActive ? "success" : "neutral"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {poll.options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              className={`rounded-md border px-4 py-2 text-sm ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
              onClick={() => toggle(opt.id)}
              type="button"
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={!isActive || voted}
          onClick={handleVote}
          type="button"
        >
          {voted ? "Vote recorded" : "Submit vote"}
        </button>
      </div>
      {voted ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Live results</h3>
          <div className="mt-2">
            <PollResultsView results={results.data ?? null} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
