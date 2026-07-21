"use client";

import { useState } from "react";
import { useReplySupportTicket, useSupportTickets } from "../../lib/api-hooks";
import { cn } from "../../lib/utils";
import type { SupportTicket, SupportTicketStatus } from "../../lib/lms-types";

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  OPEN: "bg-warning/10 text-warning",
  PENDING: "bg-info/10 text-info",
  RESOLVED: "bg-success/10 text-success",
  CLOSED: "bg-muted text-muted-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
};

export interface SupportTicketListProps {
  status?: SupportTicketStatus;
  admin?: boolean;
  onSelect?: (ticket: SupportTicket) => void;
  className?: string;
}

export function SupportTicketList({ status, admin, onSelect, className }: SupportTicketListProps) {
  const [filter, setFilter] = useState<SupportTicketStatus | undefined>(status);
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const tickets = useSupportTickets(filter ? { status: filter, limit: 50 } : { limit: 50 });
  const reply = useReplySupportTicket();

  const handleReply = async () => {
    if (!active || !replyBody.trim()) return;
    await reply(active.id, replyBody.trim());
    setReplyBody("");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by status"
          value={filter ?? ""}
          onChange={(event) => setFilter((event.target.value || undefined) as SupportTicketStatus | undefined)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {tickets.data && (
          <span className="text-xs text-muted-foreground">{tickets.data.length} ticket(s)</span>
        )}
      </div>
      {tickets.error && <p className="text-sm text-destructive">{tickets.error.message}</p>}
      <ul className="flex flex-col gap-2">
        {tickets.data?.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => {
                setActive(ticket);
                onSelect?.(ticket);
              }}
              className={cn(
                "w-full rounded-md border border-border bg-card p-3 text-left transition hover:bg-muted",
                active?.id === ticket.id && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{ticket.subject}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", STATUS_TONE[ticket.status])}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{ticket.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Priority: {ticket.priority} · Replies: {ticket._count?.replies ?? 0}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {active && (
        <div className="rounded-md border border-border bg-card p-3">
          <h3 className="text-sm font-semibold">{active.subject}</h3>
          <p className="mt-1 text-sm">{active.body}</p>
          <div className="mt-3 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor={`reply-${active.id}`}>
              Add reply
            </label>
            <textarea
              id={`reply-${active.id}`}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-card p-2 text-sm"
            />
            <button
              type="button"
              onClick={handleReply}
              className="self-end rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Send reply
            </button>
          </div>
        </div>
      )}
      {!admin && <p className="text-xs text-muted-foreground">Only your own tickets are shown here.</p>}
    </div>
  );
}
