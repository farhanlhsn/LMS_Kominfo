"use client";

import { useState } from "react";
import type { ApiKey } from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

export function ApiKeyList({
  keys,
  onRevoke,
  revokingId,
}: {
  keys: ApiKey[];
  onRevoke: (key: ApiKey) => void;
  revokingId?: string | null;
}) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  if (keys.length === 0) {
    return (
      <EmptyState
        description="API keys let external systems integrate with this organization."
        title="No API keys"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Prefix</th>
            <th className="px-4 py-3">Scopes</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last used</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {keys.map((key) => {
            const isRevealed = Boolean(revealed[key.id]);
            return (
              <tr key={key.id}>
                <td className="px-4 py-3 font-semibold">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {key.keyPrefix}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {key.scopes?.length ? key.scopes.join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={key.status === "ACTIVE" ? "success" : "neutral"}
                    value={(key.status ?? "UNKNOWN").toLowerCase()}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleString()
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {key.rawKey ? (
                      <button
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                        onClick={() =>
                          setRevealed((current) => ({
                            ...current,
                            [key.id]: key.rawKey ?? "",
                          }))
                        }
                        type="button"
                      >
                        {isRevealed ? "Hide" : "Reveal"}
                      </button>
                    ) : null}
                    {key.status === "ACTIVE" ? (
                      <button
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        disabled={revokingId === key.id}
                        onClick={() => onRevoke(key)}
                        type="button"
                      >
                        {revokingId === key.id ? "Revoking" : "Revoke"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {Object.values(revealed).some((value) => value.length > 0) ? (
        <div className="border-t border-border bg-warning/5 px-4 py-3 text-sm text-warning">
          <p className="font-semibold">Raw API keys</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {Object.entries(revealed).map(([id, rawKey]) =>
              rawKey ? (
                <li key={id}>{rawKey}</li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
