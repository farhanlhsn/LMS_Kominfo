"use client";

import type { SubscriptionPlan, UserSubscription } from "../../lib/lms-types";
import {
  planIntervalLabel,
  formatCurrency,
  subscriptionWindow,
} from "../../lib/marketplace";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/states";
import { SubscriptionStatusBadge } from "./status-badges";

export function SubscriptionList({
  plans,
  subscriptions,
  onSubscribe,
  subscribingId,
}: {
  plans: SubscriptionPlan[];
  subscriptions: UserSubscription[];
  onSubscribe?: (planId: string) => void;
  subscribingId?: string | null;
}) {
  if (subscriptions.length === 0) {
    if (plans.length === 0) {
      return (
        <EmptyState
          description="Subscribe to a plan to unlock the catalog or unlimited enrollments."
          title="No active subscription"
        />
      );
    }
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="rounded-lg border border-border bg-card p-5 shadow-subtle"
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(plan.price, plan.currency)} ·{" "}
              {planIntervalLabel(plan)}
            </p>
            {plan.description ? (
              <p className="mt-2 text-sm leading-6 text-foreground">
                {plan.description}
              </p>
            ) : null}
            <Button
              className="mt-4"
              disabled={subscribingId === plan.id || !onSubscribe}
              onClick={() => onSubscribe?.(plan.id)}
            >
              {subscribingId === plan.id ? "Subscribing" : "Subscribe"}
            </Button>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {subscriptions.map((subscription) => {
        const plan =
          plans.find((candidate) => candidate.id === subscription.planId) ??
          subscription.plan;
        return (
          <article
            key={subscription.id}
            className="rounded-lg border border-border bg-card p-5 shadow-subtle"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Plan
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {plan?.name ?? "Subscription"}
                </h3>
                {plan ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(plan.price, plan.currency)} ·{" "}
                    {planIntervalLabel(plan)}
                  </p>
                ) : null}
              </div>
              <SubscriptionStatusBadge status={subscription.status} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {subscriptionWindow(subscription)}
            </p>
            {plan?.description ? (
              <p className="mt-2 text-sm leading-6 text-foreground">
                {plan.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
