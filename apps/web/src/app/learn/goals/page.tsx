"use client";

import { FormEvent } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useCreateLearningGoal, useLearningGoals, useUpdateLearningGoal } from "../../../lib/api-hooks";

export default function LearningGoalsPage() {
  const goals = useLearningGoals();
  const createGoal = useCreateLearningGoal();
  const updateGoal = useUpdateLearningGoal();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createGoal({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      courseId: String(form.get("courseId") || "") || undefined,
      targetType: String(form.get("targetType") ?? "COURSE_COMPLETION"),
      targetValue: {},
      dueAt: String(form.get("dueAt") || "") || undefined,
    });
    event.currentTarget.reset();
    await goals.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader eyebrow="Goals" title="Learning goals" description="Plan learning outcomes and track progress in your active organization." />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create goal</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={create}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="title" placeholder="Goal title" required />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="targetType" defaultValue="COURSE_COMPLETION">
              <option value="COURSE_COMPLETION">Course completion</option>
              <option value="ACTIVITY_COMPLETION">Activity completion</option>
              <option value="STUDY_TIME">Study time</option>
              <option value="SCORE">Score</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="courseId" placeholder="Course id (optional)" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="dueAt" type="date" />
            <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" name="description" placeholder="Description" />
            <button className="h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Create goal</button>
          </form>
        </section>
        {goals.loading ? (
          <LoadingState title="Loading goals" />
        ) : goals.error ? (
          <ApiErrorState error={goals.error} fallbackTitle="Could not load goals" />
        ) : goals.data?.length ? (
          <DataTable
            columns={["Goal", "Target", "Progress", "Status", "Actions"]}
            rows={goals.data.map((goal) => [
              goal.title,
              <StatusBadge key="target" value={goal.targetType} />,
              `${Number(goal.progressValue?.percent ?? 0)}%`,
              <StatusBadge key="status" value={goal.status} />,
              <button key="done" className="font-semibold text-primary" onClick={() => void updateGoal(goal.id, { ...goal, status: "COMPLETED" }).then(goals.reload)} type="button">Complete</button>,
            ])}
          />
        ) : (
          <EmptyState title="No goals yet" description="Create a learning goal to track your next milestone." />
        )}
      </AppShell>
    </AuthGate>
  );
}
