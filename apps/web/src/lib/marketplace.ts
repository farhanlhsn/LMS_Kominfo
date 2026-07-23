import type {
  Order,
  SubscriptionPlan,
  UserSubscription,
} from "./lms-types";

// ── Currency ──────────────────────────────────────

const CURRENCY_LABELS: Record<string, string> = {
  IDR: "Rp",
  USD: "$",
  EUR: "€",
  SGD: "S$",
  MYR: "RM",
};

function safeCurrency(code: string | null | undefined): string {
  if (!code) return "IDR";
  return code.toUpperCase();
}

export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  const code = safeCurrency(currencyCode);
  const prefix = CURRENCY_LABELS[code] ?? "";
  // IDR/MYR are zero-decimal; show thousands separator for readability.
  if (code === "IDR" || code === "MYR") {
    return `${prefix} ${Math.round(amount).toLocaleString("id-ID")}`;
  }
  return `${prefix}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Status badges ─────────────────────────────────

export type OrderStatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const ORDER_STATUS_TONES: Record<string, OrderStatusTone> = {
  PENDING: "warning",
  PAID: "info",
  PROCESSING: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  REFUNDED: "danger",
  EXPIRED: "neutral",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
};

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return ORDER_STATUS_LABELS[status.toUpperCase()] ?? status;
}

export function orderStatusTone(status: string | null | undefined): OrderStatusTone {
  if (!status) return "neutral";
  return ORDER_STATUS_TONES[status.toUpperCase()] ?? "neutral";
}

const PAYMENT_STATUS_TONES: Record<string, OrderStatusTone> = {
  PENDING: "warning",
  AWAITING_REVIEW: "info",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "danger",
  EXPIRED: "neutral",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending confirmation",
  AWAITING_REVIEW: "Awaiting review",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
};

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return PAYMENT_STATUS_LABELS[status.toUpperCase()] ?? status;
}

export function paymentStatusTone(status: string | null | undefined): OrderStatusTone {
  if (!status) return "neutral";
  return PAYMENT_STATUS_TONES[status.toUpperCase()] ?? "neutral";
}

const SUBSCRIPTION_STATUS_TONES: Record<string, OrderStatusTone> = {
  ACTIVE: "success",
  PAUSED: "warning",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  TRIALING: "info",
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  TRIALING: "Trial",
};

export function subscriptionStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return "Unknown";
  return SUBSCRIPTION_STATUS_LABELS[status.toUpperCase()] ?? status;
}

export function subscriptionStatusTone(
  status: string | null | undefined,
): OrderStatusTone {
  if (!status) return "neutral";
  return SUBSCRIPTION_STATUS_TONES[status.toUpperCase()] ?? "neutral";
}

// ── Subscription plan description ──────────────────

export function planIntervalLabel(plan: SubscriptionPlan | null | undefined): string {
  if (!plan) return "";
  const count = plan.intervalCount && plan.intervalCount > 1 ? plan.intervalCount : 1;
  const unit = (plan.interval ?? "MONTHLY").toUpperCase();
  const unitLabel: Record<string, string> = {
    DAILY: "day",
    WEEKLY: "week",
    MONTHLY: "month",
    QUARTERLY: "quarter",
    YEARLY: "year",
  };
  return `Every ${count} ${unitLabel[unit] ?? unit.toLowerCase()}`;
}

// ── Course pricing decision ───────────────────────

export interface CoursePricingView {
  isPaid: boolean;
  price: number;
  currency: string;
}

export function coursePricing(course: {
  isPaid?: boolean | null;
  price?: number | null;
  currency?: string | null;
} | null | undefined): CoursePricingView {
  if (!course) {
    return { isPaid: false, price: 0, currency: "IDR" };
  }
  return {
    isPaid: Boolean(course.isPaid),
    price: course.price ?? 0,
    currency: safeCurrency(course.currency),
  };
}

export function shouldShowPaidCheckout(
  pricing: CoursePricingView,
): boolean {
  return pricing.isPaid && pricing.price > 0;
}

// ── Formatters for list views ─────────────────────

export function formatOrderTotal(order: Order | null | undefined): string {
  if (!order) return "—";
  return formatCurrency(order.total, order.currency);
}

export function formatSubscriptionPrice(plan: SubscriptionPlan | null | undefined): string {
  if (!plan) return "—";
  return `${formatCurrency(plan.price, plan.currency)}`;
}

export function subscriptionWindow(
  subscription: UserSubscription | null | undefined,
): string {
  if (!subscription) return "—";
  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
    return "—";
  }
  const start = new Date(subscription.currentPeriodStart);
  const end = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }
  const fmt = (value: Date) => value.toLocaleDateString();
  return `${fmt(start)} – ${fmt(end)}`;
}
