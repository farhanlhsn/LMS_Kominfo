"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection, StatusBadge } from "../../../components/ui/core";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/states";
import {
  useLatestLegalDocuments,
  useMyConsents,
  useRecordConsent,
  useRequestAnonymization,
  useRequestDataExport,
} from "../../../lib/api-hooks";
import { Shield, FileDown, Trash2 } from "lucide-react";
import type { LegalDocumentType } from "../../../lib/lms-types";

export default function PrivacySettingsPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/settings/privacy">
        <PrivacySettingsBody />
      </AppShell>
    </AuthGate>
  );
}

const DOCUMENT_LABELS: Record<LegalDocumentType, string> = {
  PRIVACY_POLICY: "Privacy policy",
  TERMS: "Terms of service",
  COOKIE_POLICY: "Cookie policy",
  DPA: "Data processing addendum",
};

function PrivacySettingsBody() {
  const { data: documents = [], isLoading: loadingDocs } = useLatestLegalDocuments();
  const { data: consents = [], refetch: refetchConsents } = useMyConsents();
  const recordConsent = useRecordConsent();
  const requestExport = useRequestDataExport();
  const requestAnonymize = useRequestAnonymization();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anonymizeConfirm, setAnonymizeConfirm] = useState(false);

  useEffect(() => {
    setStatus(null);
  }, []);

  const acceptDocument = useCallback(
    async (doc: { type: LegalDocumentType; version: string; id: string }) => {
      setError(null);
      try {
        await recordConsent({
          documentType: doc.type,
          documentVersion: doc.version,
          documentId: doc.id,
        });
        await refetchConsents();
        setStatus(`Recorded consent for ${DOCUMENT_LABELS[doc.type]}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record consent");
      }
    },
    [recordConsent, refetchConsents],
  );

  const handleExport = useCallback(async () => {
    setError(null);
    try {
      const { data } = await requestExport("self-service");
      setStatus(`Data export ready: ${data.downloadUrl ?? data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request export");
    }
  }, [requestExport]);

  const handleAnonymize = useCallback(async () => {
    if (!anonymizeConfirm) {
      setError("Please confirm that you want to anonymize your account");
      return;
    }
    setError(null);
    try {
      await requestAnonymize({ confirm: true });
      setStatus("Your account has been anonymized. You will be signed out shortly.");
      setAnonymizeConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to anonymize");
    }
  }, [anonymizeConfirm, requestAnonymize]);

  const consentsByType = new Map<string, string>();
  (consents ?? []).forEach((consent) => {
    const key = `${consent.documentType}@${consent.documentVersion}`;
    if (!consentsByType.has(key)) {
      consentsByType.set(key, consent.grantedAt);
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Privacy & data"
        description="Review the legal documents that apply to this organization and control how your data is handled."
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
        title="Legal documents"
        description="These are the published documents for this organization. Accepting a document records the version and timestamp."
      >
        {loadingDocs ? (
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        ) : (documents ?? []).length === 0 ? (
          <EmptyState
            title="No published documents yet"
            description="Your organization has not published any legal documents. Check back later."
            icon={Shield}
          />
        ) : (
          <ul className="space-y-3">
            {(documents ?? []).map((doc) => {
              const accepted = consentsByType.has(`${doc.type}@${doc.version}`);
              return (
                <li key={doc.id} className="rounded-md border border-border bg-card p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{DOCUMENT_LABELS[doc.type]}</h3>
                      <p className="text-xs text-muted-foreground">Version {doc.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={accepted ? "success" : "neutral"} value={accepted ? "Accepted" : "Pending"} />
                      <Button size="sm" variant="outline" onClick={() => void acceptDocument(doc)}>
                        {accepted ? "Re-accept" : "Accept"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{doc.title}</p>
                </li>
              );
            })}
          </ul>
        )}
      </FormSection>

      <FormSection
        title="My consents"
        description="History of the documents you have accepted. These entries include the version, IP and user agent of the device used."
      >
        {(consents ?? []).length === 0 ? (
          <EmptyState
            title="No consents recorded"
            description="Accept a document above to start your consent log."
            icon={Shield}
          />
        ) : (
          <ul className="space-y-1 text-sm">
            {(consents ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 md:flex-row md:items-center md:justify-between">
                <span>
                  {DOCUMENT_LABELS[entry.documentType]} v{entry.documentVersion}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.grantedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Request a data export</h3>
            <p className="text-sm text-muted-foreground">
              Download a copy of the data this organization has on you. The request is processed
              immediately and the snapshot is available from your account area.
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} className="w-full" data-testid="data-export">
              <FileDown className="mr-2 h-4 w-4" />
              Request data export
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Anonymize my account</h3>
            <p className="text-sm text-muted-foreground">
              PII will be removed and your account deactivated. This cannot be undone.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymizeConfirm}
                onChange={(event) => setAnonymizeConfirm(event.target.checked)}
              />
              I understand this action is irreversible.
            </label>
            <Button
              variant="destructive"
              onClick={handleAnonymize}
              disabled={!anonymizeConfirm}
              className="w-full"
              data-testid="anonymize-me"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Anonymize account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
