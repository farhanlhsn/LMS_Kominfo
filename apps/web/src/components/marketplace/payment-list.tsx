"use client";

import { useMemo, useState } from "react";
import type { Payment } from "../../lib/lms-types";
import { EmptyState } from "../ui/states";
import { formatCurrency } from "../../lib/marketplace";
import { PaymentStatusBadge } from "./status-badges";

export function PaymentList({
  payments,
  size = "default",
}: {
  payments: Payment[];
  size?: "default" | "compact";
}) {
  const cell = size === "compact" ? "px-3 py-2" : "px-4 py-3";
  const head = size === "compact" ? "px-3 py-2" : "px-4 py-3";
  const [statusFilter, setStatusFilter] = useState<string>("");

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const payment of payments) {
      if (payment.status) set.add(payment.status);
    }
    return Array.from(set);
  }, [payments]);

  const filtered = useMemo(() => {
    if (!statusFilter) return payments;
    return payments.filter((payment) => payment.status === statusFilter);
  }, [payments, statusFilter]);

  if (payments.length === 0) {
    return (
      <EmptyState
        description="Payment submissions will appear here once learners submit proof."
        title="No payments yet"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-subtle">
        <label className="text-sm text-muted-foreground">Status</label>
        <select
          aria-label="Filter payments by status"
          className="min-h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          onChange={(event) => setStatusFilter(event.target.value)}
          value={statusFilter}
        >
          <option value="">All</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          description="No payments match the current filter."
          title="No matching payments"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className={head}>Order</th>
                <th className={head}>Provider</th>
                <th className={head}>Status</th>
                <th className={head}>Bank</th>
                <th className={`${head} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filtered.map((payment) => (
                <tr key={payment.id}>
                  <td className={`${cell} font-semibold`}>
                    {payment.order?.orderNumber ?? payment.orderId}
                  </td>
                  <td className={cell}>{payment.provider}</td>
                  <td className={cell}>
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className={cell}>
                    {payment.bankName ?? "—"}
                    {payment.accountName ? (
                      <p className="text-xs text-muted-foreground">
                        {payment.accountName}
                      </p>
                    ) : null}
                  </td>
                  <td className={`${cell} text-right font-semibold`}>
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
