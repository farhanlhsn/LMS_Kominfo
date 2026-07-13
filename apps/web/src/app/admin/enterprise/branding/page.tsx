"use client";

import { useEffect, useRef, useState } from "react";
import { Image, Save, Upload } from "lucide-react";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { PageHeader } from "../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../components/ui/states";
import { useBranding } from "../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { Branding } from "../../../../lib/lms-types";

function defaultBranding(): Branding {
  return {
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#0f766e",
    secondaryColor: "#0f172a",
    accentColor: "#22c55e",
    borderRadius: "0.75rem",
    name: "Organization",
    slug: "org",
  };
}

async function uploadAndGetUrl(file: File): Promise<string> {
  const { api } = await import("../../../../lib/api-client");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "BRANDING");
  const asset = await api.uploadFile(formData);
  const { url } = await api.signedFileUrl(asset.id);
  return url;
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAndGetUrl(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <label className="text-sm">
      <span className="block text-muted-foreground">{label}</span>
      <div className="mt-1 flex gap-2">
        <input
          className="min-h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground"
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://... or upload →"
          type="url"
          value={value ?? ""}
        />
        <button
          type="button"
          title={`Upload ${label}`}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <img src={value} alt={label} className="h-8 w-auto rounded border border-border object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
        </div>
      )}
    </label>
  );
}

export default function EnterpriseBrandingPage() {
  const query = useBranding();
  const [form, setForm] = useState<Branding>(defaultBranding);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const { api } = await import("../../../../lib/api-client");
      const next = await api.updateBranding({
        logoUrl: form.logoUrl,
        faviconUrl: form.faviconUrl,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        borderRadius: form.borderRadius,
      });
      setForm(next);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Enterprise"
            title="Branding"
            description="White-label the active organization across the platform."
          />

          {query.loading ? (
            <LoadingState title="Loading branding" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load branding"
            />
          ) : (
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="text-base font-semibold">Identity</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ImageUploadField
                    label="Logo"
                    value={form.logoUrl}
                    onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
                  />
                  <ImageUploadField
                    label="Favicon"
                    value={form.faviconUrl}
                    onChange={(url) => setForm((f) => ({ ...f, faviconUrl: url }))}
                  />
                  <label className="text-sm">
                    <span className="block text-muted-foreground">Border radius</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          borderRadius: event.target.value,
                        }))
                      }
                      type="text"
                      value={form.borderRadius}
                    />
                  </label>
                </div>

                <h2 className="mt-5 text-base font-semibold">Colors</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["primaryColor", "Primary"],
                      ["secondaryColor", "Secondary"],
                      ["accentColor", "Accent"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="text-sm">
                      <span className="block text-muted-foreground">{label}</span>
                      <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1">
                        <input
                          aria-label={`${label} color`}
                          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }))
                          }
                          type="color"
                          value={form[field]}
                        />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }))
                          }
                          type="text"
                          value={form[field]}
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    disabled={submitting}
                    onClick={save}
                    type="button"
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    {submitting ? "Saving" : "Save branding"}
                  </button>
                  {savedAt ? (
                    <span className="text-xs text-muted-foreground" role="status">
                      Saved at {savedAt}
                    </span>
                  ) : null}
                </div>
                {error ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </article>

              <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="text-base font-semibold">Live preview</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active organization: <strong>{form.name}</strong> ({form.slug})
                </p>
                <div
                  className="mt-4 rounded-md border p-5 text-card-foreground"
                  style={{
                    borderRadius: form.borderRadius,
                    background: form.secondaryColor,
                  }}
                >
                  <p
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: form.accentColor }}
                  >
                    {form.name}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">Course title</p>
                  <p className="mt-1 text-sm opacity-80">
                    Branded preview reflects the current settings.
                  </p>
                  <button
                    className="mt-4 inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold"
                    style={{
                      background: form.primaryColor,
                      color: "#ffffff",
                      borderColor: form.primaryColor,
                      borderRadius: form.borderRadius,
                    }}
                    type="button"
                  >
                    Primary action
                  </button>
                </div>
              </article>
            </section>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
