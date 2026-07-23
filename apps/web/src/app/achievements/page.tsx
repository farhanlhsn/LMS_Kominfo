"use client";

import { Award,Trophy } from "lucide-react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { PageHeader,StatusBadge } from "../../components/ui/core";
import { ApiErrorState,EmptyState,LoadingState } from "../../components/ui/states";
import { useAchievements,useMyAchievements } from "../../lib/api-hooks";

export default function AchievementsPage() {
  const allQuery = useAchievements();
  const myQuery = useMyAchievements();
  const allAchievements = allQuery.data ?? [];
  const myAchievements = myQuery.data ?? [];
  const earnedIds = new Set(myAchievements.map((a) => a.achievementId));

  return (
    <AuthGate>
      <AppShell currentPath="/achievements">
        <PageHeader
          eyebrow="Gamification"
          title="Achievements"
          description="Badges and accomplishments earned through learning activities."
        />

        {allQuery.loading ? (
          <LoadingState title="Loading achievements" />
        ) : allQuery.error ? (
          <ApiErrorState error={allQuery.error} fallbackTitle="Could not load achievements" />
        ) : !allAchievements.length ? (
          <EmptyState title="No achievements yet" description="Achievements will appear here as they are defined by your organization." icon={Award} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allAchievements.map((achievement) => {
              const earned = earnedIds.has(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={"rounded-lg border p-5 shadow-subtle transition " + (earned ? "border-success/30 bg-success/5" : "border-border bg-card opacity-60")}
                >
                  <div className="flex items-center gap-3">
                    <div className={"flex h-10 w-10 items-center justify-center rounded-full " + (earned ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{achievement.name}</p>
                      {achievement.description ? <p className="text-xs text-muted-foreground">{achievement.description}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {earned ? <StatusBadge value="Earned" tone="success" /> : <StatusBadge value="Locked" tone="neutral" />}
                    {achievement.xpReward > 0 ? <StatusBadge value={achievement.xpReward + " XP"} tone="info" /> : null}
                    <span className="ml-auto text-xs text-muted-foreground">{achievement._count?.users ?? 0} earned</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}