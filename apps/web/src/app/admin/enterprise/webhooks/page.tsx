"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { WebhookList } from "../../../../components/enterprise/webhook-list";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useWebhooks } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { WebhookEndpoint } from "../../../../lib/lms-types";

export default function EnterpriseWebhooksPage() {
  const query = useWebhooks();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const webhooks = (query.data ?? []) as WebhookEndpoint[];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.createWebhook({
        name,
        url,
        events: events
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      setName("");
      setUrl("");
      setEvents("");
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(item: WebhookEndpoint) {
    setDeletingId(item.id);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.deleteWebhook(item.id);
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Enterprise"
            title="Webhooks"
            description="Deliver platform events to your services."
          />

          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Add endpoint</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
              <label className="text-sm">
                <span className="block text-muted-foreground">Name</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">URL</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/webhook"
                  required
                  type="url"
                  value={url}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-muted-foreground">
                  Events (comma separated)
                </span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setEvents(event.target.value)}
                  placeholder="course.published, enrollment.created"
                  required
                  type="text"
                  value={events}
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {submitting ? "Adding" : "Add endpoint"}
                </button>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          {query.loading ? (
            <LoadingState title="Loading webhooks" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load webhooks"
            />
          ) : (
            <WebhookList
              deletingId={deletingId}
              onDelete={remove}
              webhooks={webhooks}
            />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
