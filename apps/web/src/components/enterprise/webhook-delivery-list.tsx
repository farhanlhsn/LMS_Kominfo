"use client";

import type { WebhookDelivery } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

type DeliveryTone = "neutral" | "success" | "warning" | "danger" | "info";

function deliveryTone(status: string | null | undefined): DeliveryTone {
  switch ((status ?? "").toUpperCase()) {
    case "DELIVERED":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "danger";
    default:
      return "neutral";
  }
}

export function WebhookDeliveryList({
  deliveries,
}: {
  deliveries: WebhookDelivery[];
}) {
  if (deliveries.length === 0) {
    return (
      <EmptyState
        description="Webhook deliveries will appear here once events fire."
        title="No deliveries"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Response</th>
            <th className="px-4 py-3">Attempts</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <td className="px-4 py-3 font-mono text-xs">{delivery.eventType}</td>
              <td className="px-4 py-3">
                <StatusBadge
                  tone={deliveryTone(delivery.status)}
                  value={(delivery.status ?? "UNKNOWN").toLowerCase()}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {delivery.responseStatus ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {delivery.attempts}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(delivery.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
