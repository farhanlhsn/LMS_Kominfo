"use client";

import { useState } from "react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { SupportTicketList } from "../../../components/help/SupportTicketList";
import { useSupportTicket, useUpdateSupportTicket } from "../../../lib/api-hooks";
import type { SupportTicket, SupportTicketStatus } from "../../../lib/lms-types";

const STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "PENDING",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

export default function AdminSupportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useSupportTicket(selectedId);
  const updateTicket = useUpdateSupportTicket();
  const [status, setStatus] = useState<string | null>(null);

  async function handleStatus(ticket: SupportTicket, next: SupportTicketStatus) {
    setStatus(null);
    try {
      await updateTicket(ticket.id, { status: next });
      await selected.reload();
      setStatus(`Ticket status changed to ${next}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.usersRead]}>
        <AppShell currentPath="/admin/support">
          <PageHeader
            eyebrow="Admin"
            title="Support triage"
            description="Review support tickets, reply, and update their status."
          />
          {status ? (
            <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {status}
            </p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-md border border-border bg-card p-4">
              <SupportTicketList admin onSelect={(t) => setSelectedId(t.id)} />
            </section>
            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Ticket status</h2>
              {selected.data ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={selected.data?.status === s}
                      onClick={() => void handleStatus(selected.data as SupportTicket, s)}
                      className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a ticket to update its status.
                </p>
              )}
            </section>
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
