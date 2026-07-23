"use client";

import type { OrgDomain } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

type DomainTone = "neutral" | "success" | "warning" | "danger" | "info";

function verificationTone(status: string | null | undefined): DomainTone {
  switch ((status ?? "").toUpperCase()) {
    case "VERIFIED":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "danger";
    default:
      return "neutral";
  }
}

export function DomainList({
  domains,
  onVerify,
  onDelete,
  verifyingId,
  deletingId,
}: {
  domains: OrgDomain[];
  onVerify: (domain: OrgDomain) => void;
  onDelete: (domain: OrgDomain) => void;
  verifyingId?: string | null;
  deletingId?: string | null;
}) {
  if (domains.length === 0) {
    return (
      <EmptyState
        description="Register a domain to enforce SSO or auto-join for matching email addresses."
        title="No domains registered"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Verification</th>
            <th className="px-4 py-3">SSO</th>
            <th className="px-4 py-3">Auto-join</th>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {domains.map((domain) => (
            <tr key={domain.id}>
              <td className="px-4 py-3 font-semibold">{domain.domain}</td>
              <td className="px-4 py-3">
                <StatusBadge
                  tone={verificationTone(domain.verificationStatus)}
                  value={(domain.verificationStatus ?? "UNKNOWN").toLowerCase()}
                />
              </td>
              <td className="px-4 py-3">
                {domain.enforceSso ? (
                  <StatusBadge tone="info" value="Enforced" />
                ) : (
                  <span className="text-muted-foreground">Optional</span>
                )}
              </td>
              <td className="px-4 py-3">
                {domain.autoJoinEnabled ? (
                  <StatusBadge tone="success" value="Enabled" />
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {domain.ssoProvider?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {domain.verificationStatus !== "VERIFIED" ? (
                    <button
                      className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      disabled={verifyingId === domain.id}
                      onClick={() => onVerify(domain)}
                      type="button"
                    >
                      {verifyingId === domain.id
                        ? "Confirming"
                        : "Confirm ownership"}
                    </button>
                  ) : null}
                  <button
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    disabled={deletingId === domain.id}
                    onClick={() => onDelete(domain)}
                    type="button"
                  >
                    {deletingId === domain.id ? "Removing" : "Remove"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
