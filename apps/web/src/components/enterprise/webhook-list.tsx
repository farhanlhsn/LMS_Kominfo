"use client";

import type { WebhookEndpoint } from "../../lib/lms-types";
import { ButtonLink, StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

export function WebhookList({
  webhooks,
  onDelete,
  deletingId,
}: {
  webhooks: WebhookEndpoint[];
  onDelete: (webhook: WebhookEndpoint) => void;
  deletingId?: string | null;
}) {
  if (webhooks.length === 0) {
    return (
      <EmptyState
        description="Webhook endpoints deliver events to your services in near real time."
        title="No webhook endpoints"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Events</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Deliveries</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {webhooks.map((webhook) => (
            <tr key={webhook.id}>
              <td className="px-4 py-3 font-semibold">{webhook.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="font-mono text-xs">{webhook.url}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {webhook.events?.length
                  ? webhook.events.slice(0, 3).join(", ") +
                    (webhook.events.length > 3 ? "…" : "")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  tone={webhook.status === "ACTIVE" ? "success" : "neutral"}
                  value={(webhook.status ?? "UNKNOWN").toLowerCase()}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {webhook._count?.deliveries ?? 0}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <ButtonLink
                    href={`/admin/webhooks/${encodeURIComponent(webhook.id)}/deliveries`}
                    variant="ghost"
                  >
                    Deliveries
                  </ButtonLink>
                  <button
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    disabled={deletingId === webhook.id}
                    onClick={() => onDelete(webhook)}
                    type="button"
                  >
                    {deletingId === webhook.id ? "Removing" : "Remove"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
