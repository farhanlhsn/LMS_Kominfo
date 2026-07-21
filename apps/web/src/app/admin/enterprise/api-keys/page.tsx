"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { ApiKeyList } from "../../../../components/enterprise/api-key-list";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useApiKeys } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { ApiKey } from "../../../../lib/lms-types";

export default function EnterpriseApiKeysPage() {
  const query = useApiKeys();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [created, setCreated] = useState<ApiKey | null>(null);

  const keys = (query.data ?? []) as ApiKey[];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { api } = await import("../../../../lib/api-client");
      const next = (await api.createApiKey({
        name,
        scopes: scopes
          .split(",")
          .map((scope) => scope.trim())
          .filter(Boolean),
      })) as ApiKey;
      setCreated(next);
      setName("");
      setScopes("");
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(item: ApiKey) {
    setRevokingId(item.id);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.revokeApiKey(item.id);
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/enterprise/api-keys">
          <PageHeader
            eyebrow="Enterprise"
            title="API keys"
            description="Server-to-server credentials for the active organization."
          />

          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Create key</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
              <label className="text-sm">
                <span className="block text-muted-foreground">Name</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">
                  Scopes (comma separated)
                </span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setScopes(event.target.value)}
                  placeholder="courses:read, learners:read"
                  type="text"
                  value={scopes}
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  <KeyRound aria-hidden="true" className="h-4 w-4" />
                  {submitting ? "Creating" : "Create key"}
                </button>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
            {created?.rawKey ? (
              <p className="mt-3 text-sm text-warning" role="status">
                Copy this raw key now — it is only shown once. The list below
                will only display the prefix.
              </p>
            ) : null}
          </section>

          {query.loading ? (
            <LoadingState title="Loading API keys" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load API keys"
            />
          ) : (
            <ApiKeyList
              keys={keys}
              onRevoke={revoke}
              revokingId={revokingId}
            />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
