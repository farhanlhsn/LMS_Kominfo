"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
import { PollResultsView, PollsList } from "../../../components/experiences/experiences-views";
import {
  useCreatePoll,
  useDeletePoll,
  usePollResults,
  usePolls,
  useUpdatePoll,
} from "../../../lib/api-hooks";

export default function AdminPollsPage() {
  const query = usePolls();
  const createPoll = useCreatePoll();
  const updatePoll = useUpdatePoll();
  const deletePoll = useDeletePoll();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<Array<{ label: string }>>([{ label: "" }, { label: "" }]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const results = usePollResults(selectedId);

  const polls = (query.data ?? []) as Array<{
    id: string;
    question: string;
    status: string;
    options: Array<{ id: string; label: string }>;
    _count?: { votes?: number };
  }>;

  const handleCreate = async () => {
    const labels = options.map((o) => o.label.trim()).filter(Boolean);
    if (labels.length < 2) {
      setError("At least two options are required");
      return;
    }
    if (!question.trim()) {
      setError("Question is required");
      return;
    }
    setError(null);
    try {
      await createPoll({
        question: question.trim(),
        options: labels.map((label, idx) => ({ id: `opt-${idx + 1}`, label })),
        allowMultiple,
        anonymous,
      });
      setQuestion("");
      setOptions([{ label: "" }, { label: "" }]);
      setShowForm(false);
      await query.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create poll");
    }
  };

  const handleToggleStatus = async (id: string, current: string) => {
    const next = current === "ACTIVE" ? "CLOSED" : "ACTIVE";
    await updatePoll(id, { status: next });
    await query.reload();
  };

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.coursesUpdate]}>
    <AppShell currentPath="/admin/polls">
      <div>
        <PageHeader
        eyebrow="Admin"
        title="Polls"
        description="Quick in-class polls for live learner feedback."
        actions={
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowForm((v) => !v)}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New poll
          </button>
        }
      />

      {showForm ? (
        <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create poll</h2>
          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-medium">
              Question
              <input
                className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setQuestion(e.target.value)}
                value={question}
              />
            </label>
            <div>
              <p className="text-sm font-medium">Options</p>
              <ul className="mt-2 space-y-2">
                {options.map((opt, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <input
                      className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
                      onChange={(e) =>
                        setOptions((prev) => {
                          const next = [...prev];
                          next[idx] = { label: e.target.value };
                          return next;
                        })
                      }
                      placeholder={`Option ${idx + 1}`}
                      value={opt.label}
                    />
                    <button
                      className="rounded-md border border-border p-1 text-muted-foreground"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="mt-2 rounded-md border border-border px-3 py-1 text-xs"
                onClick={() => setOptions((prev) => [...prev, { label: "" }])}
                type="button"
              >
                + Add option
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  type="checkbox"
                />
                Allow multiple choices
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  type="checkbox"
                />
                Anonymous
              </label>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <button
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={handleCreate}
                type="button"
              >
                Create poll
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
        <StatusBadge value={`${polls.length} polls`} tone="info" />
      </FilterBar>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">All polls</h2>
          <PollsList polls={polls as any} />
          <div className="mt-4 space-y-2">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2 text-xs"
              >
                <span className="font-medium">{poll.question}</span>
                <button
                  className="ml-auto rounded border border-border px-2 py-1"
                  onClick={() => setSelectedId(poll.id === selectedId ? null : poll.id)}
                  type="button"
                >
                  {poll.id === selectedId ? "Hide results" : "View results"}
                </button>
                <button
                  className="rounded border border-border px-2 py-1"
                  onClick={() => handleToggleStatus(poll.id, poll.status)}
                  type="button"
                >
                  {poll.status === "ACTIVE" ? "Close" : "Activate"}
                </button>
                <button
                  className="rounded border border-destructive px-2 py-1 text-destructive"
                  onClick={() => {
                    if (window.confirm("Delete this poll?")) {
                      void deletePoll(poll.id).then(() => query.reload());
                    }
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Results</h2>
          <PollResultsView results={results.data ?? null} />
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <ButtonLink href="/admin" variant="secondary">
          ← Back to admin
        </ButtonLink>
      </div>
      </div>
    </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
