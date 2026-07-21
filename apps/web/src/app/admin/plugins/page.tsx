"use client";

import Link from "next/link";
import { Plug, RefreshCw } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../../components/ui/core";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useAdminPlugins } from "../../../lib/api-hooks";
import type { Plugin } from "../../../lib/lms-types";

export default function AdminPluginsPage() {
  const pluginsQuery = useAdminPlugins();

  async function toggle(plugin: Plugin) {
    if (plugin.enabled) {
      await api.disablePlugin(plugin.key);
    } else {
      await api.enablePlugin(plugin.key);
    }
    await pluginsQuery.reload();
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.pluginsConfigure]}>
        <AppShell currentPath="/admin/plugins">
          <PageHeader
            eyebrow="Admin"
            title="Plugins"
            description="Manage organization-scoped internal plugin manifests and activity extension points."
            actions={
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                onClick={() => void pluginsQuery.reload()}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Refresh
              </button>
            }
          />

          {pluginsQuery.loading ? (
            <LoadingState title="Loading plugins" />
          ) : pluginsQuery.error ? (
            <ApiErrorState
              error={pluginsQuery.error}
              fallbackTitle="Could not load plugins"
            />
          ) : !pluginsQuery.data?.length ? (
            <EmptyState
              title="No plugins registered"
              description="Internal plugin manifests are registered by the API."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pluginsQuery.data.map((plugin) => (
                <PluginCard key={plugin.key} plugin={plugin} onToggle={toggle} />
              ))}
            </div>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function PluginCard({
  plugin,
  onToggle,
}: {
  plugin: Plugin;
  onToggle: (plugin: Plugin) => Promise<void>;
}) {
  const placeholder = Boolean(
    (plugin.manifest as { placeholder?: boolean } | undefined)?.placeholder,
  );
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <Plug aria-hidden="true" className="h-5 w-5 text-primary" />
        <StatusBadge
          tone={plugin.enabled ? "success" : "neutral"}
          value={plugin.enabled ? "Enabled" : "Disabled"}
        />
      </div>
      <h2 className="mt-4 text-base font-semibold">{plugin.name}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {plugin.description ?? "Internal plugin manifest."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge value={plugin.category.toLowerCase()} />
        <StatusBadge value={`v${plugin.version}`} />
        {placeholder ? <StatusBadge tone="warning" value="Coming soon" /> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          className="inline-flex min-h-10 items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          href={`/admin/plugins/${encodeURIComponent(plugin.key)}`}
        >
          Details
        </Link>
        <button
          className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={placeholder}
          onClick={() => void onToggle(plugin)}
          type="button"
        >
          {plugin.enabled ? "Disable" : "Enable"}
        </button>
      </div>
    </article>
  );
}
