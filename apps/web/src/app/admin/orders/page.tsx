"use client";

import { useState } from "react";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { OrderList } from "../../../components/marketplace/order-list";
import { PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useAdminOrders } from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import { formatCurrency } from "../../../lib/marketplace";
import { CreditCard, ListChecks, ShoppingCart } from "lucide-react";
import type { Order } from "../../../lib/lms-types";

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const query = useAdminOrders({
    ...(status ? { status } : {}),
    page: String(page),
    limit: "20",
  });

  const payload = query.data as
    | { data: Order[]; meta?: { total?: number; totalPages?: number; page?: number } }
    | undefined;

  const orders = payload?.data ?? [];
  const meta = payload?.meta;
  const total = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const currency = orders[0]?.currency ?? "USD";

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Admin"
            title="Orders"
            description="All purchase orders across the active organization."
            actions={
              <select
                aria-label="Filter orders by status"
                className="min-h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                value={status}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            }
          />

          {query.loading ? (
            <LoadingState title="Loading orders" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load orders"
            />
          ) : (
            <>
              <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  icon={ListChecks}
                  label="Orders on page"
                  value={String(orders.length)}
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Total on page"
                  value={formatCurrency(total, currency)}
                />
                <StatCard
                  icon={CreditCard}
                  label="All-time total"
                  value={String(meta?.total ?? "—")}
                />
              </section>

              <OrderList
                orders={orders}
                basePath="/admin/orders"
                emptyTitle="No orders"
                emptyDescription="No orders match the current filter."
              />

              {meta?.totalPages && meta.totalPages > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-4 flex items-center justify-end gap-2"
                >
                  <button
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
                    disabled={(meta.page ?? 1) <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {meta.page ?? 1} / {meta.totalPages}
                  </span>
                  <button
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
                    disabled={(meta.page ?? 1) >= (meta.totalPages ?? 1)}
                    onClick={() => setPage((value) => value + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
