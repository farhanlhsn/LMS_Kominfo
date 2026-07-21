"use client";

import { use, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Printer } from "lucide-react";
import { AuthGate } from "../../../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../../../components/layout/shells";
import { ButtonLink, PageHeader, StatusBadge } from "../../../../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../../../../components/ui/states";
import { useCertificate } from "../../../../../../../lib/api-hooks";
import { api } from "../../../../../../../lib/api-client";

export default function CertificatePreviewPage({ params }: { params: Promise<{ courseId: string; certificateId: string }> }) {
  const { courseId, certificateId } = use(params);
  const certificate = useCertificate(certificateId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    try {
      const result = await api.downloadManagedCertificate(certificateId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Certificate download failed");
    } finally {
      setBusy(false);
    }
  }

  return <AuthGate><AppShell currentPath="/instructor/courses">
    {certificate.loading ? <LoadingState title="Loading certificate" /> : certificate.error || !certificate.data ? <ApiErrorState error={certificate.error} fallbackTitle="Could not load certificate" /> : <>
      <PageHeader eyebrow="Certificates" title="Certificate preview" description={certificate.data.course?.title ?? "Course certificate"} actions={<ButtonLink href={`/instructor/courses/${courseId}/certificates`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Certificates</ButtonLink>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-h-[34rem] items-center justify-center rounded-lg border border-border bg-muted/30 p-6">
          {certificate.data.pdfStatus === "GENERATED" && certificate.data.pdfFileId ? <iframe className="h-[32rem] w-full rounded border border-border bg-white" title="Certificate PDF" src={`/api/files/${encodeURIComponent(certificate.data.pdfFileId)}`} /> : <div className="max-w-lg rounded-lg border-8 border-primary/20 bg-card p-10 text-center shadow-subtle"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Certificate of completion</p><h2 className="mt-8 text-3xl font-bold">{certificate.data.course?.title}</h2><p className="mt-6 text-sm text-muted-foreground">This certifies that</p><p className="mt-2 text-2xl font-semibold">{certificate.data.user?.name ?? certificate.data.user?.email}</p><p className="mt-6 text-sm text-muted-foreground">has completed this course.</p><p className="mt-8 text-xs text-muted-foreground">{new Date(certificate.data.issuedAt).toLocaleDateString()}</p></div>}
        </section>
        <aside className="h-fit rounded-lg border border-border bg-card p-5 shadow-subtle"><h2 className="text-lg font-semibold">Certificate details</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Learner</dt><dd className="font-medium">{certificate.data.user?.name ?? certificate.data.user?.email ?? certificate.data.userId}</dd></div><div><dt className="text-muted-foreground">Certificate number</dt><dd className="font-mono">{certificate.data.certificateNumber}</dd></div><div><dt className="text-muted-foreground">Issued</dt><dd>{new Date(certificate.data.issuedAt).toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd><StatusBadge value={certificate.data.revokedAt ? "REVOKED" : "VALID"} /></dd></div></dl><div className="mt-6 grid gap-2"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy} onClick={() => void download()} type="button"><Download className="h-4 w-4" />Download PDF</button><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold" onClick={() => window.print()} type="button"><Printer className="h-4 w-4" />Print</button><a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold" href={`/certificates/verify/${encodeURIComponent(certificate.data.verificationCode)}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Open verification</a></div>{message ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{message}</p> : null}</aside>
      </div>
    </>}
  </AppShell></AuthGate>;
}
