"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, PageHeader } from "../../../../../components/ui/core";
import { ErrorState, LoadingState, ApiErrorState } from "../../../../../components/ui/states";
import {
  useLearningPath,
  useUpdateLearningPath,
  useDeleteLearningPath,
  useAddCourseToPath,
  useRemoveCourseFromPath,
  useCourses,
} from "../../../../../lib/api-hooks";
import type { LearningPathCourse } from "../../../../../lib/lms-types";

export default function EditLearningPathPage() {
  const params = useParams<{ pathId: string }>();
  const pathId = params?.pathId ?? "";
  const path = useLearningPath(pathId);
  const courses = useCourses();
  const update = useUpdateLearningPath();
  const remove = useDeleteLearningPath();
  const addCourse = useAddCourseToPath();
  const removeCourse = useRemoveCourseFromPath();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const pathCourses = (path.data?.courses ?? []) as LearningPathCourse[];
  const linkedCourseIds = new Set(pathCourses.map((c) => c.courseId));

  async function handleAdd(courseId: string) {
    setStatus(null);
    setError(null);
    try {
      await addCourse(pathId, { courseId });
      await path.reload();
      setStatus("Course added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleRemove(courseId: string) {
    setStatus(null);
    setError(null);
    try {
      await removeCourse(pathId, courseId);
      await path.reload();
      setStatus("Course removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this learning path?")) return;
    setError(null);
    try {
      await remove(pathId);
      window.location.href = "/instructor";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesUpdate]}>
        <AppShell currentPath="/instructor/learning-paths">
          <PageHeader
            breadcrumbs={[
              { label: "Instructor", href: "/instructor" },
              { label: "Edit learning path" },
            ]}
            eyebrow="Instructor"
            title="Edit Learning Path"
            actions={
              <div className="flex gap-2">
                <ButtonLink href="/instructor" variant="secondary">
                  Back
                </ButtonLink>
                <button
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            }
          />
          {status ? (
            <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">{status}</p>
          ) : null}
          {path.loading ? (
            <LoadingState title="Loading path" />
          ) : path.error ? (
            <ApiErrorState error={path.error} fallbackTitle="Failed to load path" />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <form
                className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-subtle"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  setError(null);
                  try {
                    await update(pathId, {
                      title: String(form.get("title")),
                      slug: String(form.get("slug")),
                      description: String(form.get("description")),
                      difficulty: String(form.get("difficulty")),
                      status: String(form.get("status")),
                    });
                    setStatus("Saved.");
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : String(caught));
                  }
                }}
              >
                <label className="block text-sm font-medium text-foreground">
                  Title
                  <input defaultValue={path.data?.title} className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="title" />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Slug
                  <input defaultValue={path.data?.slug} className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="slug" />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Difficulty
                  <select defaultValue={path.data?.difficulty ?? "BEGINNER"} className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="difficulty">
                    {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Status
                  <select defaultValue={path.data?.status} className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="status">
                    {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Description
                  <textarea defaultValue={path.data?.description ?? ""} className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" name="description" />
                </label>
                <button className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="submit">
                  <Save className="h-4 w-4" /> Save
                </button>
              </form>

              <aside className="space-y-4">
                {error ? <ErrorState title="Could not save" description={error} /> : null}
                <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                  <h3 className="text-sm font-semibold">Courses in this path</h3>
                  {pathCourses.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No courses linked yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {pathCourses.map((c) => (
                        <li key={c.courseId} className="flex items-center justify-between">
                          <span>{c.course?.title ?? c.courseId}</span>
                          <button type="button" onClick={() => void handleRemove(c.courseId)} className="text-destructive text-xs">
                            remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <select
                    aria-label="Add course"
                    value=""
                    onChange={(e) => e.target.value && void handleAdd(e.target.value)}
                    className="mt-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Add course…</option>
                    {(courses.data?.data ?? [])
                      .filter((c) => !linkedCourseIds.has(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                  </select>
                </section>
              </aside>
            </div>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
