"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tag, ShoppingCart, Wallet } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { OrderStatusBadge } from "../../../components/marketplace/status-badges";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ButtonLink, PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useCourseDetail } from "../../../lib/api-hooks";
import { coursePricing, formatCurrency, shouldShowPaidCheckout } from "../../../lib/marketplace";
import type { Coupon, Order } from "../../../lib/lms-types";

function NewOrderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const courseId = params.get("courseId");
  const detailQuery = useCourseDetail(courseId);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const paymentId = createdOrder?.payments?.[0]?.id ?? null;
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const course = detailQuery.data;
  const pricing = coursePricing(course);
  const isPaid = shouldShowPaidCheckout(pricing);

  // Clear stale result if course changes.
  useEffect(() => {
    setCreatedOrder(null);
    setSubmitError(null);
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setBankName("");
    setAccountNumber("");
    setProofImageUrl("");
    setConfirmError(null);
    setConfirming(false);
    setConfirmed(false);
  }, [courseId]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || !isPaid) return 0;
    if (appliedCoupon.discountPercent > 0) {
      return Math.round((pricing.price * appliedCoupon.discountPercent) / 100);
    }
    return appliedCoupon.discountAmount ?? 0;
  }, [appliedCoupon, isPaid, pricing.price]);

  const total = Math.max(0, pricing.price - discountAmount);

  async function applyCoupon() {
    if (!couponCode.trim() || !course) return;
    setCouponError(null);
    setApplyingCoupon(true);
    try {
      const { api } = await import("../../../lib/api-client");
      const coupon = await api.validateCoupon(couponCode.trim(), [course.id]);
      setAppliedCoupon(coupon);
    } catch (caught) {
      setAppliedCoupon(null);
      setCouponError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function createOrder() {
    if (!course) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { api } = await import("../../../lib/api-client");
      const order = await api.createOrder({
        courseIds: [course.id],
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        ...(notes ? { notes } : {}),
      });
      setCreatedOrder(order as Order);
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPayment() {
    if (!paymentId) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const { api } = await import("../../../lib/api-client");
      await api.confirmPayment({
        paymentId,
        ...(bankName.trim() ? { bankName: bankName.trim() } : {}),
        ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}),
        ...(proofImageUrl.trim() ? { proofImageUrl: proofImageUrl.trim() } : {}),
      });
      setConfirmed(true);
    } catch (caught) {
      setConfirmError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AppShell currentPath="/courses">
      {detailQuery.loading ? (
        <LoadingState title="Loading course" />
      ) : detailQuery.error || !course ? (
        <ApiErrorState
          error={detailQuery.error}
          fallbackTitle="Could not load course"
          fallbackDescription="The course is unavailable."
        />
      ) : !isPaid ? (
        <section className="rounded-lg border border-border bg-card p-8 shadow-subtle">
          <h2 className="text-lg font-semibold">No payment required</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This course is free for the active organization. Continue to enroll.
          </p>
          <div className="mt-5">
            <ButtonLink href={`/courses/${encodeURIComponent(course.slug ?? course.id)}`}>
              Back to course
            </ButtonLink>
          </div>
        </section>
      ) : createdOrder ? (
        <>
          <PageHeader
            breadcrumbs={[
              { label: "Courses", href: "/courses" },
              { label: course.title, href: `/courses/${encodeURIComponent(course.slug ?? course.id)}` },
              { label: "Order created" },
            ]}
            eyebrow="Order created"
            title={createdOrder.orderNumber}
            description="Your order has been created. Submit a payment to confirm enrollment."
            actions={<OrderStatusBadge status={createdOrder.status} />}
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon={ShoppingCart} label="Items" value={String(createdOrder.items.length)} />
            <StatCard
              icon={Wallet}
              label="Total"
              value={formatCurrency(createdOrder.total, createdOrder.currency)}
            />
            <StatCard
              icon={Tag}
              label="Discount"
              value={formatCurrency(createdOrder.discountAmount, createdOrder.currency)}
            />
          </section>

          <article className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Confirm payment</h2>
            {confirmed ? (
              <p className="mt-3 text-sm text-success" role="status">
                Payment proof submitted. An admin will review it shortly.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Bank name</Label>
                    <Input
                      id="bankName"
                      onChange={(event) => setBankName(event.target.value)}
                      placeholder="e.g. BCA"
                      value={bankName}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber">Account number / payment reference</Label>
                    <Input
                      id="accountNumber"
                      onChange={(event) => setAccountNumber(event.target.value)}
                      placeholder="Reference or account number"
                      value={accountNumber}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proofImageUrl">Proof image URL (optional)</Label>
                  <Input
                    id="proofImageUrl"
                    onChange={(event) => setProofImageUrl(event.target.value)}
                    placeholder="https://…/receipt.png"
                    value={proofImageUrl}
                  />
                </div>
                <Button
                  disabled={confirming || !paymentId}
                  onClick={confirmPayment}
                >
                  {confirming ? "Submitting" : "Confirm payment"}
                </Button>
                {confirmError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {confirmError}
                  </p>
                ) : null}
              </div>
            )}
          </article>

          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/orders/${encodeURIComponent(createdOrder.id)}`}>
              View order detail
            </ButtonLink>
            <ButtonLink href="/orders" variant="secondary">
              My orders
            </ButtonLink>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              onClick={() => {
                setCreatedOrder(null);
                router.push("/orders");
              }}
              type="button"
            >
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            breadcrumbs={[
              { label: "Courses", href: "/courses" },
              { label: course.title, href: `/courses/${encodeURIComponent(course.slug ?? course.id)}` },
              { label: "Checkout" },
            ]}
            eyebrow="Checkout"
            title={`Buy ${course.title}`}
            description="Review pricing, apply a coupon, and create the order."
          />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-base font-semibold">Order summary</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                <li className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-medium">{course.title}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(pricing.price, pricing.currency)}
                  </span>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(discountAmount, pricing.currency)}
                  </span>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    {formatCurrency(total, pricing.currency)}
                  </span>
                </li>
              </ul>
            </article>

            <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <h2 className="text-base font-semibold">Coupon</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                  <span className="sr-only">Coupon code</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    type="text"
                    value={couponCode}
                  />
                </label>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                  disabled={applyingCoupon || !couponCode.trim()}
                  onClick={applyCoupon}
                  type="button"
                >
                  {applyingCoupon ? "Applying" : "Apply"}
                </button>
              </div>
              {appliedCoupon ? (
                <p className="mt-2 text-sm text-success" role="status">
                  Coupon {appliedCoupon.code} applied.
                </p>
              ) : null}
              {couponError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {couponError}
                </p>
              ) : null}

              <h2 className="mt-5 text-base font-semibold">Notes</h2>
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-input bg-card p-3 text-sm text-foreground outline-none"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for finance or admin"
                value={notes}
              />

              <button
                className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                disabled={submitting}
                onClick={createOrder}
                type="button"
              >
                {submitting ? "Creating order" : "Create order"}
              </button>
              {submitError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
            </article>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default function NewOrderPage() {
  return (
    <AuthGate>
      <Suspense fallback={<LoadingState title="Preparing checkout" />}>
        <NewOrderInner />
      </Suspense>
    </AuthGate>
  );
}
