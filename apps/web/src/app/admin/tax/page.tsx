"use client";

import { useCallback, useEffect, useState } from "react";
import { ReceiptText } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FormSection, StatusBadge } from "../../../components/ui/core";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import {
  useCreateTaxRule,
  useTaxRegions,
  useTaxRules,
  useUpdateTaxRule,
} from "../../../lib/api-hooks";
import { TaxRegionList } from "../../../components/tax/tax-region-list";
import { PERMISSIONS } from "@lms/shared";
import type { TaxRuleType } from "../../../lib/lms-types";

const RULE_TYPES: TaxRuleType[] = ["VAT", "GST", "SALES_TAX"];

export default function AdminTaxPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/tax">
          <PageHeader
            eyebrow="Admin"
            title="Tax configuration"
            description="Configure tax rules per region and test tax calculations."
          />
          <TaxBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function TaxBody() {
  const rulesQuery = useTaxRules();
  const regionsQuery = useTaxRegions();
  const createRule = useCreateTaxRule();
  const updateRule = useUpdateTaxRule();
  const [regionCode, setRegionCode] = useState("");
  const [rate, setRate] = useState(10);
  const [type, setType] = useState<TaxRuleType>("VAT");
  const [inclusive, setInclusive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!regionCode && regionsQuery.data?.length) {
      setRegionCode(regionsQuery.data[0]?.code ?? "");
    }
  }, [regionCode, regionsQuery.data]);

  const handleCreate = useCallback(async () => {
    setError(null);
    setStatus(null);
    if (!regionCode) {
      setError("Select a region");
      return;
    }
    try {
      await createRule({ regionCode, rate, type, inclusive, active: true });
      setStatus(`Rule for ${regionCode} created`);
      await rulesQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    }
  }, [createRule, regionCode, rate, type, inclusive, rulesQuery]);

  const handleToggle = useCallback(
    async (id: string, active: boolean) => {
      setError(null);
      try {
        await updateRule(id, { active });
        await rulesQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update rule");
      }
    },
    [updateRule, rulesQuery],
  );

  return (
    <div className="space-y-6">
      {status ? (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <TaxRegionList />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Tax rules</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Rules override the regional defaults and can be enabled or disabled.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {rulesQuery.isLoading ? (
            <LoadingState title="Loading tax rules" />
          ) : rulesQuery.error ? (
            <ApiErrorState error={rulesQuery.error} />
          ) : !rulesQuery.data?.length ? (
            <EmptyState
              title="No tax rules"
              description="Add a tax rule to override the regional default."
              icon={ReceiptText}
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {rulesQuery.data.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between rounded border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {rule.regionCode} • {rule.type} {rule.rate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inclusive: {rule.inclusive ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={rule.active ? "success" : "neutral"}
                      value={rule.active ? "Active" : "Inactive"}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleToggle(rule.id, !rule.active)}
                    >
                      {rule.active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <FormSection title="New rule" description="Create a new tax rule for a region.">
            {regionsQuery.isLoading ? (
              <LoadingState title="Loading regions" />
            ) : (
              <div className="grid gap-2 md:grid-cols-4">
                <label className="text-sm font-medium">
                  Region
                  <div className="relative w-full">
                    <Select value={regionCode} onValueChange={(val) => setRegionCode(val)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Select region</SelectItem>
                        {(regionsQuery.data ?? []).map((r) => (
                          <SelectItem key={r.code} value={r.code}>
                            {r.name} ({r.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="text-sm font-medium">
                  Type
                  <div className="relative w-full">
                    <Select value={type} onValueChange={(val) => setType(val as TaxRuleType)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="text-sm font-medium">
                  Rate %
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className="mt-1 w-full rounded border border-border px-2 py-1"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inclusive}
                    onChange={(e) => setInclusive(e.target.checked)}
                  />
                  Inclusive
                </label>
              </div>
            )}
            <div>
              <Button onClick={handleCreate}>Add rule</Button>
            </div>
          </FormSection>
        </CardContent>
      </Card>
    </div>
  );
}
