"use client";

import { useState } from "react";
import { Award, Download } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useCertificates } from "../../../lib/api-hooks";
import { api } from "../../../lib/api-client";

export default function LearnerCertificatesPage() {
  const certificates = useCertificates();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  async function download(id: string) {
    setDownloading(id);
    setDownloadError(null);
    try {
      const result = await api.downloadCertificate(id);
      window.location.assign(result.url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Could not download certificate");
    } finally {
      setDownloading(null);
    }
  }
  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader eyebrow="Credentials" title="Certificates" description="View issued course certificates and open public verification." />
        {downloadError ? <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{downloadError}</p> : null}
        {certificates.loading ? (
          <LoadingState title="Loading certificates" />
        ) : certificates.error ? (
          <ApiErrorState error={certificates.error} fallbackTitle="Could not load certificates" />
        ) : certificates.data?.length ? (
          <DataTable
            columns={["Certificate", "Course", "Status", "PDF", "Issued", "Actions"]}
            rows={certificates.data.map((certificate) => [
              <span key="cert" className="inline-flex items-center gap-2 font-semibold"><Award aria-hidden="true" className="h-4 w-4 text-primary" />{certificate.certificateNumber}</span>,
              certificate.course?.title ?? certificate.courseId,
              <StatusBadge key="status" value={certificate.revokedAt ? "REVOKED" : certificate.expiresAt && new Date(certificate.expiresAt) < new Date() ? "EXPIRED" : "VALID"} />,
              <StatusBadge key="pdf" value={certificate.pdfStatus} tone={certificate.pdfStatus === "GENERATED" ? "success" : certificate.pdfStatus === "FAILED" ? "danger" : "warning"} />,
              new Date(certificate.issuedAt).toLocaleDateString(),
              <span key="actions" className="inline-flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-1 font-semibold text-primary disabled:opacity-50" disabled={downloading === certificate.id} onClick={() => void download(certificate.id)} type="button"><Download className="h-4 w-4" aria-hidden="true" />{downloading === certificate.id ? "Preparing…" : "Download PDF"}</button>
                <a className="font-semibold text-primary" href={`/certificates/verify/${certificate.verificationCode}`}>Verify</a>
              </span>,
            ])}
          />
        ) : (
          <EmptyState title="No certificates yet" description="Completed course certificates will appear here." />
        )}
      </AppShell>
    </AuthGate>
  );
}
