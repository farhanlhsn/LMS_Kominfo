"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useLoginPolicy } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { LoginPolicy } from "../../../../lib/lms-types";

function defaultPolicy(): LoginPolicy {
  return {
    id: "",
    allowPasswordLogin: true,
    allowSocialLogin: true,
    allowSsoLogin: false,
    requireSsoForVerifiedDomains: false,
    jitProvisioningEnabled: true,
    inviteOnly: false,
    mfaRequired: false,
    sessionTtlMinutes: 60 * 24,
  };
}

export default function EnterpriseLoginPolicyPage() {
  const query = useLoginPolicy();
  const [form, setForm] = useState<LoginPolicy>(defaultPolicy);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setForm({ ...defaultPolicy(), ...query.data });
  }, [query.data]);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const { api } = await import("../../../../lib/api-client");
      await api.updateLoginPolicy({
        allowPasswordLogin: form.allowPasswordLogin,
        allowSocialLogin: form.allowSocialLogin,
        allowSsoLogin: form.allowSsoLogin,
        requireSsoForVerifiedDomains: form.requireSsoForVerifiedDomains,
        jitProvisioningEnabled: form.jitProvisioningEnabled,
        inviteOnly: form.inviteOnly,
        mfaRequired: form.mfaRequired,
        sessionTtlMinutes: form.sessionTtlMinutes,
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/enterprise/login-policy">
          <PageHeader
            eyebrow="Enterprise"
            title="Login policy"
            description="Control how members sign in to this organization."
          />

          {query.loading ? (
            <LoadingState title="Loading login policy" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load login policy"
            />
          ) : (
            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["allowPasswordLogin", "Allow password login"],
                    ["allowSocialLogin", "Allow social login"],
                    ["allowSsoLogin", "Allow SSO login"],
                    [
                      "requireSsoForVerifiedDomains",
                      "Require SSO for verified domains",
                    ],
                    [
                      "jitProvisioningEnabled",
                      "Just-in-time user provisioning",
                    ],
                    ["inviteOnly", "Invite only"],
                    ["mfaRequired", "Require MFA"],
                  ] as const
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <input
                      checked={Boolean(form[field])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
                <label className="text-sm">
                  <span className="block text-muted-foreground">
                    Session TTL (minutes)
                  </span>
                  <input
                    className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                    min={5}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sessionTtlMinutes: Number(event.target.value) || 60,
                      }))
                    }
                    type="number"
                    value={form.sessionTtlMinutes}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={submitting}
                  onClick={save}
                  type="button"
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {submitting ? "Saving" : "Save policy"}
                </button>
                {savedAt ? (
                  <span className="text-xs text-muted-foreground" role="status">
                    Saved at {savedAt}
                  </span>
                ) : null}
              </div>
              {error ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </section>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
