"use client";

import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { useMyPayouts } from "../../lib/api-hooks";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import type { PayoutStatus } from "../../lib/lms-types";

const STATUS_TONES: Record<PayoutStatus, "success" | "warning" | "danger" | "info"> = {
  PAID: "success",
  APPROVED: "info",
  PENDING: "warning",
  FAILED: "danger",
};

export function PayoutList() {
  const payoutsQuery = useMyPayouts();

  const totals = useMemo(() => {
    const list = payoutsQuery.data ?? [];
    const byStatus = new Map<PayoutStatus, number>();
    for (const p of list) {
      const value = p.netAmount;
      byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + value);
    }
    return { byStatus, count: list.length };
  }, [payoutsQuery.data]);

  if (payoutsQuery.isLoading) {
    return <LoadingState title="Loading payouts" />;
  }

  if (payoutsQuery.error) {
    return <ApiErrorState error={payoutsQuery.error} />;
  }

  if (!payoutsQuery.data?.length) {
    return (
      <EmptyState
        title="No payouts yet"
        description="Once your revenue share is computed, payouts will appear here."
        icon={Wallet}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Your payouts</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {totals.count} payout{totals.count === 1 ? "" : "s"} across this organization.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {payoutsQuery.data.map((payout) => (
            <div
              key={payout.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {payout.currency} {payout.netAmount.toLocaleString()} net
                </p>
                <p className="text-xs text-muted-foreground">
                  Gross {payout.grossAmount.toLocaleString()} − Fee {payout.feeAmount.toLocaleString()} •{" "}
                  {payout.period
                    ? `${new Date(payout.period.periodStart).toLocaleDateString()} → ${new Date(
                        payout.period.periodEnd,
                      ).toLocaleDateString()}`
                    : "Period unavailable"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={STATUS_TONES[payout.status]} value={payout.status} />
                {payout.reference ? (
                  <span className="text-xs text-muted-foreground">{payout.reference}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
