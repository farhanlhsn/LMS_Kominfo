"use client";

import { FormEvent } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useCertificateTemplates, useCreateCertificateTemplate } from "../../../lib/api-hooks";

export default function CertificateTemplatesPage() {
  const templates = useCertificateTemplates();
  const createTemplate = useCreateCertificateTemplate();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createTemplate({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      status: String(form.get("status") ?? "DRAFT"),
      design: { layout: "classic", title: "Certificate of Completion" },
    });
    event.currentTarget.reset();
    await templates.reload();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/admin">
        <PageHeader eyebrow="Certificates" title="Certificate templates" description="Manage reusable certificate designs for course completion." />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">Create template</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]" onSubmit={create}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="name" placeholder="Template name" required />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="description" placeholder="Description" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="status" defaultValue="ACTIVE">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">Create</button>
          </form>
        </section>
        {templates.loading ? (
          <LoadingState title="Loading templates" />
        ) : templates.error ? (
          <ApiErrorState error={templates.error} fallbackTitle="Could not load templates" />
        ) : templates.data?.length ? (
          <DataTable
            columns={["Template", "Status", "Description"]}
            rows={templates.data.map((template) => [
              template.name,
              <StatusBadge key="status" value={template.status} />,
              template.description ?? "No description",
            ])}
          />
        ) : (
          <EmptyState title="No templates yet" description="Create a template before issuing certificates." />
        )}
      </AppShell>
    </AuthGate>
  );
}
