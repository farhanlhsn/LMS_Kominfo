"use client";

import { FormEvent, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { PERMISSIONS } from "@lms/shared";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useUpdateCertificateTemplate,
} from "../../../lib/api-hooks";
import type { CertificateTemplate } from "../../../lib/lms-types";

export default function CertificateTemplatesPage() {
  const templates = useCertificateTemplates();
  const createTemplate = useCreateCertificateTemplate();
  const updateTemplate = useUpdateCertificateTemplate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState("ACTIVE");
  const [certificateTitle, setCertificateTitle] = useState(
    "Certificate of Completion",
  );
  const [accentColor, setAccentColor] = useState("#0f766e");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const input = {
      name: templateName,
      description: templateDescription,
      status: createStatus,
      design: {
        layout: "classic",
        title: certificateTitle,
        accentColor,
      },
    };
    if (editingId) {
      await updateTemplate(editingId, input);
    } else {
      await createTemplate(input);
    }
    formElement.reset();
    resetEditor();
    await templates.reload();
  }

  function resetEditor() {
    setEditingId(null);
    setTemplateName("");
    setTemplateDescription("");
    setCreateStatus("ACTIVE");
    setCertificateTitle("Certificate of Completion");
    setAccentColor("#0f766e");
  }

  function edit(template: CertificateTemplate) {
    const design = template.design ?? {};
    setEditingId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description ?? "");
    setCreateStatus(template.status);
    setCertificateTitle(
      typeof design.title === "string"
        ? design.title
        : "Certificate of Completion",
    );
    setAccentColor(
      typeof design.accentColor === "string"
        ? design.accentColor
        : "#0f766e",
    );
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.certificatesManage]}>
      <AppShell currentPath="/admin/certificate-templates">
        <PageHeader eyebrow="Certificates" title="Certificate templates" description="Manage reusable certificate designs for course completion." />
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit template" : "Create template"}
          </h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={create}>
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="name" onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" required value={templateName} />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="description" onChange={(event) => setTemplateDescription(event.target.value)} placeholder="Description" value={templateDescription} />
            <label className="text-sm">
              <span className="block text-muted-foreground">Certificate heading</span>
              <input
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setCertificateTitle(event.target.value)}
                value={certificateTitle}
              />
            </label>
            <label className="text-sm">
              <span className="block text-muted-foreground">Accent color</span>
              <span className="mt-1 flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                <input
                  aria-label="Accent color"
                  className="h-7 w-9"
                  onChange={(event) => setAccentColor(event.target.value)}
                  type="color"
                  value={accentColor}
                />
                <code className="text-xs">{accentColor}</code>
              </span>
            </label>
            <div className="relative w-full">
              <Select value={createStatus} onValueChange={setCreateStatus}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <button className="h-10 flex-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">{editingId ? "Save changes" : "Create template"}</button>
              {editingId ? (
                <button
                  className="h-10 rounded-md border border-border px-4 text-sm font-semibold"
                  onClick={resetEditor}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          <div
            className="mt-5 aspect-[1.414/1] max-w-xl border-4 bg-background p-8 text-center shadow-subtle"
            style={{ borderColor: accentColor }}
          >
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Learning certificate
            </p>
            <p className="mt-8 text-2xl font-semibold">{certificateTitle}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Learner name and course title populate when certificate is issued.
            </p>
          </div>
        </section>
        {templates.loading ? (
          <LoadingState title="Loading templates" />
        ) : templates.error ? (
          <ApiErrorState error={templates.error} fallbackTitle="Could not load templates" />
        ) : templates.data?.length ? (
          <DataTable
            size="compact"
            emptyMessage="No certificate templates."
            columns={["Template", "Status", "Description", "Design"]}
            rows={templates.data.map((template) => [
              template.name,
              <StatusBadge key="status" value={template.status} />,
              template.description ?? "No description",
              <button
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                key="edit"
                onClick={() => edit(template)}
                type="button"
              >
                Edit design
              </button>,
            ])}
          />
        ) : (
          <EmptyState title="No templates yet" description="Create a template before issuing certificates." />
        )}
      </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
