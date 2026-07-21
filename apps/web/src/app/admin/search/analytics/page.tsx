"use client";

import { useState } from "react";
import Link from "next/link";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../../components/auth/auth-gate";
import { AppShell } from "../../../../components/layout/shells";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../../components/ui/select";
import { LoadingState, ApiErrorState } from "../../../../components/ui/states";
import { useSearchAnalytics } from "../../../../lib/api-hooks";

export default function SearchAnalyticsPage() {
  const [days, setDays] = useState(30);
  const analytics = useSearchAnalytics({ days, limit: 25 });

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
    <AppShell currentPath="/admin/search/analytics">
      <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <nav className="text-xs text-muted-foreground">
          <Link className="hover:underline" href="/admin">Admin</Link>
          {" / "}
          <span>Search</span>
          {" / Analytics"}
        </nav>
        <h1 className="text-2xl font-semibold">Search Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Monitor learner queries, top searches, and zero-result patterns.
        </p>
      </header>
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="days">
          Window
        </label>
        <div className="relative">
          <Select
            value={String(days)}
            onValueChange={(val) => setDays(Number(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => void analytics.reload()}
          className="rounded-md border border-border bg-card px-3 py-1 text-sm hover:bg-muted"
        >
          Refresh
        </button>
      </div>
      {analytics.loading && <LoadingState title="Loading analytics" />}
      {analytics.error && <ApiErrorState error={analytics.error} fallbackTitle="Failed to load analytics" />}
      {analytics.data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Total queries</p>
            <p className="text-2xl font-bold">{analytics.data.total}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Window</p>
            <p className="text-2xl font-bold">{analytics.data.windowDays} days</p>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Unique top queries</p>
            <p className="text-2xl font-bold">{analytics.data.topQueries.length}</p>
          </div>
        </div>
      )}
      {analytics.data && (
        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Top queries</h2>
          {analytics.data.topQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No queries in this window.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {analytics.data.topQueries.map((row) => (
                <li key={row.query} className="flex items-center justify-between border-b border-border py-1 last:border-b-0">
                  <span>{row.query}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {analytics.data && (
        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent searches</h2>
          {analytics.data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent searches.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs">
              {analytics.data.recent.map((row) => (
                <li key={row.id} className="flex items-center justify-between border-b border-border py-1 last:border-b-0">
                  <span className="truncate">{row.query}</span>
                  <span className="ml-2 text-muted-foreground">
                    {row.resultsCount} results · {new Date(row.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
    </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
