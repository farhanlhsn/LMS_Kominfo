"use client";

import { FormEvent } from "react";
import { use } from "react";
import { Save } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { useAssignments, useCreateAssignment, usePublishAssignment, useRubrics } from "../../../../../lib/api-hooks";

export default function CourseAssignmentsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const assignments = useAssignments(courseId);
  const rubrics = useRubrics();
  const createAssignment = useCreateAssignment();
  const publishAssignment = usePublishAssignment();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createAssignment(courseId, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      instructions: String(form.get("instructions") ?? ""),
      activityId: String(form.get("activityId") || "") || undefined,
      submissionType: String(form.get("submissionType") ?? "TEXT"),
      dueAt: String(form.get("dueAt") || "") || undefined,
      rubricId: String(form.get("rubricId") || "") || undefined,
      allowLateSubmission: form.get("allowLateSubmission") === "on",
      allowResubmission: form.get("allowResubmission") === "on",
      maxAttempts: Number(form.get("maxAttempts") || 0) || undefined,
    });
    event.currentTarget.reset();
    await assignments.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader
          eyebrow="Assignments"
          title="Course assignments"
          description="Create assignment activities, attach rubrics, publish work, and review submissions."
        />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create assignment</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={create}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="title" placeholder="Assignment title" required />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="submissionType" defaultValue="TEXT">
              <option value="TEXT">Text</option>
              <option value="FILE">File</option>
              <option value="LINK">Link</option>
              <option value="TEXT_AND_FILE">Text and file</option>
              <option value="PROJECT">Project</option>
            </select>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="activityId" placeholder="Activity id (optional)" />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="dueAt" type="datetime-local" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="rubricId" defaultValue="">
              <option value="">No rubric</option>
              {(rubrics.data ?? []).map((rubric) => (
                <option key={rubric.id} value={rubric.id}>{rubric.title}</option>
              ))}
            </select>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="maxAttempts" min={1} placeholder="Max attempts" type="number" />
            <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" name="description" placeholder="Description" />
            <textarea className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" name="instructions" placeholder="Instructions" />
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground"><input name="allowLateSubmission" type="checkbox" />Allow late submission</label>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground"><input name="allowResubmission" type="checkbox" />Allow resubmission</label>
            <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
              <Save aria-hidden="true" className="h-4 w-4" />Create
            </button>
          </form>
        </section>
        {assignments.loading ? (
          <LoadingState title="Loading assignments" />
        ) : assignments.error ? (
          <ApiErrorState error={assignments.error} fallbackTitle="Could not load assignments" />
        ) : assignments.data?.length ? (
          <DataTable
            columns={["Assignment", "Status", "Type", "Submissions", "Actions"]}
            rows={assignments.data.map((assignment) => [
              assignment.title,
              <StatusBadge key="status" value={assignment.status} />,
              <StatusBadge key="type" value={assignment.submissionType} />,
              <a key="subs" className="font-semibold text-primary" href={`/instructor/assignments/${assignment.id}/submissions`}>{assignment._count?.submissions ?? 0}</a>,
              <div key="actions" className="flex flex-wrap gap-2">
                <a className="text-sm font-semibold text-primary" href={`/instructor/assignments/${assignment.id}`}>Advanced</a>
                <button className="text-sm font-semibold text-primary" onClick={() => void publishAssignment(assignment.id).then(assignments.reload)} type="button">Publish</button>
              </div>,
            ])}
          />
        ) : (
          <EmptyState title="No assignments yet" description="Create the first assignment for this course." />
        )}
      </AppShell>
    </AuthGate>
  );
}
