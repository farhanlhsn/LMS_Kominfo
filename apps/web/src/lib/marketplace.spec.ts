import { describe, expect, it } from "vitest";
import {
  coursePricing,
  formatCurrency,
  formatOrderTotal,
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
  planIntervalLabel,
  shouldShowPaidCheckout,
  subscriptionStatusLabel,
  subscriptionStatusTone,
  subscriptionWindow,
} from "./marketplace";

describe("marketplace utils", () => {
  it("formats IDR with thousands separator and no decimals", () => {
    expect(formatCurrency(1500000, "IDR")).toContain("1.500.000");
  });

  it("formats USD with two decimals", () => {
    expect(formatCurrency(12.5, "USD")).toContain("12.50");
  });

  it("returns dash for null amount", () => {
    expect(formatCurrency(null, "USD")).toBe("—");
  });

  it("falls back to IDR when currency is missing", () => {
    expect(formatCurrency(10, null)).toContain("Rp 10");
  });

  it("maps order status to label and tone", () => {
    expect(orderStatusLabel("PENDING")).toBe("Pending payment");
    expect(orderStatusTone("COMPLETED")).toBe("success");
    expect(orderStatusTone("CANCELLED")).toBe("danger");
    expect(orderStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("maps payment status to label and tone", () => {
    expect(paymentStatusLabel("PENDING")).toBe("Pending confirmation");
    expect(paymentStatusLabel("AWAITING_REVIEW")).toBe("Awaiting review");
    expect(paymentStatusLabel("PAID")).toBe("Paid");
    expect(paymentStatusTone("AWAITING_REVIEW")).toBe("info");
    expect(paymentStatusTone("PAID")).toBe("success");
  });

  it("maps subscription status to label and tone", () => {
    expect(subscriptionStatusLabel("ACTIVE")).toBe("Active");
    expect(subscriptionStatusTone("EXPIRED")).toBe("neutral");
  });

  it("formats plan interval", () => {
    expect(
      planIntervalLabel({
        id: "p1",
        name: "Pro",
        description: null,
        price: 100,
        currency: "USD",
        interval: "MONTHLY",
        intervalCount: 1,
        courseAccess: "ALL",
        maxEnrollments: null,
        isActive: true,
      }),
    ).toBe("Every 1 month");
  });

  it("derives pricing view from a course", () => {
    expect(
      coursePricing({ isPaid: true, price: 100, currency: "IDR" }),
    ).toEqual({ isPaid: true, price: 100, currency: "IDR" });
    expect(coursePricing({ isPaid: false })).toEqual({
      isPaid: false,
      price: 0,
      currency: "IDR",
    });
    expect(coursePricing(null)).toEqual({
      isPaid: false,
      price: 0,
      currency: "IDR",
    });
  });

  it("decides whether to show paid checkout", () => {
    expect(
      shouldShowPaidCheckout({ isPaid: true, price: 100, currency: "USD" }),
    ).toBe(true);
    expect(
      shouldShowPaidCheckout({ isPaid: true, price: 0, currency: "USD" }),
    ).toBe(false);
    expect(
      shouldShowPaidCheckout({ isPaid: false, price: 100, currency: "USD" }),
    ).toBe(false);
  });

  it("formats order total safely", () => {
    expect(formatOrderTotal(null)).toBe("—");
    expect(
      formatOrderTotal({
        id: "o1",
        organizationId: "org1",
        userId: "u1",
        orderNumber: "ORD-1",
        status: "PENDING",
        subtotal: 100,
        discountAmount: 10,
        total: 90,
        currency: "USD",
        couponId: null,
        notes: null,
        paidAt: null,
        createdAt: new Date().toISOString(),
        items: [],
      }),
    ).toContain("90.00");
  });

  it("renders subscription period window", () => {
    const start = "2026-01-01T00:00:00.000Z";
    const end = "2026-02-01T00:00:00.000Z";
    const result = subscriptionWindow({
      id: "s1",
      planId: "p1",
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      plan: {
        id: "p1",
        name: "Pro",
        description: null,
        price: 100,
        currency: "USD",
        interval: "MONTHLY",
        intervalCount: 1,
        courseAccess: "ALL",
        maxEnrollments: null,
        isActive: true,
      },
    });
    expect(result).not.toBe("—");
    expect(result).toContain("–");
  });

  it("returns dash when subscription period is missing", () => {
    expect(
      subscriptionWindow({
        id: "s1",
        planId: "p1",
        status: "ACTIVE",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        plan: {
          id: "p1",
          name: "Pro",
          description: null,
          price: 100,
          currency: "USD",
          interval: "MONTHLY",
          intervalCount: 1,
          courseAccess: "ALL",
          maxEnrollments: null,
          isActive: true,
        },
      }),
    ).toBe("—");
  });
});
