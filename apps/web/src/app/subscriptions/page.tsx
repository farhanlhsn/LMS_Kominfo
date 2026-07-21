"use client";

import { useState } from "react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { SubscriptionList } from "../../components/marketplace/subscription-list";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useMySubscriptions, useSubscriptionPlans } from "../../lib/api-hooks";

export default function MySubscriptionsPage() {
  const subsQuery = useMySubscriptions();
  const plansQuery = useSubscriptionPlans();
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  const subscriptions = subsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  async function subscribe(planId: string) {
    setSubscribingId(planId);
    setSubError(null);
    try {
      const { api } = await import("../../lib/api-client");
      await api.subscribe(planId);
      await subsQuery.reload();
    } catch (caught) {
      setSubError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubscribingId(null);
    }
  }

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
          <>
            {subError ? (
              <p className="mb-3 text-sm text-destructive" role="alert">
                {subError}
              </p>
            ) : null}
            <SubscriptionList
              onSubscribe={subscribe}
              plans={plans}
              subscribingId={subscribingId}
              subscriptions={subscriptions}
            />
          </>
        )}
      </AppShell>
    </AuthGate>
  );
}
