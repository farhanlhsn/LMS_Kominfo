"use client";

import { useParams } from "next/navigation";
import { Activity, History, Save } from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import {
  DataTable,
  FormSection,
  PageHeader,
  StatusBadge,
} from "../../../../components/ui/core";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../../../components/ui/states";
import { api } from "../../../../lib/api-client";
import {
  useAdminPlugin,
  usePluginLogs,
} from "../../../../lib/api-hooks";

export default function PluginDetailPage() {
  const params = useParams<{ pluginKey: string }>();
  const pluginKey = decodeURIComponent(params.pluginKey);
  const pluginQuery = useAdminPlugin(pluginKey);
  const logsQuery = usePluginLogs(pluginKey);
  const plugin = pluginQuery.data;
  const placeholder = Boolean(
    (plugin?.manifest as { placeholder?: boolean } | undefined)?.placeholder,
  );

  async function toggle() {
    if (!plugin) return;
    if (plugin.enabled) {
      await api.disablePlugin(plugin.key);
    } else {
      await api.enablePlugin(plugin.key);
    }
    await pluginQuery.reload();
    await logsQuery.reload();
  }

  async function saveEmptyConfig() {
    if (!plugin) return;
    await api.updatePluginConfig(plugin.key, {});
    await pluginQuery.reload();
    await logsQuery.reload();
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.pluginsConfigure]}>
        <AppShell currentPath="/admin/plugins">
          {pluginQuery.loading ? (
            <LoadingState title="Loading plugin" />
          ) : pluginQuery.error || !plugin ? (
            <ApiErrorState
              error={pluginQuery.error}
              fallbackTitle="Could not load plugin"
            />
          ) : (
            <>
              <PageHeader
                breadcrumbs={[
                  { label: "Plugins", href: "/admin/plugins" },
                  { label: plugin.name },
                ]}
                eyebrow={plugin.category.toLowerCase()}
                title={plugin.name}
                description={plugin.description ?? "Internal plugin manifest."}
                actions={
                  <button
                    className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={placeholder}
                    onClick={() => void toggle()}
                    type="button"
                  >
                    {plugin.enabled ? "Disable" : "Enable"}
                  </button>
                }
              />

              <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                <FormSection
                  title="Manifest"
                  description="Registered in code. External package upload is not available."
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      tone={plugin.enabled ? "success" : "neutral"}
                      value={plugin.enabled ? "Enabled" : "Disabled"}
                    />
                    <StatusBadge value={plugin.key} />
                    <StatusBadge value={`v${plugin.version}`} />
                    {placeholder ? (
                      <StatusBadge tone="warning" value="Coming soon" />
                    ) : null}
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted p-4 text-xs">
                    {JSON.stringify(plugin.manifest ?? {}, null, 2)}
                  </pre>
                </FormSection>

                <FormSection
                  title="Organization config"
                  description="Only non-secret organization configuration is supported."
                >
                  <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted p-4 text-xs">
                    {JSON.stringify(plugin.organizationPlugin?.config ?? {}, null, 2)}
                  </pre>
                  <button
                    className="inline-flex w-fit min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                    disabled={placeholder}
                    onClick={() => void saveEmptyConfig()}
                    type="button"
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    Save empty config
                  </button>
                </FormSection>
              </div>

              <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-subtle">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Execution
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">Plugin logs</h2>
                  </div>
                  <History aria-hidden="true" className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4">
                  {logsQuery.loading ? (
                    <LoadingState title="Loading logs" />
                  ) : logsQuery.error ? (
                    <ApiErrorState
                      error={logsQuery.error}
                      fallbackTitle="Could not load logs"
                    />
                  ) : logsQuery.data?.length ? (
                    <DataTable
                      columns={["Action", "Status", "Created", "Duration"]}
                      rows={logsQuery.data.map((log) => [
                        <span key="action" className="inline-flex items-center gap-2">
                          <Activity
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          {log.action}
                        </span>,
                        <StatusBadge
                          key="status"
                          tone={log.status === "SUCCESS" ? "success" : "danger"}
                          value={log.status.toLowerCase()}
                        />,
                        <span key="created">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>,
                        <span key="duration">
                          {log.durationMs ? `${log.durationMs} ms` : "n/a"}
                        </span>,
                      ])}
                    />
                  ) : (
                    <EmptyState
                      title="No plugin logs"
                      description="Enable, disable, and config updates will create organization-scoped log entries."
                    />
                  )}
                </div>
              </section>
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
