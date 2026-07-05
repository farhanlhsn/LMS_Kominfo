"use client";

import { useMemo, useState } from "react";
import type { Order } from "../../lib/lms-types";
import { ButtonLink } from "../ui/core";
import { EmptyState } from "../ui/states";
import { formatCurrency } from "../../lib/marketplace";
import { OrderStatusBadge } from "./status-badges";

export function OrderList({
  orders,
  basePath = "/orders",
  detailHrefBuilder,
  emptyTitle = "No orders yet",
  emptyDescription = "Orders you create will appear here.",
}: {
  orders: Order[];
  basePath?: string;
  detailHrefBuilder?: (order: Order) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const order of orders) {
      if (order.status) set.add(order.status);
    }
    return Array.from(set);
  }, [orders]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!lower) return true;
      return (
        order.orderNumber.toLowerCase().includes(lower) ||
        order.items.some((item) =>
          item.course.title.toLowerCase().includes(lower),
        )
      );
    });
  }, [orders, search, statusFilter]);

  if (orders.length === 0) {
    return (
      <EmptyState
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-subtle">
        <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
          <span className="sr-only">Search orders</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order number or course"
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Filter by status"
          className="min-h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          onChange={(event) => setStatusFilter(event.target.value)}
          value={statusFilter}
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          description="No orders match the current filter."
          title="No matching orders"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Courses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filtered.map((order) => {
                const href =
                  detailHrefBuilder?.(order) ??
                  `${basePath}/${order.id}`;
                return (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-1">
                        {order.items
                          .map((item) => item.course.title)
                          .join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(order.total, order.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink href={href} variant="ghost">
                        View
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
