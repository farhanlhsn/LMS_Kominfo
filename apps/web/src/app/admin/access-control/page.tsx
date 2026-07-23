"use client";

import { FormEvent, useState } from "react";
import {
  GitBranch,
  LogIn,
  Save,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2,
  UserRoundCog,
} from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { Button } from "../../../components/ui/button";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../../components/ui/states";
import {
  useAccessContexts,
  useActiveRoleSwitches,
  useAssignContextRole,
  useCapabilityOverrides,
  useClearRoleSwitches,
  useContextRoleAssignments,
  useDeactivateRole,
  useOrganizationMembers,
  useOrganizationPermissions,
  useOrganizationRoles,
  useRemoveContextRoleAssignment,
  useRoleDelegations,
  useRoleImpact,
  useSetCapabilityOverride,
  useSetRoleDelegation,
  useSimulateAccess,
  useSwitchRole,
} from "../../../lib/api-hooks";
import { api } from "../../../lib/api-client";
import type {
  AccessContextOption,
  CapabilityDecisionRecord,
  CapabilityEffect,
  OrganizationRoleRecord,
} from "../../../lib/lms-types";

type View =
  | "assignments"
  | "overrides"
  | "simulator"
  | "delegation"
  | "switch";

const views: Array<{
  id: View;
  label: string;
  icon: typeof ShieldCheck;
}> = [
  { id: "assignments", label: "Assignments", icon: UserRoundCog },
  { id: "overrides", label: "Overrides", icon: SlidersHorizontal },
  { id: "simulator", label: "Simulator", icon: ScanSearch },
  { id: "delegation", label: "Delegation", icon: GitBranch },
  { id: "switch", label: "Role switch", icon: LogIn },
];

const fieldClass =
  "h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm";

function contextFromForm(
  contexts: AccessContextOption[],
  form: FormData,
) {
  const key = String(form.get("contextKey") ?? "");
  const context = contexts.find((item) => item.key === key);
  if (!context) throw new Error("Context is required");
  return {
    contextType: context.type,
    contextInstanceId: context.instanceId,
  };
}

function ContextSelect({
  contexts,
  name = "contextKey",
}: {
  contexts: AccessContextOption[];
  name?: string;
}) {
  return (
    <select className={fieldClass} name={name} required>
      {contexts.map((context) => (
        <option key={context.key} value={context.key}>
          {context.type.replaceAll("_", " ")} · {context.label}
          {context.available ? "" : " · unavailable"}
        </option>
      ))}
    </select>
  );
}

export default function AccessControlPage() {
  const [view, setView] = useState<View>("assignments");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [decisions, setDecisions] = useState<CapabilityDecisionRecord[]>([]);
  const [pendingRole, setPendingRole] =
    useState<OrganizationRoleRecord | null>(null);
  const [roleImpact, setRoleImpact] = useState<Record<string, number> | null>(
    null,
  );

  const contexts = useAccessContexts();
  const members = useOrganizationMembers();
  const roles = useOrganizationRoles();
  const permissions = useOrganizationPermissions();
  const assignments = useContextRoleAssignments();
  const overrides = useCapabilityOverrides();
  const delegations = useRoleDelegations();
  const activeSwitches = useActiveRoleSwitches();
  const assignRole = useAssignContextRole();
  const removeAssignment = useRemoveContextRoleAssignment();
  const setOverride = useSetCapabilityOverride();
  const setDelegation = useSetRoleDelegation();
  const simulate = useSimulateAccess();
  const switchRole = useSwitchRole();
  const clearSwitches = useClearRoleSwitches();
  const loadRoleImpact = useRoleImpact();
  const deactivateRole = useDeactivateRole();

  const contextOptions = contexts.data ?? [];
  const memberOptions = members.data ?? [];
  const roleOptions = roles.data ?? [];
  const permissionOptions = permissions.data ?? [];
  const errors = [
    contexts.error,
    members.error,
    roles.error,
    permissions.error,
  ].filter(Boolean);
  const loading =
    contexts.loading ||
    members.loading ||
    roles.loading ||
    permissions.loading;

  async function reloadAccessData() {
    await Promise.allSettled([
      assignments.reload(),
      overrides.reload(),
      delegations.reload(),
      activeSwitches.reload(),
      roles.reload(),
    ]);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await reloadAccessData();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = contextFromForm(contextOptions, form);
    await run(
      () =>
        assignRole({
          userId: String(form.get("userId")),
          roleId: String(form.get("roleId")),
          ...context,
          startsAt: String(form.get("startsAt") || "") || undefined,
          expiresAt: String(form.get("expiresAt") || "") || undefined,
        }),
      "Context role assigned.",
    );
  }

  async function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = contextFromForm(contextOptions, form);
    await run(
      () =>
        setOverride({
          roleId: String(form.get("roleId")),
          permissionKey: String(form.get("permissionKey")),
          effect: String(form.get("effect")) as CapabilityEffect,
          ...context,
        }),
      "Capability override saved.",
    );
  }

  async function submitSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = contextFromForm(contextOptions, form);
    setSaving(true);
    setMessage(null);
    try {
      const result = await simulate({
        userId: String(form.get("userId")),
        permissionKeys: form.getAll("permissionKeys").map(String),
        ignoreAdminBypass: form.get("ignoreAdminBypass") === "on",
        ...context,
      });
      setDecisions(result);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function submitDelegation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () =>
        setDelegation({
          actorRoleId: String(form.get("actorRoleId")),
          targetRoleId: String(form.get("targetRoleId")),
          canView: form.get("canView") === "on",
          canAssign: form.get("canAssign") === "on",
          canOverride: form.get("canOverride") === "on",
          canSwitch: form.get("canSwitch") === "on",
        }),
      "Role delegation saved.",
    );
  }

  async function submitRoleSwitch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = contextFromForm(contextOptions, form);
    await run(
      async () => {
        await switchRole({
          roleId: String(form.get("roleId")),
          ...context,
        });
        await api.hydrateSession();
      },
      "Session role switched.",
    );
  }

  async function prepareDeactivate(role: OrganizationRoleRecord) {
    setSaving(true);
    setMessage(null);
    try {
      setRoleImpact(await loadRoleImpact(role.id));
      setPendingRole(role);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!pendingRole) return;
    await run(
      () => deactivateRole(pendingRole.id, pendingRole.key),
      "Role deactivated. Existing references retained without granting access.",
    );
    setPendingRole(null);
    setRoleImpact(null);
  }

  return (
    <AuthGate>
      <AppShell currentPath="/admin/access-control">
        {(activeSwitches.data ?? []).length > 0 ? (
          <section className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-warning/40 bg-warning/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Role switch active</p>
              <p className="text-xs text-muted-foreground">
                {(activeSwitches.data ?? [])
                  .map(
                    (item) => `${item.role.name} at ${item.context.key}`,
                  )
                  .join(", ")}
              </p>
            </div>
            <Button
              disabled={saving}
              onClick={() =>
                void run(
                  async () => {
                    await clearSwitches();
                    await api.hydrateSession();
                  },
                  "Normal role restored.",
                )
              }
              variant="outline"
            >
              <Undo2 aria-hidden="true" className="h-4 w-4" />
              Restore normal role
            </Button>
          </section>
        ) : null}

        <PermissionGate allOf={[PERMISSIONS.rolesView]}>
          <PageHeader
            eyebrow="Organization admin"
            title="Access Control"
            description="Context roles, capability policy, delegation, and effective access."
          />

          {message ? (
            <p
              className="mb-4 border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <div
            aria-label="Access control views"
            className="mb-5 flex min-h-10 flex-wrap border-b border-border"
            role="tablist"
          >
            {views.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  aria-selected={view === item.id}
                  className={`inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium ${
                    view === item.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  key={item.id}
                  onClick={() => setView(item.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {loading ? <LoadingState title="Loading access model" /> : null}
          {errors[0] ? <ApiErrorState error={errors[0]} /> : null}

          {!loading && !errors.length && view === "assignments" ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-5"
                onSubmit={submitAssignment}
              >
                <select className={fieldClass} name="userId" required>
                  {memberOptions.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name ?? member.user.email}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} name="roleId" required>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <ContextSelect contexts={contextOptions} />
                <input
                  aria-label="Starts at"
                  className={fieldClass}
                  name="startsAt"
                  title="Starts at"
                  type="datetime-local"
                />
                <div className="flex gap-2">
                  <input
                    aria-label="Expires at"
                    className={`${fieldClass} min-w-0 flex-1`}
                    name="expiresAt"
                    title="Expires at"
                    type="datetime-local"
                  />
                  <Button disabled={saving} size="icon" title="Assign role" type="submit">
                    <Save aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {(assignments.data ?? []).length ? (
                <div className="overflow-x-auto border border-border">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">User</th>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 font-medium">Context</th>
                        <th className="px-3 py-2 font-medium">Validity</th>
                        <th className="w-12 px-3 py-2">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(assignments.data ?? []).map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-3 py-3">
                            {assignment.user.name ?? assignment.user.email}
                          </td>
                          <td className="px-3 py-3">{assignment.role.name}</td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {assignment.context.key}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {assignment.startsAt
                              ? new Date(assignment.startsAt).toLocaleString()
                              : "Immediate"}
                            {" → "}
                            {assignment.expiresAt
                              ? new Date(assignment.expiresAt).toLocaleString()
                              : "No expiry"}
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              aria-label="Remove assignment"
                              disabled={saving}
                              onClick={() =>
                                void run(
                                  () => removeAssignment(assignment.id),
                                  "Context role removed.",
                                )
                              }
                              size="icon"
                              title="Remove assignment"
                              variant="ghost"
                            >
                              <Trash2
                                aria-hidden="true"
                                className="h-4 w-4 text-destructive"
                              />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No contextual assignments" />
              )}
            </div>
          ) : null}

          {!loading && !errors.length && view === "overrides" ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-5"
                onSubmit={submitOverride}
              >
                <select className={fieldClass} name="roleId" required>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} name="permissionKey" required>
                  {permissionOptions.map((permission) => (
                    <option key={permission.key} value={permission.key}>
                      {permission.component ?? "core"} · {permission.key}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} name="effect" required>
                  {(["INHERIT", "ALLOW", "PREVENT", "PROHIBIT"] as const).map(
                    (effect) => (
                      <option key={effect} value={effect}>
                        {effect}
                      </option>
                    ),
                  )}
                </select>
                <ContextSelect contexts={contextOptions} />
                <Button disabled={saving} type="submit">
                  <Save aria-hidden="true" className="h-4 w-4" />
                  Save override
                </Button>
              </form>

              {(overrides.data ?? []).length ? (
                <div className="overflow-x-auto border border-border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 font-medium">Capability</th>
                        <th className="px-3 py-2 font-medium">Context</th>
                        <th className="px-3 py-2 font-medium">Effect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(overrides.data ?? []).map((override) => (
                        <tr key={override.id}>
                          <td className="px-3 py-3">{override.role.name}</td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {override.permission.key}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {override.context.key}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              tone={
                                override.effect === "ALLOW"
                                  ? "success"
                                  : override.effect === "PROHIBIT"
                                    ? "danger"
                                    : "warning"
                              }
                              value={override.effect}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No capability overrides" />
              )}
            </div>
          ) : null}

          {!loading && !errors.length && view === "simulator" ? (
            <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <form
                className="space-y-3 border border-border bg-card p-4"
                onSubmit={submitSimulation}
              >
                <select className={`${fieldClass} w-full`} name="userId" required>
                  {memberOptions.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name ?? member.user.email}
                    </option>
                  ))}
                </select>
                <div className="grid">
                  <ContextSelect contexts={contextOptions} />
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto border border-border p-3">
                  {permissionOptions.map((permission, index) => (
                    <label
                      className="flex items-start gap-2 text-xs"
                      key={permission.key}
                    >
                      <input
                        className="mt-0.5 h-4 w-4"
                        defaultChecked={index < 4}
                        name="permissionKeys"
                        type="checkbox"
                        value={permission.key}
                      />
                      <span className="min-w-0 break-all">
                        {permission.key}
                      </span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    className="h-4 w-4"
                    name="ignoreAdminBypass"
                    type="checkbox"
                  />
                  Ignore admin bypass
                </label>
                <Button className="w-full" disabled={saving} type="submit">
                  <ScanSearch aria-hidden="true" className="h-4 w-4" />
                  Evaluate
                </Button>
              </form>

              <div className="space-y-3">
                {decisions.length ? (
                  decisions.map((decision) => (
                    <article
                      className="border border-border bg-card p-4"
                      key={decision.permissionKey}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all font-mono text-sm">
                          {decision.permissionKey}
                        </p>
                        <StatusBadge
                          tone={decision.allowed ? "success" : "danger"}
                          value={decision.allowed ? "ALLOWED" : decision.reason}
                        />
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {decision.roles.map((role) => (
                          <div
                            className="border-l-2 border-border pl-3 text-xs"
                            key={role.id}
                          >
                            <p className="font-semibold">{role.name}</p>
                            <p className="mt-1 text-muted-foreground">
                              {role.effectiveEffect} ·{" "}
                              {role.allowed ? "grant" : "deny"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState title="No simulation result" />
                )}
              </div>
            </div>
          ) : null}

          {!loading && !errors.length && view === "delegation" ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto]"
                onSubmit={submitDelegation}
              >
                <select className={fieldClass} name="actorRoleId" required>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} name="targetRoleId" required>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <div className="flex min-h-10 flex-wrap items-center gap-4 border border-border px-3">
                  {["canView", "canAssign", "canOverride", "canSwitch"].map(
                    (permission) => (
                      <label
                        className="flex items-center gap-2 text-xs"
                        key={permission}
                      >
                        <input
                          className="h-4 w-4"
                          defaultChecked={permission === "canView"}
                          name={permission}
                          type="checkbox"
                        />
                        {permission.slice(3)}
                      </label>
                    ),
                  )}
                </div>
                <Button disabled={saving} size="icon" title="Save delegation" type="submit">
                  <Save aria-hidden="true" className="h-4 w-4" />
                </Button>
              </form>

              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Actor role</th>
                      <th className="px-3 py-2 font-medium">Target role</th>
                      <th className="px-3 py-2 font-medium">Delegated actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(delegations.data ?? []).map((delegation) => (
                      <tr key={delegation.id}>
                        <td className="px-3 py-3">
                          {delegation.actorRole.name}
                        </td>
                        <td className="px-3 py-3">
                          {delegation.targetRole.name}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {[
                            delegation.canView && "view",
                            delegation.canAssign && "assign",
                            delegation.canOverride && "override",
                            delegation.canSwitch && "switch",
                          ]
                            .filter(Boolean)
                            .join(", ") || "none"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <section className="border-t border-border pt-4">
                <h2 className="text-sm font-semibold">Role lifecycle</h2>
                <div className="mt-3 divide-y divide-border border border-border">
                  {roleOptions.map((role) => (
                    <div
                      className="flex min-h-12 items-center justify-between gap-3 px-3 py-2"
                      key={role.id}
                    >
                      <div>
                        <p className="text-sm font-medium">{role.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {role.key}
                        </p>
                      </div>
                      {role.isSystem ? (
                        <StatusBadge value="SYSTEM" />
                      ) : (
                        <Button
                          disabled={saving}
                          onClick={() => void prepareDeactivate(role)}
                          size="icon"
                          title="Deactivate role"
                          variant="ghost"
                        >
                          <Trash2
                            aria-hidden="true"
                            className="h-4 w-4 text-destructive"
                          />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && !errors.length && view === "switch" ? (
            <form
              className="grid gap-3 border border-border bg-card p-4 md:grid-cols-[1fr_2fr_auto]"
              onSubmit={submitRoleSwitch}
            >
              <select className={fieldClass} name="roleId" required>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <ContextSelect contexts={contextOptions} />
              <Button disabled={saving} type="submit">
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Switch role
              </Button>
            </form>
          ) : null}
        </PermissionGate>
      </AppShell>

      {pendingRole ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md border border-border bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Deactivate role</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingRole.key}:{" "}
              {Object.entries(roleImpact ?? {})
                .map(([key, value]) => `${key} ${value}`)
                .join(", ")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                disabled={saving}
                onClick={() => {
                  setPendingRole(null);
                  setRoleImpact(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={() => void confirmDeactivate()}
                variant="destructive"
              >
                Deactivate role
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </AuthGate>
  );
}
