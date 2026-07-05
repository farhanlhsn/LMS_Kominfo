"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/marketplace/status-badges";
import { PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useOrder } from "../../../lib/api-hooks";
import { formatCurrency, formatOrderTotal } from "../../../lib/marketplace";
import { CalendarDays, CreditCard, ListChecks } from "lucide-react";
import type { Order } from "../../../lib/lms-types";

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const query = useOrder(orderId ?? null);

  const order = query.data as Order | undefined;

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        {query.loading ? (
          <LoadingState title="Loading order" />
        ) : query.error || !order ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load order"
            fallbackDescription="The order may have been removed or you no longer have access."
          />
        ) : (
          <>
            <PageHeader
              breadcrumbs={[
                { label: "My orders", href: "/orders" },
                { label: order.orderNumber },
              ]}
              eyebrow={`Order ${order.orderNumber}`}
              title={order.orderNumber}
              description={`Placed on ${new Date(order.createdAt).toLocaleString()}`}
              actions={<OrderStatusBadge status={order.status} />}
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={ListChecks}
                label="Items"
                value={String(order.items.length)}
              />
              <StatCard
                icon={CreditCard}
                label="Subtotal"
                value={formatCurrency(order.subtotal, order.currency)}
              />
              <StatCard
                icon={CreditCard}
                label="Discount"
                value={formatCurrency(order.discountAmount, order.currency)}
              />
              <StatCard
                icon={CalendarDays}
                label="Total"
                value={formatOrderTotal(order)}
              />
            </section>

            <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-base font-semibold">Courses in this order</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {order.items.length === 0 ? (
                  <li className="py-3 text-muted-foreground">
                    No items recorded for this order.
                  </li>
                ) : (
                  order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <span className="font-medium">{item.course.title}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.price, item.currency)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-base font-semibold">Payments</h2>
              {(order.payments?.length ?? 0) === 0 ? (
                <EmptyState
                  className="mt-3"
                  description="No payment submissions recorded yet."
                  title="No payments"
                />
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {order.payments?.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="font-medium">{payment.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.bankName ?? "—"} · {payment.accountName ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
