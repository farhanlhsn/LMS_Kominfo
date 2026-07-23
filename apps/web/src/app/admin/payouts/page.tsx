"use client";

import { PERMISSIONS } from "@lms/shared";
import { Percent,Wallet } from "lucide-react";
import { useCallback,useState } from "react";
import { AuthGate,PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PayoutPeriodCard } from "../../../components/payout/payout-period-card";
import { Button } from "../../../components/ui/button";
import { Card,CardContent,CardHeader } from "../../../components/ui/card";
import { FormSection,PageHeader } from "../../../components/ui/core";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "../../../components/ui/select";
import { ApiErrorState,EmptyState,LoadingState } from "../../../components/ui/states";
import {
  useCreatePayoutMethod,
  useCreateRevenueShareRule,
  usePayoutMethods,
  useRevenueShareRules,
  useUpdateRevenueShareRule,
} from "../../../lib/api-hooks";
import type {
  PayoutBeneficiaryType,
  PayoutMethodType,
  RevenueShareScope,
} from "../../../lib/lms-types";

const SCOPES: RevenueShareScope[] = ["PLATFORM", "INSTRUCTOR", "COURSE"];
const BENEFICIARY_TYPES: PayoutBeneficiaryType[] = ["INSTRUCTOR", "ORG", "PLATFORM"];
const METHOD_TYPES: PayoutMethodType[] = ["BANK", "PAYPAL", "STRIPE"];

export default function AdminPayoutsPage() {
  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin/payouts">
          <PageHeader
            eyebrow="Admin"
            title="Payouts & revenue share"
            description="Configure revenue splits, payout methods, and run payout periods."
          />
          <PayoutsBody />
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}

function PayoutsBody() {
  const rulesQuery = useRevenueShareRules();
  const methodsQuery = usePayoutMethods();
  const createRule = useCreateRevenueShareRule();
  const updateRule = useUpdateRevenueShareRule();
  const createMethod = useCreatePayoutMethod();
  const [ruleScope, setRuleScope] = useState<RevenueShareScope>("INSTRUCTOR");
  const [rulePercent, setRulePercent] = useState(70);
  const [ruleTargetId, setRuleTargetId] = useState("");
  const [methodType, setMethodType] = useState<PayoutMethodType>("BANK");
  const [beneficiaryType, setBeneficiaryType] = useState<PayoutBeneficiaryType>("INSTRUCTOR");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [methodDetails, setMethodDetails] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleCreateRule = useCallback(async () => {
    setError(null);
    setStatus(null);
    try {
      await createRule({
        scope: ruleScope,
        percent: rulePercent,
        targetId: ruleTargetId || undefined,
        active: true,
      });
      setStatus(`Rule ${ruleScope} @ ${rulePercent}% created`);
      setRuleTargetId("");
      await rulesQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    }
  }, [createRule, ruleScope, rulePercent, ruleTargetId, rulesQuery]);

  const handleToggleRule = useCallback(
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

  const handleCreateMethod = useCallback(async () => {
    setError(null);
    setStatus(null);
    let details: Record<string, unknown>;
    try {
      details = methodDetails.trim() ? JSON.parse(methodDetails) : {};
    } catch {
      setError("Method details must be valid JSON");
      return;
    }
    try {
      await createMethod({
        beneficiaryType,
        beneficiaryId,
        type: methodType,
        details,
      });
      setStatus(`Method ${methodType} created`);
      setBeneficiaryId("");
      setMethodDetails("{}");
      await methodsQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create method");
    }
  }, [createMethod, beneficiaryType, beneficiaryId, methodType, methodDetails, methodsQuery]);

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

      <PayoutPeriodCard />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent aria-hidden="true" className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Revenue share rules</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Define how revenue is split between the platform, instructors, and courses.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {rulesQuery.isLoading ? (
              <LoadingState title="Loading rules" />
            ) : rulesQuery.error ? (
              <ApiErrorState error={rulesQuery.error} />
            ) : !rulesQuery.data?.length ? (
              <EmptyState
                title="No revenue share rules"
                description="Add a rule to start splitting revenue."
                icon={Percent}
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
                        {rule.scope} • {rule.percent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Target: {rule.targetId ?? "default"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleToggleRule(rule.id, !rule.active)}
                    >
                      {rule.active ? "Deactivate" : "Activate"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FormSection title="New rule" description="Create a new revenue share rule.">
              <div className="grid gap-2 md:grid-cols-3">
                <label className="text-sm font-medium">
                  Scope
                  <div className="relative w-full">
                    <Select value={ruleScope} onValueChange={(val) => setRuleScope(val as RevenueShareScope)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPES.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {scope}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="text-sm font-medium">
                  Percent
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1 w-full rounded border border-border px-2 py-1"
                    value={rulePercent}
                    onChange={(e) => setRulePercent(Number(e.target.value))}
                  />
                </label>
                <label className="text-sm font-medium">
                  Target ID (optional)
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1"
                    value={ruleTargetId}
                    onChange={(e) => setRuleTargetId(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <Button onClick={handleCreateRule}>Add rule</Button>
              </div>
            </FormSection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet aria-hidden="true" className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Payout methods</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect bank, PayPal, or Stripe accounts for beneficiaries.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {methodsQuery.isLoading ? (
              <LoadingState title="Loading methods" />
            ) : methodsQuery.error ? (
              <ApiErrorState error={methodsQuery.error} />
            ) : !methodsQuery.data?.length ? (
              <EmptyState
                title="No payout methods"
                description="Add a method to enable payouts."
                icon={Wallet}
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {methodsQuery.data.map((method) => (
                  <li
                    key={method.id}
                    className="flex items-center justify-between rounded border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {method.type} • {method.beneficiaryType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Beneficiary: {method.beneficiaryId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <FormSection title="Add method" description="Create a new payout method.">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Type
                  <div className="relative w-full">
                    <Select value={methodType} onValueChange={(val) => setMethodType(val as PayoutMethodType)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {METHOD_TYPES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="text-sm font-medium">
                  Beneficiary type
                  <div className="relative w-full">
                    <Select value={beneficiaryType} onValueChange={(val) => setBeneficiaryType(val as PayoutBeneficiaryType)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Beneficiary type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BENEFICIARY_TYPES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="text-sm font-medium md:col-span-2">
                  Beneficiary ID
                  <input
                    className="mt-1 w-full rounded border border-border px-2 py-1"
                    value={beneficiaryId}
                    onChange={(e) => setBeneficiaryId(e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium md:col-span-2">
                  Method details (JSON)
                  <textarea
                    className="mt-1 w-full rounded border border-border px-2 py-1 font-mono text-xs"
                    rows={4}
                    value={methodDetails}
                    onChange={(e) => setMethodDetails(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <Button onClick={handleCreateMethod}>Add method</Button>
              </div>
            </FormSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
