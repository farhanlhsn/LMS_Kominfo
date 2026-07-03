"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Save } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { CourseStatusBadge } from "../../../../../components/lms/courses";
import {
  ButtonLink,
  FormSection,
  PageHeader,
} from "../../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import { useInstructorCourse } from "../../../../../lib/api-hooks";

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const query = useInstructorCourse(params.courseId);
  const course = query.data;
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      await api.updateCourse(params.courseId, {
        title: String(form.get("title") ?? ""),
        subtitle: String(form.get("subtitle") ?? ""),
        description: String(form.get("description") ?? ""),
        level: String(form.get("level") ?? "BEGINNER"),
        visibility: String(form.get("visibility") ?? "ORGANIZATION_ONLY"),
      });
      setMessage("Course profile saved.");
      await query.reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {query.loading ? (
          <LoadingState title="Loading course" />
        ) : query.error || !course ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load course"
            fallbackDescription="Course was not found."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "Instructor", href: "/instructor/courses" },
                {
                  label: course.title,
                  href: `/instructor/courses/${course.id}/builder`,
                },
                { label: "Edit" },
              ]}
              eyebrow="Instructor"
              title="Edit Course"
              description="Update course profile information through the instructor API."
              actions={<CourseStatusBadge status={course.status} />}
            />

            <FormSection
              title="Course profile"
              description="Update the title, description, level, and visibility used across catalog and learning pages."
            >
              <form className="grid gap-4" onSubmit={submit}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-medium text-foreground">
                    Title
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      defaultValue={course.title}
                      minLength={2}
                      name="title"
                      required
                      type="text"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Subtitle
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      defaultValue={course.subtitle ?? ""}
                      name="subtitle"
                      type="text"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Level
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      defaultValue={course.level}
                      name="level"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="ALL_LEVELS">All levels</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Visibility
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      defaultValue={course.visibility}
                      name="visibility"
                    >
                      <option value="ORGANIZATION_ONLY">Organization only</option>
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                      <option value="INVITE_ONLY">Invite only</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium text-foreground">
                  Description
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    defaultValue={course.description ?? ""}
                    name="description"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    disabled={saving}
                    type="submit"
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    {saving ? "Saving" : "Save profile"}
                  </button>
                  <ButtonLink
                    href={`/instructor/courses/${course.id}/builder`}
                    variant="secondary"
                  >
                    Back to builder
                  </ButtonLink>
                </div>
                {message ? (
                  <p className="text-sm text-muted-foreground">{message}</p>
                ) : null}
              </form>
            </FormSection>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
