"use client";

import { useState } from "react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../components/ui/states";
import {
  useOrgLocalePreference,
  useUpdateOrgLocalePreference,
} from "../../../lib/api-hooks";
import type { OrgLocalePreference } from "../../../lib/lms-types";

const ALL_LOCALES = [
  "en",
  "id",
  "es",
  "fr",
  "de",
  "ja",
  "zh",
  "ar",
];

export default function AdminLocalePage() {
  const prefs = useOrgLocalePreference();
  const update = useUpdateOrgLocalePreference();
  const [supported, setSupported] = useState<string[] | null>(null);
  const [defaultLocale, setDefaultLocale] = useState<string | null>(null);
  const [fallbackChain, setFallbackChain] = useState<string[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const data = prefs.data as OrgLocalePreference | null;
  const currentSupported = supported ?? (data?.supportedLocales ?? []);
  const currentDefault = defaultLocale ?? data?.defaultLocale ?? "en";
  const currentFallback = fallbackChain ?? (data?.fallbackChain ?? []);

  function toggleSupported(code: string) {
    setSupported((prev) => {
      const list = prev ?? (data?.supportedLocales ?? []);
      return list.includes(code)
        ? list.filter((c) => c !== code)
        : [...list, code];
    });
  }

  async function handleSave() {
    setStatus(null);
    try {
      await update({
        supportedLocales: currentSupported,
        defaultLocale: currentDefault,
        fallbackChain: currentFallback,
      });
      setStatus("Locale preferences saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.contentLibraryManage]}>
        <AppShell currentPath="/admin/locale">
          <PageHeader
            eyebrow="Admin"
            title="Locale preferences"
            description="Manage supported locales, the default locale, and the fallback chain for this organization."
          />
          {status ? (
            <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {status}
            </p>
          ) : null}
          {prefs.loading ? (
            <LoadingState title="Loading locale preferences" />
          ) : prefs.error ? (
            <ApiErrorState error={prefs.error} fallbackTitle="Failed to load locale preferences" />
          ) : (
            <div className="flex flex-col gap-6">
              <section className="rounded-md border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Supported locales</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ALL_LOCALES.map((code) => {
                    const active = currentSupported.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleSupported(code)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-md border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Default locale</h2>
                <select
                  aria-label="Default locale"
                  value={currentDefault}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  className="mt-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  {currentSupported.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </section>

              <section className="rounded-md border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">Fallback chain</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ordered list of locales used when a translation is missing.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {currentFallback.length === 0 ? (
                    <span className="text-xs text-muted-foreground">None</span>
                  ) : (
                    currentFallback.map((code, index) => (
                      <span key={`${code}-${index}`} className="flex items-center gap-2">
                        <span className="rounded bg-muted px-2 py-1 text-xs">{code}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFallbackChain((prev) =>
                              (prev ?? (data?.fallbackChain ?? [])).filter((c) => c !== code),
                            )
                          }
                          className="text-xs text-destructive"
                        >
                          remove
                        </button>
                        {index < currentFallback.length - 1 ? <span className="text-muted-foreground">→</span> : null}
                      </span>
                    ))
                  )}
                </div>
                <select
                  aria-label="Add fallback locale"
                  value=""
                  onChange={(e) => {
                    const code = e.target.value;
                    if (!code) return;
                    setFallbackChain((prev) => {
                      const list = prev ?? (data?.fallbackChain ?? []);
                      return list.includes(code) ? list : [...list, code];
                    });
                  }}
                  className="mt-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="">Add locale to fallback chain…</option>
                  {currentSupported
                    .filter((c) => !currentFallback.includes(c))
                    .map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                </select>
              </section>

              <button
                type="button"
                onClick={() => void handleSave()}
                className="self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Save preferences
              </button>
            </div>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
