"use client";

import { Medal,Trophy } from "lucide-react";
import { useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState,EmptyState,LoadingState } from "../../components/ui/states";
import { useLeaderboard } from "../../lib/api-hooks";

const periods = [
  { key: "ALL_TIME", label: "All Time" },
  { key: "MONTHLY", label: "This Month" },
  { key: "WEEKLY", label: "This Week" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("ALL_TIME");
  const query = useLeaderboard({ period });
  const entries = query.data;

  return (
    <AuthGate>
      <AppShell currentPath="/leaderboard">
        <PageHeader
          eyebrow="Gamification"
          title="Leaderboard"
          description="Top learners in your active organization, ranked by experience points."
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              className={"inline-flex min-h-9 items-center rounded-md px-4 text-sm font-semibold transition " + (period === p.key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted")}
              onClick={() => setPeriod(p.key)}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>

        {query.loading ? (
          <LoadingState title="Loading leaderboard" />
        ) : query.error ? (
          <ApiErrorState error={query.error} fallbackTitle="Could not load leaderboard" />
        ) : !entries?.length ? (
          <EmptyState title="No rankings yet" description={`No XP was earned during ${period === "WEEKLY" ? "this week" : period === "MONTHLY" ? "this month" : "this period"}.`} icon={Trophy} />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <div className="hidden border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[60px_1fr_120px]">
              <span>Rank</span>
              <span>Learner</span>
              <span className="text-right">XP</span>
            </div>
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div key={entry.rank} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[60px_1fr_120px] md:items-center">
                  <div className="flex items-center gap-2">
                    {entry.rank === 1 ? <Trophy className="h-4 w-4 text-warning" /> : entry.rank <= 3 ? <Medal className="h-4 w-4 text-muted-foreground" /> : null}
                    <span className="font-semibold">#{entry.rank}</span>
                  </div>
                  <span className="truncate font-medium">{entry.name}</span>
                  <span className="text-right font-semibold text-primary">{entry.totalXp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
