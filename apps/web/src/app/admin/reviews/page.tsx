"use client";

import { useState } from "react";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { AdminReviewList, type AdminReviewRow } from "../../../components/reviews/lists";
import { PageHeader, Pagination } from "../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../components/ui/states";
import { useAdminReviews } from "../../../lib/api-hooks";
import { PERMISSIONS } from "@lms/shared";

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<string>("PENDING");
  const [page, setPage] = useState<number>(1);
  const query = useAdminReviews({
    ...(status ? { status } : {}),
    page: String(page),
    limit: "20",
  });

  const payload = query.data as
    | { data: AdminReviewRow[]; meta?: { page?: number; totalPages?: number } }
    | undefined;
  const reviews = payload?.data ?? [];
  const meta = payload?.meta;

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function moderate(review: AdminReviewRow, next: "APPROVED" | "REJECTED") {
    if (next === "APPROVED") setApprovingId(review.id);
    if (next === "REJECTED") setRejectingId(review.id);
    try {
      const { api } = await import("../../../lib/api-client");
      await api.moderateReview(review.id, { status: next });
      await query.refresh();
    } finally {
      setApprovingId(null);
      setRejectingId(null);
    }
  }

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
        <AppShell currentPath="/admin">
          <PageHeader
            eyebrow="Admin"
            title="Review moderation"
            description="Approve or reject learner reviews."
            actions={
              <select
                aria-label="Filter reviews by status"
                className="min-h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                value={status}
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            }
          />

          {query.loading ? (
            <LoadingState title="Loading reviews" />
          ) : query.error ? (
            <ApiErrorState
              error={query.error}
              fallbackTitle="Could not load reviews"
            />
          ) : (
            <>
              <AdminReviewList
                approvingId={approvingId}
                onApprove={(review) => moderate(review, "APPROVED")}
                onReject={(review) => moderate(review, "REJECTED")}
                rejectingId={rejectingId}
                reviews={reviews}
              />
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
