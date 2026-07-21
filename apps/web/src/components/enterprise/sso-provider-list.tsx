"use client";

import type { SsoProvider } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

export function SsoProviderList({
  providers,
}: {
  providers: SsoProvider[];
}) {
  if (providers.length === 0) {
    return (
      <EmptyState
        description="Add an SSO provider to enable single sign-on for verified domains."
        title="No SSO providers"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Issuer</th>
            <th className="px-4 py-3">Identities</th>
            <th className="px-4 py-3">Domains</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {providers.map((provider) => (
            <tr key={provider.id}>
              <td className="px-4 py-3 font-semibold">{provider.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{provider.type}</td>
              <td className="px-4 py-3 text-muted-foreground">{provider.issuer}</td>
              <td className="px-4 py-3">{provider._count?.identities ?? 0}</td>
              <td className="px-4 py-3">{provider._count?.domains ?? 0}</td>
              <td className="px-4 py-3">
                <StatusBadge
                  tone={provider.enabled ? "success" : "neutral"}
                  value={provider.enabled ? "Enabled" : "Disabled"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
