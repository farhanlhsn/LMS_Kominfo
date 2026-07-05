"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { DomainList } from "../../../../components/enterprise/domain-list";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useDomains, useSsoProviders } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { OrgDomain, SsoProvider } from "../../../../lib/lms-types";

export default function EnterpriseDomainsPage() {
  const domainsQuery = useDomains();
  const providersQuery = useSsoProviders();
  const [domain, setDomain] = useState("");
  const [ssoProviderId, setSsoProviderId] = useState<string>("");
  const [enforceSso, setEnforceSso] = useState(false);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const domains = (domainsQuery.data ?? []) as OrgDomain[];
  const providers = (providersQuery.data ?? []) as SsoProvider[];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.createDomain({
        domain,
        ssoProviderId: ssoProviderId || null,
        enforceSso,
        autoJoinEnabled,
      });
      setDomain("");
      setSsoProviderId("");
      setEnforceSso(false);
      setAutoJoinEnabled(false);
      await domainsQuery.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(item: OrgDomain) {
    setVerifyingId(item.id);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.verifyDomain(item.id);
      await domainsQuery.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setVerifyingId(null);
    }
  }

  async function remove(item: OrgDomain) {
    setDeletingId(item.id);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.deleteDomain(item.id);
      await domainsQuery.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Enterprise"
            title="Verified domains"
            description="Domains linked to this organization for SSO and auto-join."
          />

          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
            <h2 className="text-base font-semibold">Add domain</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
              <label className="text-sm">
                <span className="block text-muted-foreground">Domain</span>
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setDomain(event.target.value.toLowerCase())}
                  placeholder="example.com"
                  required
                  type="text"
                  value={domain}
                />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground">SSO provider</span>
                <select
                  className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setSsoProviderId(event.target.value)}
                  value={ssoProviderId}
                >
                  <option value="">None</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={enforceSso}
                  onChange={(event) => setEnforceSso(event.target.checked)}
                  type="checkbox"
                />
                <span>Enforce SSO</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={autoJoinEnabled}
                  onChange={(event) => setAutoJoinEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>Auto-join</span>
              </label>
              <div className="sm:col-span-2">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {submitting ? "Adding" : "Add domain"}
                </button>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </section>

          {domainsQuery.loading ? (
            <LoadingState title="Loading domains" />
          ) : domainsQuery.error ? (
            <ApiErrorState
              error={domainsQuery.error}
              fallbackTitle="Could not load domains"
            />
          ) : (
            <DomainList
              deletingId={deletingId}
              domains={domains}
              onDelete={remove}
              onVerify={verify}
              verifyingId={verifyingId}
            />
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
