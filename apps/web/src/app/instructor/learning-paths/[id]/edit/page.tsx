"use client";

import type { FormEvent } from "react";
import { use, useState } from "react";
import { Save } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, PageHeader } from "../../../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../../../components/ui/states";
import {
  useLearningPath,
  useUpdateLearningPath,
  useAddCourseToPath,
  useRemoveCourseFromPath,
  useInstructorCourses,
} from "../../../../../lib/api-hooks";

const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export default function EditLearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const path = useLearningPath(id);
  const courses = useInstructorCourses();
  const update = useUpdateLearningPath();
  const addCourse = useAddCourseToPath();
  const removeCourse = useRemoveCourseFromPath();
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addCourseId, setAddCourseId] = useState("");

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setStatus(null);
    try {
      await update(id, {
        title: String(form.get("title") ?? ""),
        slug: String(form.get("slug") ?? ""),
        description: String(form.get("description") ?? ""),
        difficulty: String(form.get("difficulty") ?? "BEGINNER"),
        status: String(form.get("status") ?? "DRAFT"),
      });
      await path.reload();
      setStatus("Learning path saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCourse() {
    if (!addCourseId) return;
    setStatus(null);
    try {
      await addCourse(id, { courseId: addCourseId });
      setAddCourseId("");
      await path.reload();
      setStatus("Course added.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to add course");
    }
  }

  async function handleRemoveCourse(courseId: string) {
    setStatus(null);
    try {
      await removeCourse(id, courseId);
      await path.reload();
      setStatus("Course removed.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to remove course");
    }
  }

  const data = path.data;
  const pathCourseIds = new Set((data?.courses ?? []).map((c) => c.courseId));

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesCreate]}>
        <AppShell currentPath="/instructor/learning-paths">
          <PageHeader
            breadcrumbs={[
              { label: "Instructor", href: "/instructor" },
              { label: "Edit learning path" },
            ]}
            eyebrow="Instructor"
            title={data?.title ?? "Edit Learning Path"}
            actions={
              <ButtonLink href="/instructor" variant="secondary">
                Back
              </ButtonLink>
            }
          />
          {status ? (
            <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {status}
            </p>
          ) : null}
          {path.loading ? (
            <LoadingState title="Loading learning path" />
          ) : path.error ? (
            <ApiErrorState error={path.error} fallbackTitle="Failed to load learning path" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <form
                key={data?.id}
                className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-subtle"
                onSubmit={submitDetails}
              >
                <label className="block text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                  <input className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="title" defaultValue={data?.title ?? ""} required />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Slug <span className="text-destructive">*</span>
                  <input className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="slug" defaultValue={data?.slug ?? ""} required />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Difficulty
                  <select className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="difficulty" defaultValue={data?.difficulty ?? "BEGINNER"}>
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Status
                  <select className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="status" defaultValue={data?.status ?? "DRAFT"}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Description
                  <textarea className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" name="description" defaultValue={data?.description ?? ""} />
                </label>
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving" : "Save changes"}
                </button>
              </form>

              <aside className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="text-sm font-semibold">Courses in path</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {(data?.courses ?? []).length === 0 ? (
                    <li className="text-xs text-muted-foreground">No courses added yet.</li>
                  ) : (
                    (data?.courses ?? []).map((c) => (
                      <li key={c.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                        <span>{c.course?.title ?? c.courseId}</span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveCourse(c.courseId)}
                          className="text-xs text-destructive"
                        >
                          remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-4 flex gap-2">
                  <select
                    aria-label="Add course"
                    value={addCourseId}
                    onChange={(e) => setAddCourseId(e.target.value)}
                    className="h-10 flex-1 rounded-md border border-input bg-card px-2 text-sm"
                  >
                    <option value="">Select a course…</option>
                    {(courses.data ?? [])
                      .filter((course) => !pathCourseIds.has(course.id))
                      .map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleAddCourse()}
                    disabled={!addCourseId}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
              </aside>
            </div>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
