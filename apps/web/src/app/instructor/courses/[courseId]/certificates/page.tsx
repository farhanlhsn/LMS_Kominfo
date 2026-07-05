"use client";

import { FormEvent } from "react";
import { use } from "react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { api } from "../../../../../lib/api-client";
import { useCertificateTemplates, useCourseCertificates } from "../../../../../lib/api-hooks";

export default function CourseCertificatesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const certificates = useCourseCertificates(courseId);
  const templates = useCertificateTemplates();

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    await api.issueCertificate(courseId, {
      userId: String(form.get("userId") ?? ""),
      templateId: String(form.get("templateId") || "") || undefined,
      expiresAt: String(form.get("expiresAt") || "") || undefined,
    });
    element.reset();
    await certificates.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        <PageHeader eyebrow="Certificates" title="Course certificates" description="Issue and revoke learner certificates for completed courses." />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Issue certificate</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]" onSubmit={issue}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="userId" placeholder="Learner user id" required />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="templateId" defaultValue="">
              <option value="">No template</option>
              {(templates.data ?? []).map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="expiresAt" type="date" />
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Issue</button>
          </form>
        </section>
        {certificates.loading ? (
          <LoadingState title="Loading certificates" />
        ) : certificates.error ? (
          <ApiErrorState error={certificates.error} fallbackTitle="Could not load certificates" />
        ) : certificates.data?.length ? (
          <DataTable
            columns={["Certificate", "Learner", "Status", "PDF", "Verify", "Actions"]}
            rows={certificates.data.map((certificate) => [
              certificate.certificateNumber,
              certificate.user?.name ?? certificate.userId,
              <StatusBadge key="status" value={certificate.revokedAt ? "REVOKED" : certificate.expiresAt && new Date(certificate.expiresAt) < new Date() ? "EXPIRED" : "VALID"} />,
              <StatusBadge key="pdf" value={certificate.pdfStatus} tone={certificate.pdfStatus === "GENERATED" ? "success" : certificate.pdfStatus === "FAILED" ? "danger" : "warning"} />,
              <a key="verify" className="font-semibold text-primary" href={`/certificates/verify/${certificate.verificationCode}`}>Open</a>,
              <span key="actions" className="inline-flex flex-wrap gap-3">
                <button className="font-semibold text-primary" onClick={() => void api.downloadManagedCertificate(certificate.id).then(({ url }) => window.location.assign(url))} type="button">Download</button>
                <button className="font-semibold text-primary" onClick={() => void api.regenerateCertificatePdf(certificate.id).then(certificates.reload)} type="button">Regenerate PDF</button>
                {!certificate.revokedAt ? <button className="font-semibold text-destructive" onClick={() => void api.revokeCertificate(certificate.id, "Revoked by instructor").then(certificates.reload)} type="button">Revoke</button> : null}
              </span>,
            ])}
          />
        ) : (
          <EmptyState title="No certificates yet" description="Issue certificates after learners complete the course." />
        )}
      </AppShell>
    </AuthGate>
  );
}
