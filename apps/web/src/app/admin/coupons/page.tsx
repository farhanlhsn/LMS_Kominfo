"use client";

import { useState } from "react";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { CouponList } from "../../../components/marketplace/coupon-list";
import { PageHeader } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useCoupons } from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { Coupon } from "../../../lib/lms-types";

export default function AdminCouponsPage() {
  const query = useCoupons();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Lazy import to keep this client component lean.
      const { api } = await import("../../../lib/api-client");
      await api.createCoupon({
        code,
        description,
        discountPercent,
        validFrom: validFrom
          ? new Date(`${validFrom}T00:00:00`).toISOString()
          : undefined,
        validUntil: validUntil
          ? new Date(`${validUntil}T23:59:59.999`).toISOString()
          : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
      });
      setCode("");
      setDescription("");
      setDiscountPercent(10);
      setValidFrom("");
      setValidUntil("");
      setMaxUses("");
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const coupons = (query.data ?? []) as Coupon[];

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/coupons">
          <PageHeader
            eyebrow="Admin"
            title="Coupons"
            description="Discount codes for the active organization catalog."
          />

          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Create coupon</h2>
            <form
              className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={createCoupon}
            >
              <label className="text-sm">
                <span className="block text-muted-foreground">Code</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  required
                  type="text"
                  value={code}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-muted-foreground">Description</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setDescription(event.target.value)}
                  type="text"
                  value={description}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">Discount %</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  max={100}
                  min={1}
                  onChange={(event) =>
                    setDiscountPercent(Number(event.target.value) || 0)
                  }
                  type="number"
                  value={discountPercent}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">Valid from</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setValidFrom(event.target.value)}
                  type="date"
                  value={validFrom}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">Valid until</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  min={validFrom || undefined}
                  onChange={(event) => setValidUntil(event.target.value)}
                  type="date"
                  value={validUntil}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">Max uses</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  min={1}
                  onChange={(event) => setMaxUses(event.target.value)}
                  placeholder="Unlimited"
                  type="number"
                  value={maxUses}
                />
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting || !code}
                  type="submit"
                >
                  {submitting ? "Creating" : "Create coupon"}
                </button>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          {query.loading ? (
            <LoadingState title="Loading coupons" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load coupons"
            />
          ) : (
            <CouponList coupons={coupons} />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
