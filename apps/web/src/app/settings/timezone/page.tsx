"use client";

import { useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../components/ui/states";
import { useMyTimezone, useUpdateMyTimezone } from "../../../lib/api-hooks";

const TIMEZONES = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Africa/Johannesburg",
];

export default function TimezoneSettingsPage() {
  const tz = useMyTimezone();
  const update = useUpdateMyTimezone();
  const [status, setStatus] = useState<string | null>(null);

  async function handleChange(value: string) {
    setStatus(null);
    try {
      await update({ timezone: value });
      setStatus("Timezone saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save timezone");
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/settings/timezone">
        <PageHeader
          eyebrow="Settings"
          title="Timezone"
          description="Set the timezone used for schedules, deadlines, and reports."
        />
        {status ? (
          <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
        {tz.loading ? (
          <LoadingState title="Loading timezone" />
        ) : tz.error ? (
          <ApiErrorState error={tz.error} fallbackTitle="Failed to load timezone" />
        ) : (
          <section className="rounded-md border border-border bg-card p-4">
            <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              value={tz.data?.timezone ?? "UTC"}
              onChange={(e) => void handleChange(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              Auto-detect on next visit: {tz.data?.autoDetect ? "on" : "off"}. Last updated:{" "}
              {tz.data?.updatedAt ? new Date(tz.data.updatedAt).toLocaleString() : "never"}.
            </p>
          </section>
        )}
      </AppShell>
    </AuthGate>
  );
}
