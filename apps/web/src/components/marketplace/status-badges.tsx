import { StatusBadge } from "../ui/core";
import {
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "../../lib/marketplace";

export function OrderStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <StatusBadge tone={orderStatusTone(status)} value={orderStatusLabel(status)} />
  );
}

export function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <StatusBadge
      tone={paymentStatusTone(status)}
      value={paymentStatusLabel(status)}
    />
  );
}

export function SubscriptionStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  return (
    <StatusBadge
      tone={subscriptionStatusTone(status)}
      value={subscriptionStatusLabel(status)}
    />
  );
}
