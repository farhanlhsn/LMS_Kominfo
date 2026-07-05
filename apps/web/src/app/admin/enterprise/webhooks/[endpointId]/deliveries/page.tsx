"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate, PermissionGate } from "../../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../../components/layout/shells";
import { WebhookDeliveryList } from "../../../../../../components/enterprise/webhook-delivery-list";
import { PageHeader, Pagination } from "../../../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../../../components/ui/states";
import { useWebhookDeliveries, useWebhooks } from "../../../../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";
import type { WebhookEndpoint, WebhookDelivery } from "../../../../../../lib/lms-types";

export default function WebhookDeliveriesPage() {
  const params = useParams<{ endpointId: string }>();
  const endpointId = params.endpointId;
  const [page, setPage] = useState(1);
  const deliveriesQuery = useWebhookDeliveries(endpointId ?? null, {
    page: String(page),
    limit: "20",
  });
  const webhooksQuery = useWebhooks();
  const endpoint = ((webhooksQuery.data ?? []) as WebhookEndpoint[]).find(
    (item) => item.id === endpointId,
  );

  const payload = deliveriesQuery.data as
    | { data: WebhookDelivery[]; meta?: { page?: number; totalPages?: number } }
    | undefined;
  const deliveries = payload?.data ?? [];
  const meta = payload?.meta;

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.organizationsManage]}>
        <AppShell currentPath="/admin">
          <PageHeader
            breadcrumbs={[
              { label: "Webhooks", href: "/admin/enterprise/webhooks" },
              { label: endpoint?.name ?? "Endpoint" },
            ]}
            eyebrow="Enterprise"
            title={endpoint?.name ?? "Webhook deliveries"}
            description="Recent delivery attempts and outcomes."
          />

          {deliveriesQuery.loading ? (
            <LoadingState title="Loading deliveries" />
          ) : deliveriesQuery.error ? (
            <ApiErrorState
              error={deliveriesQuery.error}
              fallbackTitle="Could not load deliveries"
            />
          ) : (
            <>
              <WebhookDeliveryList deliveries={deliveries} />
              {meta && meta.totalPages && meta.totalPages > 1 ? (
                <div className="mt-4">
                  <Pagination
                    onPageChange={setPage}
                    page={meta.page ?? 1}
                    totalPages={meta.totalPages}
                  />
                </div>
              ) : null}
            </>
          )}
        </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
