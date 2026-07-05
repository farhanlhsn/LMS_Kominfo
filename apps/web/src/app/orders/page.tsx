"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { OrderList } from "../../components/marketplace/order-list";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useMyOrders } from "../../lib/api-hooks";
import type { Order } from "../../lib/lms-types";

export default function MyOrdersPage() {
  const query = useMyOrders();
  const payload = query.data as { data?: Order[] } | undefined;
  const orders = payload?.data ?? [];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Marketplace"
          title="My Orders"
          description="Track the status of your course purchases and subscription orders."
        />

        {query.loading ? (
          <LoadingState title="Loading your orders" />
        ) : query.error ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load orders"
          />
        ) : (
          <OrderList orders={orders} basePath="/orders" />
        )}
      </AppShell>
    </AuthGate>
  );
}
