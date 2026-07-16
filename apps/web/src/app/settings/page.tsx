"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { PageHeader, ButtonLink } from "../../components/ui/core";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { LocaleSwitcher } from "../../components/locale/LocaleSwitcher";

export default function SettingsPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/settings">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          description="Manage your language, timezone, and account preferences."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Language & region</h3>
              <p className="text-sm text-muted-foreground">
                Choose the language and timezone used across the platform.
              </p>
            </CardHeader>
            <CardContent>
              <LocaleSwitcher />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">More settings</h3>
              <p className="text-sm text-muted-foreground">
                Manage notifications, privacy, and security.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <ButtonLink href="/settings/notifications" variant="secondary">
                Notifications
              </ButtonLink>
              <ButtonLink href="/settings/privacy" variant="secondary">
                Privacy & data
              </ButtonLink>
              <ButtonLink href="/settings/security" variant="secondary">
                Security
              </ButtonLink>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGate>
  );
}
