"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../components/ui/select";
import {
  AuthGate,
  PermissionGate,
} from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { SsoProviderList } from "../../../../components/enterprise/sso-provider-list";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useSsoProviders } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { SsoProvider } from "../../../../lib/lms-types";

export default function EnterpriseSsoPage() {
  const query = useSsoProviders();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("OIDC");
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled, setEnabled] = useState(true);

  const providers = (query.data ?? []) as SsoProvider[];

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.createSsoProvider({
        name,
        type,
        issuer,
        clientId,
        clientSecret,
        enabled,
      });
      setName("");
      setIssuer("");
      setClientId("");
      setClientSecret("");
      await query.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/enterprise/sso">
          <PageHeader
            eyebrow="Enterprise"
            title="SSO providers"
            description="Connect identity providers for single sign-on."
          />

          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Add provider</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={create}>
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
                <span className="block text-muted-foreground">Type</span>
                <div className="relative w-full">
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="OIDC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OIDC">OIDC</SelectItem>
                      <SelectItem value="SAML">SAML</SelectItem>
                      <SelectItem value="GOOGLE_WORKSPACE">
                        Google Workspace
                      </SelectItem>
                      <SelectItem value="MICROSOFT_ENTRA">
                        Microsoft Entra ID
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-muted-foreground">Issuer</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setIssuer(event.target.value)}
                  required
                  type="text"
                  value={issuer}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">Client ID</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setClientId(event.target.value)}
                  required
                  type="text"
                  value={clientId}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">
                  Client secret
                </span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setClientSecret(event.target.value)}
                  required
                  type="password"
                  value={clientSecret}
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>Enabled</span>
              </label>
              <div className="sm:col-span-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {submitting ? "Creating" : "Add provider"}
                </button>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          {query.loading ? (
            <LoadingState title="Loading providers" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load providers"
            />
          ) : (
            <SsoProviderList providers={providers} />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
