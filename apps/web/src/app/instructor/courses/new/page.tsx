"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { BookOpen, Save } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import {
  ButtonLink,
  FormSection,
  PageHeader,
} from "../../../../components/ui/core";
import { ErrorState } from "../../../../components/ui/states";
import { api } from "../../../../lib/api-client";

export default function NewCoursePage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const course = await api.createCourse({
        title: String(form.get("title") ?? ""),
        subtitle: String(form.get("subtitle") ?? ""),
        description: String(form.get("description") ?? ""),
        level: String(form.get("level") ?? "BEGINNER"),
        visibility: String(form.get("visibility") ?? "ORGANIZATION_ONLY"),
      });
      window.location.href = `/instructor/courses/${course.id}/builder`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesCreate]}>
        <AppShell currentPath="/instructor/courses">
          <PageHeader
            breadcrumbs={[
              { label: "Instructor", href: "/instructor/courses" },
              { label: "New course" },
            ]}
            eyebrow="Instructor"
            title="New Course"
            description="Create a generic course draft before adding curriculum."
            actions={
              <ButtonLink href="/instructor/courses" variant="secondary">
                Back to list
              </ButtonLink>
            }
          />

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <FormSection
              title="Course profile"
              description="Draft metadata is saved through the instructor course API."
            >
              <form className="grid gap-4" onSubmit={submit}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-medium text-foreground">
                    Title <span className="text-destructive">*</span>
                    <input
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                      name="subtitle"
                      type="text"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Level
                    <select
                      className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      defaultValue="BEGINNER"
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
                      defaultValue="ORGANIZATION_ONLY"
                      name="visibility"
                    >
                      <option value="ORGANIZATION_ONLY">
                        Organization only
                      </option>
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
                    name="description"
                  />
                </label>
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {saving ? "Saving" : "Save draft"}
                </button>
              </form>
            </FormSection>

            <aside className="space-y-4">
              <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
                  <span>Courses start as drafts.</span>
                </div>
              </section>
              {error ? (
                <ErrorState title="Could not save course" description={error} />
              ) : null}
            </aside>
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
