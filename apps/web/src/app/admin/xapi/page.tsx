"use client";

import { useState } from "react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FilterBar, StatusBadge } from "../../../components/ui/core";
import { XapiStatementList } from "../../../components/experiences/experiences-views";
import { usePostXapiStatements, useXapiStatements } from "../../../lib/api-hooks";

export default function AdminXapiPage() {
  const [limit, setLimit] = useState(50);
  const query = useXapiStatements(limit);
  const post = usePostXapiStatements();
  const [actor, setActor] = useState("learner@example.com");
  const [verb, setVerb] = useState("http://adlnet.gov/expapi/verbs/experienced");
  const [objectId, setObjectId] = useState("urn:lms:activity:1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const statements = (query.data ?? []) as Array<any>;

  const handleSimulate = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const result = await post([
        {
          actor: { mbox: `mailto:${actor}` },
          verb: { id: verb },
          object: { id: objectId, definition: { name: { "en-US": objectId } } },
          timestamp: new Date().toISOString(),
        },
      ]);
      setInfo(`Stored ${result.stored} statement(s).`);
      await query.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post statement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
    <AppShell currentPath="/admin/xapi">
      <div>
        <PageHeader
        eyebrow="Admin"
        title="xAPI statements"
        description="Interoperable learning-event records from activities, plugins, and external runtimes for analytics or Learning Record Store export."
      />

      <FilterBar>
        <label className="text-sm font-medium">
          Limit
          <input
            className="ml-2 h-9 w-20 rounded-md border border-input bg-card px-2 text-sm"
            max={200}
            min={1}
            onChange={(e) => setLimit(Number(e.target.value))}
            type="number"
            value={limit}
          />
        </label>
        <StatusBadge value={`${statements.length} statements`} tone="info" />
      </FilterBar>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <XapiStatementList statements={statements as any} />
        </div>
        <section className="rounded-lg border border-border bg-card p-4 shadow-subtle">
          <h2 className="text-sm font-semibold">Simulate event</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Send a manual xAPI statement for testing.
          </p>
          <div className="mt-3 grid gap-2 text-xs">
            <label>
              Actor email
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
                onChange={(e) => setActor(e.target.value)}
                value={actor}
              />
            </label>
            <label>
              Verb IRI
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
                onChange={(e) => setVerb(e.target.value)}
                value={verb}
              />
            </label>
            <label>
              Object IRI
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
                onChange={(e) => setObjectId(e.target.value)}
                value={objectId}
              />
            </label>
            {error ? <p className="text-destructive">{error}</p> : null}
            {info ? <p className="text-success">{info}</p> : null}
            <button
              className="rounded-md border border-primary bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={submitting}
              onClick={handleSimulate}
              type="button"
            >
              {submitting ? "Sending…" : "Send statement"}
            </button>
          </div>
        </section>
      </div>
      </div>
    </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
