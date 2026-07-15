"use client";

import { useCallback, useState } from "react";
import { Scale, FileText, RefreshCw } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection, StatusBadge } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { EmptyState, LoadingState, ApiErrorState } from "../../../components/ui/states";
import {
  useBackupJobs,
  useCreateLegalDocument,
  useLegalDocuments,
  useRetentionPolicies,
  useTriggerBackupJob,
  useUpdateLegalDocument,
  useUpsertRetentionPolicy,
  useAdminDataExportRequests,
} from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { LegalDocumentType } from "../../../lib/lms-types";

const DOCUMENT_LABELS: Record<LegalDocumentType, string> = {
  PRIVACY_POLICY: "Privacy policy",
  TERMS: "Terms of service",
  COOKIE_POLICY: "Cookie policy",
  DPA: "Data processing addendum",
};

const ALL_TYPES: LegalDocumentType[] = [
  "PRIVACY_POLICY",
  "TERMS",
  "COOKIE_POLICY",
  "DPA",
];

export default function AdminLegalPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/legal">
          <AdminLegalBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function AdminLegalBody() {
  const [type, setType] = useState<LegalDocumentType>("PRIVACY_POLICY");
  const docsQuery = useLegalDocuments({ type });
  const { data: backups = [] } = useBackupJobs();
  const { data: retention = [] } = useRetentionPolicies();
  const { data: exports = [] } = useAdminDataExportRequests();
  const createLegal = useCreateLegalDocument();
  const updateLegal = useUpdateLegalDocument();
  const upsertRetention = useUpsertRetentionPolicy();
  const triggerBackup = useTriggerBackupJob();

  const [draft, setDraft] = useState({
    type: "PRIVACY_POLICY" as LegalDocumentType,
    version: "1.0.0",
    title: "",
    content: "",
    effectiveAt: new Date().toISOString().slice(0, 10),
    publish: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    try {
      await createLegal({
        ...draft,
        effectiveAt: new Date(draft.effectiveAt).toISOString(),
      });
      setStatus(`Created draft for ${DOCUMENT_LABELS[draft.type]}`);
      setDraft((prev) => ({ ...prev, title: "", content: "" }));
      docsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create legal document");
    }
  }, [createLegal, draft, docsQuery]);

  const publish = useCallback(
    async (id: string) => {
      try {
        await updateLegal(id, { publish: true });
        docsQuery.refetch();
        setStatus("Document published");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to publish");
      }
    },
    [updateLegal, docsQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Legal, data & backups"
        description="Publish legal documents, manage retention policies and trigger backups for this organization."
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

      <FormSection
        title="Create legal document"
        description="Draft a new version of a legal document. Once published, users will be able to accept the new version from the privacy page."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Type
            <div className="relative w-full">
              <Select value={draft.type} onValueChange={(val) => setDraft((prev) => ({ ...prev, type: val as LegalDocumentType }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DOCUMENT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </label>
          <label className="text-sm font-medium">
            Version
            <input
              type="text"
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={draft.version}
              onChange={(event) => setDraft((prev) => ({ ...prev, version: event.target.value }))}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Title
            <input
              type="text"
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Content
            <textarea
              rows={6}
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={draft.content}
              onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
            />
          </label>
          <label className="text-sm font-medium">
            Effective date
            <input
              type="date"
              className="mt-1 w-full rounded border border-border px-2 py-1"
              value={draft.effectiveAt}
              onChange={(event) => setDraft((prev) => ({ ...prev, effectiveAt: event.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.publish}
              onChange={(event) => setDraft((prev) => ({ ...prev, publish: event.target.checked }))}
            />
            Publish immediately
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}>Create document</Button>
        </div>
      </FormSection>

      <FormSection
        title="Existing documents"
        description="Review and re-publish versions of each document type."
      >
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm">
            Filter by type
            <div className="relative ml-2 inline-block w-48">
              <Select value={type} onValueChange={(val) => setType(val as LegalDocumentType)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DOCUMENT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </label>
          <Button variant="ghost" size="sm" onClick={() => void docsQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {docsQuery.isLoading ? (
          <LoadingState title="Loading documents" />
        ) : docsQuery.error ? (
          <ApiErrorState error={docsQuery.error} />
        ) : docsQuery.data && docsQuery.data.length === 0 ? (
          <EmptyState title="No documents" description="Create your first document above." icon={FileText} />
        ) : (
          <ul className="space-y-2">
            {(docsQuery.data ?? []).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {DOCUMENT_LABELS[doc.type]} v{doc.version}
                  </p>
                  <p className="text-xs text-muted-foreground">{doc.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={doc.publishedAt ? "success" : "warning"}
                    value={doc.publishedAt ? "Published" : "Draft"}
                  />
                  {!doc.publishedAt ? (
                    <Button size="sm" onClick={() => void publish(doc.id)}>
                      Publish
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Retention policies</h3>
            <p className="text-sm text-muted-foreground">
              Define how long user data is kept before being anonymized.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(retention ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No retention policies configured.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(retention ?? []).map((policy) => (
                  <li key={policy.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                    <span>{policy.entityType}</span>
                    <span className="text-xs text-muted-foreground">{policy.retentionDays} days</span>
                  </li>
                ))}
              </ul>
            )}
            <RetentionForm onSave={upsertRetention} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Backup jobs</h3>
            <p className="text-sm text-muted-foreground">
              Trigger a fresh snapshot of the organization data.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void triggerBackup({ type: "FULL" })}>
                <Scale className="mr-2 h-4 w-4" /> Run full backup
              </Button>
              <Button variant="outline" onClick={() => void triggerBackup({ type: "INCREMENTAL" })}>
                Run incremental
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {(backups ?? []).slice(0, 5).map((job) => (
                <li key={job.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                  <span>
                    {job.type} • {new Date(job.createdAt).toLocaleString()}
                  </span>
                  <StatusBadge tone={job.status === "COMPLETED" ? "success" : "warning"} value={job.status} />
                </li>
              ))}
              {(backups ?? []).length === 0 ? (
                <li className="text-xs text-muted-foreground">No backups yet.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <FormSection
        title="Data export requests"
        description="Track self-service export requests from learners."
      >
        {(exports ?? []).length === 0 ? (
          <EmptyState
            title="No export requests"
            description="When learners request their data, the requests will appear here."
            icon={FileText}
          />
        ) : (
          <ul className="space-y-1 text-sm">
            {(exports ?? []).map((request) => (
              <li key={request.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                <span>{request.userId}</span>
                <span className="text-xs text-muted-foreground">
                  {request.status} • {new Date(request.requestedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </div>
  );
}

function RetentionForm({
  onSave,
}: {
  onSave: (input: { entityType: string; retentionDays: number; anonymize?: boolean }) => Promise<unknown>;
}) {
  const [entityType, setEntityType] = useState("enrollment");
  const [retentionDays, setRetentionDays] = useState(365);
  const [anonymize, setAnonymize] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    try {
      await onSave({ entityType, retentionDays, anonymize });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    }
  }, [onSave, entityType, retentionDays, anonymize]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="flex flex-col">
          Entity
          <input
            className="mt-1 rounded border border-border px-2 py-1"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          />
        </label>
        <label className="flex flex-col">
          Retention (days)
          <input
            className="mt-1 rounded border border-border px-2 py-1"
            type="number"
            min={1}
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
          />
        </label>
        <label className="flex items-end gap-1 pb-1 text-xs">
          <input type="checkbox" checked={anonymize} onChange={(event) => setAnonymize(event.target.checked)} />
          Anonymize after retention
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button size="sm" onClick={submit}>
        Save policy
      </Button>
    </div>
  );
}
