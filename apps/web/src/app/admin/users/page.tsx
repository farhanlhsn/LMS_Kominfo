"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import { LoadingState, ApiErrorState } from "../../../components/ui/states";
import {
  useAdminUsers,
  useUpdateAdminUser,
  useUpdateAdminUserStatus,
} from "../../../lib/api-hooks";
import type { AdminUserRecord } from "../../../lib/lms-types";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const query: Record<string, string> = { page: String(page) };
  if (search) query.search = search;
  if (statusFilter) query.status = statusFilter;

  const users = useAdminUsers(query);
  const updateUser = useUpdateAdminUser();
  const updateStatus = useUpdateAdminUserStatus();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleSaveName(id: string) {
    try {
      await updateUser(id, { name: editName });
      setEditId(null);
      setStatusMsg("User updated.");
      await users.reload();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleStatus(id: string, status: string) {
    try {
      await updateStatus(id, status);
      setStatusMsg(`User status changed to ${status}.`);
      await users.reload();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const result = users.data;
  const pagination = result?.pagination;

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.usersRead]}>
        <AppShell currentPath="/admin/users">
          <div>
            <PageHeader
              eyebrow="Admin"
              title="Users"
              description="Manage all users within the active organization."
            />

            {statusMsg ? (
              <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {statusMsg}
              </p>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                className="h-10 w-64 rounded-md border border-input bg-card px-3 text-sm"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <div className="relative w-full">
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <StatusBadge
                value={`${pagination?.total ?? 0} users`}
                tone="info"
              />
            </div>

            {users.loading ? (
              <LoadingState title="Loading users" />
            ) : users.error ? (
              <ApiErrorState error={users.error} fallbackTitle="Failed to load users" />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Roles</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result?.data?.map((user: AdminUserRecord) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {editId === user.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                className="h-8 rounded border border-input bg-card px-2 text-sm"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                              <button
                                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                                onClick={() => handleSaveName(user.id)}
                                type="button"
                              >
                                Save
                              </button>
                              <button
                                className="rounded border border-border px-2 py-1 text-xs"
                                onClick={() => setEditId(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span>{user.name ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={user.status} tone={user.status === "ACTIVE" ? "success" : "warning"} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <span key={r.key} className="rounded bg-muted px-2 py-0.5 text-xs">{r.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                              onClick={() => { setEditId(user.id); setEditName(user.name ?? ""); }}
                              type="button"
                            >
                              Edit
                            </button>
                            {user.status === "ACTIVE" ? (
                              <button
                                className="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => { if (confirm("Suspend this user?")) handleStatus(user.id, "SUSPENDED"); }}
                                type="button"
                              >
                                Suspend
                              </button>
                            ) : user.status === "SUSPENDED" ? (
                              <button
                                className="rounded border border-success px-2 py-1 text-xs text-success hover:bg-success/10"
                                onClick={() => handleStatus(user.id, "ACTIVE")}
                                type="button"
                              >
                                Reactivate
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    className="rounded border border-border px-3 py-1 disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded border border-border px-3 py-1 disabled:opacity-50"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
