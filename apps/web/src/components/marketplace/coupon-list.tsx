"use client";

import { useState } from "react";
import type { Coupon } from "../../lib/lms-types";
import { EmptyState } from "../ui/states";
import { StatusBadge } from "../ui/core";

export function CouponList({ coupons }: { coupons: Coupon[] }) {
  const [search, setSearch] = useState("");

  const filtered = coupons.filter((coupon) => {
    if (!search) return true;
    return coupon.code.toLowerCase().includes(search.toLowerCase());
  });

  if (coupons.length === 0) {
    return (
      <EmptyState
        description="Coupons you create will appear here."
        title="No coupons yet"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-subtle">
        <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
          <span className="sr-only">Search coupons</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code"
            type="search"
            value={search}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          description="No coupons match the current search."
          title="No matching coupons"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-subtle">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filtered.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-semibold">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {coupon.discountPercent > 0
                      ? `${coupon.discountPercent}%`
                      : coupon.discountAmount}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.currentUses}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {coupon.validFrom
                      ? new Date(coupon.validFrom).toLocaleDateString()
                      : "—"}
                    {" → "}
                    {coupon.validUntil
                      ? new Date(coupon.validUntil).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={coupon.isActive ? "success" : "neutral"}
                      value={coupon.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
