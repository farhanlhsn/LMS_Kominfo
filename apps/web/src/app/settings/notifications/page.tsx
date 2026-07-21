"use client";

import { useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { PushSubscribeButton } from "../../../components/pwa";
import { AppShell } from "../../../components/layout/shells";
import {
  PageHeader,
  FormSection,
  StatusBadge,
} from "../../../components/ui/core";
import { EmptyState } from "../../../components/ui/states";
import { api, ApiClientError, getSession } from "../../../lib/api-client";

interface SubscriptionRecord {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function PushSettingsPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/settings/notifications">
        <PushSettingsBody />
      </AppShell>
    </AuthGate>
  );
}

function PushSettingsBody() {
  const [subs, setSubs] = useState<SubscriptionRecord[] | null>(null);
  const [vapid, setVapid] = useState<{
    configured: boolean;
    publicKey: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const session = getSession();

  const load = async () => {
    if (!session) return;
    try {
      const [list, info] = await Promise.all([
        api.listPushSubscriptions(),
        api.getPushVapidInfo(),
      ]);
      setSubs(list);
      setVapid(info);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to load push subscriptions",
      );
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (endpoint: string) => {
    setAction(endpoint);
    try {
      await api.unsubscribePush(endpoint);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to remove subscription",
      );
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Push notifications"
        description="Manage browser push subscriptions for announcements, reminders, and live class alerts."
      />

      <FormSection
        title="Enable push"
        description="Allow the LMS to deliver notifications to this device even when the tab is closed."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm">
            <p className="font-medium">VAPID public key</p>
            <p className="text-muted-foreground">
              {vapid?.configured
                ? "VAPID is configured on the server."
                : "VAPID is not configured yet — subscriptions will not receive deliveries."}
            </p>
            <StatusBadge
              tone={vapid?.configured ? "success" : "warning"}
              value={vapid?.configured ? "Configured" : "Not configured"}
            />
          </div>
          <PushSubscribeButton />
        </div>
      </FormSection>

      <FormSection
        title="Active subscriptions"
        description="Each device or browser that subscribes for push notifications is listed below."
      >
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {subs === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : subs.length === 0 ? (
          <EmptyState
            title="No subscriptions yet"
            description="Enable push on a device to start receiving real-time notifications."
            icon={Bell}
          />
        ) : (
          <ul className="space-y-2" data-testid="push-subscriptions-list">
            {subs.map((sub) => (
              <li
                className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between"
                key={sub.id}
              >
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {sub.endpoint.slice(0, 80)}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub.userAgent ?? "Unknown user agent"}
                  </p>
                  {sub.expiresAt ? (
                    <p className="text-xs text-warning">
                      Expires {new Date(sub.expiresAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <button
                  className="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/30 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  disabled={action === sub.endpoint}
                  onClick={() => handleRemove(sub.endpoint)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-3 w-3" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </div>
  );
}
