"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { RecentlyViewedList } from "../../components/reviews/lists";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useRecentlyViewed } from "../../lib/api-hooks";
import type { RecentlyViewedCourse } from "../../lib/lms-types";

export default function RecentlyViewedPage() {
  const query = useRecentlyViewed();
  const items = (query.data ?? []) as RecentlyViewedCourse[];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="My Learning"
          title="Recently viewed"
          description="Courses you have visited in this organization."
        />

        {query.loading ? (
          <LoadingState title="Loading history" />
        ) : query.error ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load history"
          />
        ) : (
          <RecentlyViewedList items={items} />
        )}
      </AppShell>
    </AuthGate>
  );
}
