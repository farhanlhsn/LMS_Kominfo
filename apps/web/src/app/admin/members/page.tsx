"use client";

import { FormEvent, useMemo, useState } from "react";
import { KeyRound, Mail, Save, ShieldCheck, UserPlus } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { Button } from "../../../components/ui/button";
import { DataTable, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import {
  useCreateOrganizationMember,
  useCreateOrganizationRole,
  useInviteOrganizationMember,
  useOrganizationMembers,
  useOrganizationPermissions,
  useOrganizationRoles,
  useUpdateOrganizationMemberRoles,
  useUpdateOrganizationMemberStatus,
  useUpdateOrganizationRole,
} from "../../../lib/api-hooks";
import type {
  OrganizationMemberRecord,
  OrganizationRoleRecord,
  PermissionRecord,
} from "../../../lib/lms-types";

const memberStatuses: OrganizationMemberRecord["status"][] = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "DEACTIVATED",
];

function formRoleKeys(form: FormData) {
  return form
    .getAll("roleKeys")
    .map(String)
    .filter(Boolean);
}

function formPermissionKeys(form: FormData) {
  return form
    .getAll("permissionKeys")
    .map(String)
    .filter(Boolean);
}

export default function AdminMembersPage() {
  const members = useOrganizationMembers();
  const roles = useOrganizationRoles();
  const permissions = useOrganizationPermissions();
  const createMember = useCreateOrganizationMember();
  const inviteMember = useInviteOrganizationMember();
  const updateMemberRoles = useUpdateOrganizationMemberRoles();
  const updateMemberStatus = useUpdateOrganizationMemberStatus();
  const createRole = useCreateOrganizationRole();
  const updateRole = useUpdateOrganizationRole();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reloadAll() {
    await Promise.all([members.reload(), roles.reload(), permissions.reload()]);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await reloadAll();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      () =>
        createMember({
          email: String(form.get("email") ?? ""),
          name: String(form.get("name") ?? "") || undefined,
          password: String(form.get("password") ?? "") || undefined,
          roleKeys: formRoleKeys(form),
        }),
      "Member saved.",
    );
    formElement.reset();
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      () =>
        inviteMember({
          email: String(form.get("email") ?? ""),
          message: String(form.get("message") ?? "") || undefined,
          roleKeys: formRoleKeys(form),
        }),
      "Invitation created — member status set to INVITED.",
    );
    formElement.reset();
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await run(
      () =>
        createRole({
          key: String(form.get("key") ?? ""),
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? "") || undefined,
          permissionKeys: formPermissionKeys(form),
        }),
      "Role created.",
    );
    formElement.reset();
  }

  return (
    <AuthGate>
      <AppShell currentPath="/admin/members">
        <PermissionGate
          allOf={[PERMISSIONS.membershipsManage, PERMISSIONS.rolesManage]}
        >
          <PageHeader
            eyebrow="Organization admin"
            title="Members & Roles"
            description="Create accounts, assign roles, and review permission coverage for the active organization."
          />

          {message ? (
            <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-5">
              <section className="rounded-md border border-border bg-card p-4 shadow-subtle">
                <div className="flex items-center gap-2">
                  <UserPlus aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Add Member</h2>
                </div>
                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitMember}>
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    name="email"
                    placeholder="email@example.com"
                    required
                    type="email"
                  />
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    name="name"
                    placeholder="Full name"
                  />
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    minLength={8}
                    name="password"
                    placeholder="Temporary password"
                    type="password"
                  />
                  <div className="grid gap-2 rounded-md border border-border bg-background p-3 md:row-span-2">
                    {(roles.data ?? []).map((role) => (
                      <label className="flex items-center gap-2 text-sm" key={role.id}>
                        <input
                          className="h-4 w-4"
                          defaultChecked={role.key === "learner"}
                          name="roleKeys"
                          type="checkbox"
                          value={role.key}
                        />
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">({role.key})</span>
                      </label>
                    ))}
                  </div>
                  <Button className="md:w-fit" disabled={saving} type="submit">
                    <UserPlus aria-hidden="true" className="h-4 w-4" />
                    Add member
                  </Button>
                </form>
              </section>

              <section className="rounded-md border border-border bg-card p-4 shadow-subtle">
                <div className="flex items-center gap-2">
                  <Mail aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Invite Member</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Send an invitation — the member record is created with status INVITED, no password required.
                </p>
                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitInvite}>
                  <input
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                    name="email"
                    placeholder="email@example.com"
                    required
                    type="email"
                  />
                  <textarea
                    className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
                    name="message"
                    placeholder="Optional message"
                  />
                  <div className="grid gap-2 rounded-md border border-border bg-background p-3 md:col-span-2">
                    {(roles.data ?? []).map((role) => (
                      <label className="flex items-center gap-2 text-sm" key={role.id}>
                        <input
                          className="h-4 w-4"
                          defaultChecked={role.key === "learner"}
                          name="roleKeys"
                          type="checkbox"
                          value={role.key}
                        />
                        <span>{role.name}</span>
                        <span className="text-xs text-muted-foreground">({role.key})</span>
                      </label>
                    ))}
                  </div>
                  <Button className="md:w-fit" disabled={saving} type="submit">
                    <Mail aria-hidden="true" className="h-4 w-4" />
                    Send invite
                  </Button>
                </form>
              </section>

              <MembersTable
                members={members.data ?? []}
                roles={roles.data ?? []}
                loading={members.loading || roles.loading}
                error={members.error ?? roles.error}
                saving={saving}
                onSaveRoles={(memberId, roleKeys) =>
                  run(
                    () => updateMemberRoles(memberId, roleKeys),
                    "Member roles updated.",
                  )
                }
                onSaveStatus={(memberId, status) =>
                  run(
                    () => updateMemberStatus(memberId, status),
                    "Member status updated.",
                  )
                }
              />
            </div>

            <div className="space-y-5">
              <RoleCreator
                permissions={permissions.data ?? []}
                loading={permissions.loading}
                error={permissions.error}
                saving={saving}
                onSubmit={submitRole}
              />
              <RoleList
                roles={roles.data ?? []}
                permissions={permissions.data ?? []}
                loading={roles.loading || permissions.loading}
                error={roles.error ?? permissions.error}
                saving={saving}
                onUpdate={(roleId, input) =>
                  run(() => updateRole(roleId, input), "Role updated.")
                }
              />
            </div>
          </section>
        </PermissionGate>
      </AppShell>
    </AuthGate>
  );
}

const STATUS_FILTERS = ["All", "ACTIVE", "INVITED", "SUSPENDED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function MembersTable({
  members,
  roles,
  loading,
  error,
  saving,
  onSaveRoles,
  onSaveStatus,
}: {
  members: OrganizationMemberRecord[];
  roles: OrganizationRoleRecord[];
  loading: boolean;
  error: Error | null;
  saving: boolean;
  onSaveRoles: (memberId: string, roleKeys: string[]) => Promise<void>;
  onSaveStatus: (
    memberId: string,
    status: OrganizationMemberRecord["status"],
  ) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [memberStatusValues, setMemberStatusValues] = useState<Record<string, string>>({});

  const roleByKey = useMemo(
    () => new Map(roles.map((role) => [role.key, role])),
    [roles],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      const matchesSearch =
        !q ||
        member.user.email.toLowerCase().includes(q) ||
        (member.user.name ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "All" || member.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  if (loading) return <LoadingState title="Loading members" />;
  if (error) return <ApiErrorState error={error} fallbackTitle="Could not load members" />;

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Organization Members</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {filtered.length} / {members.length}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email…"
          type="search"
          value={searchQuery}
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
              key={s}
              onClick={() => setStatusFilter(s)}
              type="button"
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No members match the current filter.</p>
        ) : (
          <DataTable
            size="compact"
            emptyMessage="No members match the current filters."
            columns={["Member", "Status", "Roles", "Actions"]}
            rows={filtered.map((member) => [
              <div key="member" className="min-w-40">
                <p className="text-sm font-medium leading-tight">
                  {member.user.name ?? member.user.email}
                </p>
                {member.user.name ? (
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                ) : null}
              </div>,
              <StatusBadge key="status" value={member.status} />,
              <form
                className="grid min-w-52 gap-1.5"
                key="roles"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSaveRoles(member.id, formRoleKeys(new FormData(event.currentTarget)));
                }}
              >
                <div className="grid gap-0.5">
                  {roles.map((role) => (
                    <label className="flex items-center gap-2 text-xs" key={role.id}>
                      <input
                        className="h-3.5 w-3.5"
                        defaultChecked={member.roles.includes(role.key)}
                        name="roleKeys"
                        type="checkbox"
                        value={role.key}
                      />
                      <span>{roleByKey.get(role.key)?.name ?? role.key}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="inline-flex h-7 w-fit items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Save aria-hidden="true" className="h-3 w-3" />
                  Save roles
                </button>
              </form>,
              <form
                className="flex flex-wrap items-center gap-1.5"
                key="actions"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void onSaveStatus(
                    member.id,
                    String(form.get("status")) as OrganizationMemberRecord["status"],
                  );
                }}
              >
                <input type="hidden" name="status" value={memberStatusValues[member.id] ?? member.status} />
                <div className="relative">
                  <Select value={memberStatusValues[member.id] ?? member.status} onValueChange={(val) => setMemberStatusValues((prev) => ({ ...prev, [member.id]: val }))}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {memberStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  <Save aria-hidden="true" className="h-3 w-3" />
                  Save
                </button>
              </form>,
            ])}
          />
        )}
      </div>
    </section>
  );
}

function RoleCreator({
  permissions,
  loading,
  error,
  saving,
  onSubmit,
}: {
  permissions: PermissionRecord[];
  loading: boolean;
  error: Error | null;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  if (loading) return <LoadingState title="Loading permissions" />;
  if (error) return <ApiErrorState error={error} fallbackTitle="Could not load permissions" />;

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center gap-2">
        <KeyRound aria-hidden="true" className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Create Custom Role</h2>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          name="key"
          placeholder="custom_role"
          required
        />
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          name="name"
          placeholder="Role name"
          required
        />
        <textarea
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
          name="description"
          placeholder="Description"
        />
        <PermissionChecklist permissions={permissions} />
        <Button disabled={saving} type="submit">
          Create role
        </Button>
      </form>
    </section>
  );
}

function RoleList({
  roles,
  permissions,
  loading,
  error,
  saving,
  onUpdate,
}: {
  roles: OrganizationRoleRecord[];
  permissions: PermissionRecord[];
  loading: boolean;
  error: Error | null;
  saving: boolean;
  onUpdate: (
    roleId: string,
    input: { name?: string; description?: string; permissionKeys?: string[] },
  ) => Promise<void>;
}) {
  if (loading) return <LoadingState title="Loading roles" />;
  if (error) return <ApiErrorState error={error} fallbackTitle="Could not load roles" />;

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-subtle">
      <h2 className="font-semibold">Roles & Permissions</h2>
      <div className="mt-4 space-y-4">
        {roles.map((role) => (
          <form
            className="rounded-md border border-border bg-background p-3"
            key={role.id}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void onUpdate(role.id, {
                name: String(form.get("name") ?? "") || undefined,
                description: String(form.get("description") ?? "") || undefined,
                permissionKeys: role.isSystem ? undefined : formPermissionKeys(form),
              });
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {role.key}
                </p>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm font-semibold"
                  defaultValue={role.name}
                  name="name"
                  readOnly={role.isSystem}
                />
              </div>
              <StatusBadge value={role.isSystem ? "System" : "Custom"} />
            </div>
            <textarea
              className="mt-3 min-h-16 w-full rounded-md border border-input bg-card px-2 py-2 text-sm"
              defaultValue={role.description ?? ""}
              name="description"
              placeholder="Description"
              readOnly={role.isSystem}
            />
            {role.isSystem ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.map((permission) => (
                  <span
                    className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
                    key={permission.key}
                  >
                    {permission.key}
                  </span>
                ))}
              </div>
            ) : (
              <PermissionChecklist
                permissions={permissions}
                selected={role.permissions.map((permission) => permission.key)}
              />
            )}
            {!role.isSystem ? (
              <button
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save aria-hidden="true" className="h-3.5 w-3.5" />
                Save role
              </button>
            ) : null}
          </form>
        ))}
      </div>
    </section>
  );
}

function PermissionChecklist({
  permissions,
  selected = [],
}: {
  permissions: PermissionRecord[];
  selected?: string[];
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="grid max-h-64 gap-1 overflow-y-auto rounded-md border border-border bg-background p-3 [scrollbar-gutter:stable]">
      {permissions.map((permission) => (
        <label className="flex items-start gap-2 text-xs" key={permission.key}>
          <input
            className="mt-0.5 h-4 w-4 shrink-0"
            defaultChecked={selectedSet.has(permission.key)}
            name="permissionKeys"
            type="checkbox"
            value={permission.key}
          />
          <span>
            <span className="block font-semibold">{permission.key}</span>
            {permission.description ? (
              <span className="block text-muted-foreground">
                {permission.description}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
