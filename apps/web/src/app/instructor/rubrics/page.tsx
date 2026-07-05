"use client";

import { FormEvent } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useCreateRubric, useRubrics } from "../../../lib/api-hooks";

export default function RubricsPage() {
  const rubrics = useRubrics();
  const createRubric = useCreateRubric();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createRubric({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      status: "ACTIVE",
      criteria: [
        {
          title: String(form.get("criterionOne") ?? "Quality"),
          maxPoints: Number(form.get("pointsOne") ?? 50),
          levels: [
            { title: "Excellent", points: Number(form.get("pointsOne") ?? 50) },
            { title: "Needs work", points: 0 },
          ],
        },
        {
          title: String(form.get("criterionTwo") ?? "Completeness"),
          maxPoints: Number(form.get("pointsTwo") ?? 50),
          levels: [
            { title: "Complete", points: Number(form.get("pointsTwo") ?? 50) },
            { title: "Incomplete", points: 0 },
          ],
        },
      ],
    });
    event.currentTarget.reset();
    await rubrics.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Rubrics"
          title="Rubric builder"
          description="Create reusable grading rubrics for assignment feedback."
        />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create rubric</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={create}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="title" placeholder="Rubric title" required />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="description" placeholder="Description" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="criterionOne" placeholder="Criterion 1" defaultValue="Quality" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="pointsOne" type="number" defaultValue="50" min="0" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="criterionTwo" placeholder="Criterion 2" defaultValue="Completeness" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="pointsTwo" type="number" defaultValue="50" min="0" />
            <button className="h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Create rubric</button>
          </form>
        </section>
        {rubrics.loading ? (
          <LoadingState title="Loading rubrics" />
        ) : rubrics.error ? (
          <ApiErrorState error={rubrics.error} fallbackTitle="Could not load rubrics" />
        ) : rubrics.data?.length ? (
          <DataTable
            columns={["Rubric", "Status", "Points", "Criteria"]}
            rows={rubrics.data.map((rubric) => [
              rubric.title,
              <StatusBadge key="status" value={rubric.status} />,
              String(rubric.totalPoints),
              String(rubric.criteria?.length ?? 0),
            ])}
          />
        ) : (
          <EmptyState title="No rubrics yet" description="Create a rubric to grade assignments consistently." />
        )}
      </AppShell>
    </AuthGate>
  );
}
