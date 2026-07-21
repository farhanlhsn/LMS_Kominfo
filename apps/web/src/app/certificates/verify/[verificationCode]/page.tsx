"use client";

import { use } from "react";
import { Award, ShieldCheck } from "lucide-react";
import { PublicLayout } from "../../../../components/layout/shells";
import { StatusBadge } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useVerifyCertificate } from "../../../../lib/api-hooks";

export default function VerifyCertificatePage({ params }: { params: Promise<{ verificationCode: string }> }) {
  const { verificationCode } = use(params);
  const certificate = useVerifyCertificate(verificationCode);
  return (
    <PublicLayout>
      <main className="mx-auto max-w-3xl px-4 py-10">
        {certificate.loading ? (
          <LoadingState title="Verifying certificate" />
        ) : certificate.error ? (
          <ApiErrorState error={certificate.error} fallbackTitle="Certificate could not be verified" />
        ) : certificate.data ? (
          <section className="rounded-lg border border-border bg-card p-6 shadow-subtle">
            <div className="flex flex-wrap items-center gap-3">
              <Award aria-hidden="true" className="h-8 w-8 text-primary" />
              <StatusBadge value={certificate.data.status} tone={certificate.data.status === "VALID" ? "success" : "danger"} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Certificate verification</h1>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-medium text-muted-foreground">Learner</dt><dd className="mt-1 font-semibold">{certificate.data.learnerName ?? "Learner"}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Course</dt><dd className="mt-1 font-semibold">{certificate.data.courseTitle}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Organization</dt><dd className="mt-1 font-semibold">{certificate.data.organizationName}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Certificate number</dt><dd className="mt-1 font-semibold">{certificate.data.certificateNumber}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Issued</dt><dd className="mt-1 font-semibold">{new Date(certificate.data.issuedAt).toLocaleDateString()}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Expires</dt><dd className="mt-1 font-semibold">{certificate.data.expiresAt ? new Date(certificate.data.expiresAt).toLocaleDateString() : "No expiry"}</dd></div>
              <div><dt className="font-medium text-muted-foreground">Verification code</dt><dd className="mt-1 font-semibold">{certificate.data.verificationCode}</dd></div>
            </dl>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
              This page exposes only public-safe certificate details.
            </p>
          </section>
        ) : null}
      </main>
    </PublicLayout>
  );
}
