"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
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
      <PermissionGate anyOf={[PERMISSIONS.auditRead]}>
        <AppShell currentPath="/admin/reviews">
          <PageHeader
            eyebrow="Admin"
            title="Review moderation"
            description="Approve or reject learner reviews."
            actions={
              <div className="relative w-full">
                <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pending" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
