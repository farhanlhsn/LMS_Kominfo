"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection } from "../../../components/ui/core";
import { PanelGrid } from "../../../components/plugin-panels/panel-grid";

const LAYOUT_KEYS = ["lesson", "course", "exam"];

export default function LearnPluginsPage() {
  return (
    <AuthGate>
      <AppShell currentPath="/learn/plugins">
        <PageHeader
          eyebrow="Learning"
          title="Plugin workspace panels"
          description="Choose which plugin panels are visible during your lessons."
        />
        <PluginsBody />
      </AppShell>
    </AuthGate>
  );
}

function PluginsBody() {
  const [layoutKey, setLayoutKey] = useState<string>(LAYOUT_KEYS[0]!);
  return (
    <div className="space-y-6">
      <FormSection title="Layout context" description="Pick the layout to configure.">
        <label className="text-sm font-medium">
          Layout
          <select
            className="ml-2 rounded border border-border px-2 py-1"
            value={layoutKey}
            onChange={(e) => setLayoutKey(e.target.value)}
          >
            {LAYOUT_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </FormSection>
      <PanelGrid layoutKey={layoutKey} />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LayoutGrid className="h-3 w-3" /> Layouts are per-user and can be switched at any time.
      </p>
    </div>
  );
}
