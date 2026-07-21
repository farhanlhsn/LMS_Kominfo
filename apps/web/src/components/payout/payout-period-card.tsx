"use client";

import { useCallback, useState } from "react";
import { Banknote, Play, Lock, Send } from "lucide-react";
import {
  useComputePayoutPeriod,
  useLockPayoutPeriod,
  usePayPayoutPeriod,
  usePayoutPeriods,
} from "../../lib/api-hooks";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";
import type { PayoutPeriod, PayoutPeriodStatus } from "../../lib/lms-types";

const STATUS_TONES: Record<PayoutPeriodStatus, "info" | "warning" | "success"> = {
  OPEN: "info",
  LOCKED: "warning",
  PAID: "success",
};

export function PayoutPeriodCard() {
  const periodsQuery = usePayoutPeriods();
  const compute = useComputePayoutPeriod();
  const lock = useLockPayoutPeriod();
  const pay = usePayPayoutPeriod();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompute = useCallback(
    async (period: PayoutPeriod) => {
      setBusy(period.id);
      setError(null);
      try {
        await compute(period.id);
        await periodsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to compute period");
      } finally {
        setBusy(null);
      }
    },
    [compute, periodsQuery],
  );

  const handleLock = useCallback(
    async (period: PayoutPeriod) => {
      setBusy(period.id);
      setError(null);
      try {
        await lock(period.id);
        await periodsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to lock period");
      } finally {
        setBusy(null);
      }
    },
    [lock, periodsQuery],
  );

  const handlePay = useCallback(
    async (period: PayoutPeriod) => {
      setBusy(period.id);
      setError(null);
      try {
        await pay(period.id, { reference: `BATCH-${Date.now()}` });
        await periodsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark period as paid");
      } finally {
        setBusy(null);
      }
    },
    [pay, periodsQuery],
  );

  if (periodsQuery.isLoading) {
    return <LoadingState title="Loading payout periods" />;
  }

  if (periodsQuery.error) {
    return <ApiErrorState error={periodsQuery.error} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Banknote aria-hidden="true" className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Payout periods</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Compute revenue share, lock, and pay out for the period.
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="mb-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {!periodsQuery.data?.length ? (
          <EmptyState
            title="No payout periods"
            description="Create a payout period to start computing revenue share."
          />
        ) : (
          <ul className="space-y-2">
            {periodsQuery.data.map((period) => (
              <li
                key={period.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {new Date(period.periodStart).toLocaleDateString()} →{" "}
                    {new Date(period.periodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {period.currency} • {period._count?.payouts ?? 0} payouts • Total {period.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={STATUS_TONES[period.status]} value={period.status} />
                  {period.status === "OPEN" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCompute(period)}
                      disabled={busy === period.id}
                    >
                      <Play className="mr-1 h-3 w-3" /> Compute
                    </Button>
                  ) : null}
                  {period.status === "OPEN" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleLock(period)}
                      disabled={busy === period.id}
                    >
                      <Lock className="mr-1 h-3 w-3" /> Lock
                    </Button>
                  ) : null}
                  {period.status === "LOCKED" ? (
                    <Button
                      size="sm"
                      onClick={() => void handlePay(period)}
                      disabled={busy === period.id}
                    >
                      <Send className="mr-1 h-3 w-3" /> Pay
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
