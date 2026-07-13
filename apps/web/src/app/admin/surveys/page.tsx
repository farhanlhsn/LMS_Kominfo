"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { SurveysList } from "../../../components/experiences/experiences-views";
import { useCreateSurvey, useSurveys } from "../../../lib/api-hooks";

export default function AdminSurveysPage() {
  const router = useRouter();
  const query = useSurveys();
  const createSurvey = useCreateSurvey();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surveys = (query.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    _count?: { questions?: number; responses?: number };
  }>;

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createSurvey({
        title: title.trim(),
        description: description.trim() || undefined,
        status: "DRAFT",
      });
      const id = (created as { id: string }).id;
      setShowForm(false);
      setTitle("");
      setDescription("");
      router.push(`/admin/surveys/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div>
        <PageHeader
        eyebrow="Admin"
        title="Surveys"
        description="Create surveys to collect learner feedback across courses and activities."
        actions={
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowForm((v) => !v)}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New survey
          </button>
        }
      />

      {showForm ? (
        <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create survey</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save a draft first, then add questions from the survey detail page.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-medium">
              Title
              <input
                className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setTitle(e.target.value)}
                value={title}
              />
            </label>
            <label className="block text-sm font-medium">
              Description
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </label>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <button
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                disabled={submitting}
                onClick={handleCreate}
                type="button"
              >
                {submitting ? "Saving…" : "Save draft"}
              </button>
              <button
                className="rounded-md border border-border px-4 py-2 text-sm font-medium"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <FilterBar>
        <StatusBadge value={`${surveys.length} surveys`} tone="info" />
      </FilterBar>

      <div className="mt-4">
        <SurveysList surveys={surveys as any} />
      </div>

      <div className="mt-6 flex gap-2">
        <ButtonLink href="/admin" variant="secondary">
          ← Back to admin
        </ButtonLink>
      </div>
      </div>
    </AppShell>
  );
}
