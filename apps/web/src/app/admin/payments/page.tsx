"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PaymentList } from "../../../components/marketplace/payment-list";
import { PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useAdminPayments } from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import { formatCurrency } from "../../../lib/marketplace";
import { CreditCard, ListChecks, Wallet } from "lucide-react";
import type { Payment } from "../../../lib/lms-types";

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState<string>("");
  const query = useAdminPayments({
    ...(status ? { status } : {}),
    limit: "20",
  });

  const payload = query.data as
    | { data: Payment[]; meta?: { total?: number } }
    | undefined;

  const payments = payload?.data ?? [];
  const total = payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
  const currency = payments[0]?.currency ?? "IDR";

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/payments">
          <PageHeader
            eyebrow="Admin"
            title="Payments"
            description="Submitted payments awaiting confirmation."
            actions={
              <div className="relative w-full">
                <Select value={status} onValueChange={(val) => setStatus(val)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="AWAITING_REVIEW">Awaiting review</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />

          {query.loading ? (
            <LoadingState title="Loading payments" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load payments"
            />
          ) : (
            <>
              <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  icon={ListChecks}
                  label="Payments on page"
                  value={String(payments.length)}
                />
                <StatCard
                  icon={Wallet}
                  label="Amount on page"
                  value={formatCurrency(total, currency)}
                />
                <StatCard
                  icon={CreditCard}
                  label="All-time payments"
                  value={String(payload?.meta?.total ?? "—")}
                />
              </section>

              <PaymentList size="compact" payments={payments} />
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
