"use client";

import { useState } from "react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../components/ui/states";
import {
  useAdminOrganizations,
  useAdminCreateOrganization,
} from "../../../lib/api-hooks";

export default function AdminOrganizationsPage() {
  const orgs = useAdminOrganizations();
  const createOrg = useAdminCreateOrganization();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await createOrg({ name: name.trim(), slug: slug.trim().toLowerCase() });
      setName(""); setSlug(""); setShowForm(false);
      await orgs.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally { setSubmitting(false); }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.platformAdmin]}>
        <AppShell currentPath="/admin/organizations">
          <div>
            <PageHeader
              eyebrow="Platform admin"
              title="Organizations"
              description="Manage all organizations on the platform."
              actions={
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setShowForm((v) => !v)}
                  type="button"
                >
                  New organization
                </button>
              }
            />

            {showForm ? (
              <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-subtle">
                <h2 className="text-lg font-semibold">Create organization</h2>
                <div className="mt-4 grid gap-3 max-w-md">
                  <label className="block text-sm font-medium">
                    Name
                    <input
                      className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Slug
                    <input
                      className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="my-org"
                    />
                  </label>
                  {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      disabled={submitting}
                      onClick={handleCreate}
                      type="button"
                    >
                      {submitting ? "Creating…" : "Create"}
                    </button>
                    <button
                      className="rounded-md border border-border px-4 py-2 text-sm font-medium"
                      onClick={() => setShowForm(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {orgs.loading ? (
              <LoadingState title="Loading organizations" />
            ) : orgs.error ? (
              <ApiErrorState error={orgs.error} fallbackTitle="Failed to load organizations" />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Members</th>
                      <th className="px-4 py-3 font-medium">Courses</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {((orgs.data as Record<string, unknown>[]) ?? []).map((org: Record<string, unknown>) => (
                      <tr key={org.id as string} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{org.name as string}</td>
                        <td className="px-4 py-3 text-muted-foreground">{org.slug as string}</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={org.status as string}
                            tone={org.status === "ACTIVE" ? "success" : "warning"}
                          />
                        </td>
                        <td className="px-4 py-3">{(org._count as Record<string, number>)?.members ?? 0}</td>
                        <td className="px-4 py-3">{(org._count as Record<string, number>)?.courses ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(org.createdAt as string).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
