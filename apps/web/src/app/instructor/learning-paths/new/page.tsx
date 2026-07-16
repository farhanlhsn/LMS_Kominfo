"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Save } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { ButtonLink, PageHeader } from "../../../../components/ui/core";
import { ErrorState } from "../../../../components/ui/states";
import { useCreateLearningPath } from "../../../../lib/api-hooks";

export default function NewLearningPathPage() {
  const create = useCreateLearningPath();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const path = await create({
        title: String(form.get("title") ?? ""),
        slug: String(form.get("slug") ?? ""),
        description: String(form.get("description") ?? ""),
        difficulty: String(form.get("difficulty") ?? "BEGINNER"),
        status: "DRAFT",
      });
      window.location.href = `/instructor/learning-paths/${path.id}/edit`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesCreate]}>
        <AppShell currentPath="/instructor/learning-paths">
          <PageHeader
            breadcrumbs={[
              { label: "Instructor", href: "/instructor" },
              { label: "New learning path" },
            ]}
            eyebrow="Instructor"
            title="New Learning Path"
            actions={
              <ButtonLink href="/instructor" variant="secondary">
                Back
              </ButtonLink>
            }
          />
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <form className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-subtle" onSubmit={submit}>
              <label className="block text-sm font-medium text-foreground">
                Title <span className="text-destructive">*</span>
                <input className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="title" required />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Slug <span className="text-destructive">*</span>
                <input className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="slug" required />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Difficulty
                <select className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="difficulty" defaultValue="BEGINNER">
                  {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Description
                <textarea className="mt-2 min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" name="description" />
              </label>
              <button
                className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving" : "Create path"}
              </button>
            </form>
            <aside>
              {error ? <ErrorState title="Could not save path" description={error} /> : null}
            </aside>
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
