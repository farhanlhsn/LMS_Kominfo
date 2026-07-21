"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection, StatusBadge } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/states";
import { MfaSetupWizard } from "../../../components/oauth/MfaSetupWizard";
import { OAuthButton } from "../../../components/oauth/OAuthButton";
import {
  useOAuthAccounts,
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
  useUnlinkOAuthAccount,
} from "../../../lib/api-hooks";
import { ApiClientError } from "../../../lib/api-client";
import { KeyRound, Smartphone, Trash2 } from "lucide-react";
import type { OAuthAccount, RefreshSessionEntry } from "../../../lib/lms-types";

export default function SecuritySettingsPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/settings/security">
        <SecuritySettingsBody />
      </AppShell>
    </AuthGate>
  );
}

function SecuritySettingsBody() {
  const { data: accounts = [], refetch: refetchAccounts } = useOAuthAccounts();
  const { data: sessions = [], refetch: refetchSessions } = useSessions();
  const unlink = useUnlinkOAuthAccount();
  const revoke = useRevokeSession();
  const revokeAll = useRevokeAllSessions();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setStatus(null);
  }, []);

  const handleUnlink = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await unlink(id);
        await refetchAccounts();
        setStatus("OAuth account unlinked");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlink account");
      }
    },
    [unlink, refetchAccounts],
  );

  const handleRevoke = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await revoke(id);
        await refetchSessions();
        setStatus("Session revoked");
      } catch (err) {
        const message =
          err instanceof ApiClientError ? err.message : "Failed to revoke session";
        setError(message);
      }
    },
    [revoke, refetchSessions],
  );

  const handleRevokeAll = useCallback(async () => {
    setError(null);
    try {
      await revokeAll();
      await refetchSessions();
      setStatus("All other sessions have been revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    }
  }, [revokeAll, refetchSessions]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Security"
        description="Manage your multi-factor authentication, linked third-party accounts and active sessions."
      />

      {status ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <MfaSetupWizard />

      <FormSection
        title="Linked sign-in providers"
        description="Connect Google or Microsoft to make signing in easier. Unlinking a provider does not delete your account."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(accounts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No providers linked yet.</p>
          ) : (
            (accounts ?? []).map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onUnlink={() => void handleUnlink(account.id)}
              />
            ))
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <OAuthButton provider="GOOGLE" />
          <OAuthButton provider="MICROSOFT" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Use the buttons above to start a mock sign-in. The callback will return a profile you can
          link to your account.
        </p>
      </FormSection>

      <FormSection
        title="Active sessions"
        description="You can stay signed in on up to five devices. Revoking a session signs the device out immediately."
      >
        {(sessions ?? []).length === 0 ? (
          <EmptyState
            title="No active sessions"
            description="Sign in on another device to see it appear here."
            icon={Smartphone}
          />
        ) : (
          <ul className="space-y-2">
            {(sessions ?? []).map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onRevoke={() => void handleRevoke(session.id)}
              />
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="destructive" size="sm" onClick={handleRevokeAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Revoke all other sessions
          </Button>
        </div>
      </FormSection>
    </div>
  );
}

function AccountRow({ account, onUnlink }: { account: OAuthAccount; onUnlink: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">{account.provider}</h4>
            <p className="text-xs text-muted-foreground">{account.email ?? account.providerUserId}</p>
          </div>
          <StatusBadge tone="success" value="Linked" />
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onUnlink}>
          Unlink
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionRow({ session, onRevoke }: { session: RefreshSessionEntry; onRevoke: () => void }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{session.deviceInfo ?? "Unknown device"}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          IP: {session.ipAddress ?? "—"} • Last used {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "never"}
        </p>
        <p className="text-xs text-muted-foreground">Expires {new Date(session.expiresAt).toLocaleString()}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onRevoke}>
        Revoke
      </Button>
    </li>
  );
}
