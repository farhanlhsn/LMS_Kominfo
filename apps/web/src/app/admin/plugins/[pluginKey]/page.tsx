"use client";

import { useParams } from "next/navigation";
import { Activity, History, KeyRound, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { Plugin } from "../../../../lib/lms-types";

export default function PluginDetailPage() {
  const params = useParams<{ pluginKey: string }>();
  const pluginKey = decodeURIComponent(params.pluginKey);
  const pluginQuery = useAdminPlugin(pluginKey);
  const logsQuery = usePluginLogs(pluginKey);
  const plugin = pluginQuery.data;
  const [configText, setConfigText] = useState("{}");
  const [configMessage, setConfigMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!plugin) return;
    setConfigText(
      JSON.stringify(plugin.organizationPlugin?.config ?? {}, null, 2),
    );
  }, [plugin]);

  async function saveConfig() {
    if (!plugin) return;
    setConfigMessage(null);
    try {
      const parsed = JSON.parse(configText) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("Config must be a JSON object");
      }
      await api.updatePluginConfig(
        plugin.key,
        parsed as Record<string, unknown>,
      );
      setConfigMessage("Configuration saved.");
      await Promise.all([pluginQuery.reload(), logsQuery.reload()]);
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : String(error));
    }
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

                {plugin.key === "plugin.ai_provider" ? (
                  <AiProviderConfig
                    plugin={plugin}
                    onSaved={async () => {
                      await Promise.all([
                        pluginQuery.reload(),
                        logsQuery.reload(),
                      ]);
                    }}
                  />
                ) : (
                <FormSection
                  title="Organization config"
                  description="Non-secret settings for active organization."
                >
                  <label className="text-sm font-medium">
                    JSON configuration
                    <textarea
                      className="mt-1 min-h-48 w-full rounded-lg border border-input bg-background p-3 font-mono text-xs"
                      disabled={placeholder}
                      onChange={(event) => setConfigText(event.target.value)}
                      spellCheck={false}
                      value={configText}
                    />
                  </label>
                  {plugin.configSchema ? (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-semibold">
                        Config schema
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3">
                        {JSON.stringify(plugin.configSchema, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                  {configMessage ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      {configMessage}
                    </p>
                  ) : null}
                  <button
                    className="inline-flex w-fit min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                    disabled={placeholder}
                    onClick={() => void saveConfig()}
                    type="button"
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    Save config
                  </button>
                </FormSection>
                )}
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

function AiProviderConfig({
  plugin,
  onSaved,
}: {
  plugin: Plugin;
  onSaved: () => Promise<void>;
}) {
  const [chatProvider, setChatProvider] = useState("mock");
  const [embeddingProvider, setEmbeddingProvider] = useState("mock");
  const [baseUrl, setBaseUrl] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [providerOrganizationId, setProviderOrganizationId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configuredKey = plugin.configuredSecrets?.find(
    (secret) => secret.key === "apiKey",
  );

  useEffect(() => {
    const current = plugin.organizationPlugin?.config ?? {};
    setChatProvider(String(current.chatProvider ?? "mock"));
    setEmbeddingProvider(String(current.embeddingProvider ?? "mock"));
    setBaseUrl(String(current.baseUrl ?? ""));
    setChatModel(String(current.chatModel ?? ""));
    setEmbeddingModel(String(current.embeddingModel ?? ""));
    setProviderOrganizationId(
      String(current.providerOrganizationId ?? ""),
    );
  }, [plugin.organizationPlugin?.config]);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await api.updatePluginConfig(plugin.key, {
        chatProvider,
        embeddingProvider,
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(chatModel.trim() ? { chatModel: chatModel.trim() } : {}),
        ...(embeddingModel.trim()
          ? { embeddingModel: embeddingModel.trim() }
          : {}),
        ...(providerOrganizationId.trim()
          ? { providerOrganizationId: providerOrganizationId.trim() }
          : {}),
      });
      if (apiKey.trim()) {
        await api.updatePluginSecret(plugin.key, "apiKey", apiKey.trim());
        setApiKey("");
      }
      await onSaved();
      setMessage("Organization AI provider saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeKey() {
    setBusy(true);
    setMessage(null);
    try {
      await api.deletePluginSecret(plugin.key, "apiKey");
      await onSaved();
      setMessage("API key removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.testAiProvider();
      setMessage(
        result.ok
          ? `Connected: ${result.chatProvider}/${result.chatModel ?? "default"}, ${result.embeddingDimensions} embedding dimensions.`
          : "Provider test did not return usable output.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const providerOptions = [
    ["mock", "Mock (local testing)"],
    ["openai", "OpenAI"],
    ["openai_compatible", "OpenAI-compatible"],
    ["gemini_openai_compatible", "Gemini OpenAI-compatible"],
  ];

  return (
    <FormSection
      title="Organization AI provider"
      description="Models and encrypted credential apply only to active organization."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Chat provider
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
            onChange={(event) => setChatProvider(event.target.value)}
            value={chatProvider}
          >
            {providerOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Embedding provider
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
            onChange={(event) => setEmbeddingProvider(event.target.value)}
            value={embeddingProvider}
          >
            {[
              ...providerOptions,
              ["local", "Local embeddings"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ConfigInput
          label="Base URL"
          onChange={setBaseUrl}
          placeholder="https://api.openai.com/v1"
          value={baseUrl}
        />
        <ConfigInput
          label="Provider organization ID"
          onChange={setProviderOrganizationId}
          value={providerOrganizationId}
        />
        <ConfigInput
          label="Chat model"
          onChange={setChatModel}
          placeholder="gpt-4.1-mini"
          value={chatModel}
        />
        <ConfigInput
          label="Embedding model"
          onChange={setEmbeddingModel}
          placeholder="text-embedding-3-small"
          value={embeddingModel}
        />
      </div>
      <label className="text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <KeyRound aria-hidden="true" className="h-4 w-4" />
          API key
        </span>
        <input
          autoComplete="new-password"
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={
            configuredKey
              ? `Configured ending ${configuredKey.lastFour ?? "****"}`
              : "Not configured"
          }
          type="password"
          value={apiKey}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => void save()}
          type="button"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save provider
        </button>
        {configuredKey ? (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
            disabled={busy}
            onClick={() => void removeKey()}
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Remove key
          </button>
        ) : null}
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={busy || !plugin.enabled}
          onClick={() => void testConnection()}
          type="button"
        >
          <Activity aria-hidden="true" className="h-4 w-4" />
          Test connection
        </button>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </FormSection>
  );
}

function ConfigInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
