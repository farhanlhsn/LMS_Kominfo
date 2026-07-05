"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { SubscriptionList } from "../../components/marketplace/subscription-list";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useMySubscriptions, useSubscriptionPlans } from "../../lib/api-hooks";

export default function MySubscriptionsPage() {
  const subsQuery = useMySubscriptions();
  const plansQuery = useSubscriptionPlans();

  const subscriptions = subsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Marketplace"
          title="My Subscriptions"
          description="Active subscription plans and billing windows."
        />

        {subsQuery.loading || plansQuery.loading ? (
          <LoadingState title="Loading subscriptions" />
        ) : subsQuery.error ? (
          <ApiErrorState
            error={subsQuery.error}
            fallbackTitle="Could not load subscriptions"
          />
        ) : (
          <SubscriptionList plans={plans} subscriptions={subscriptions} />
        )}
      </AppShell>
    </AuthGate>
  );
}
