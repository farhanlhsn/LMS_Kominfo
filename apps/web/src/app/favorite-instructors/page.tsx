"use client";

import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { FavoriteInstructorList } from "../../components/reviews/lists";
import { PageHeader } from "../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../components/ui/states";
import { useFavoriteInstructors } from "../../lib/api-hooks";
import type { FavoriteInstructor } from "../../lib/lms-types";

export default function FavoriteInstructorsPage() {
  const query = useFavoriteInstructors();
  const favorites = (query.data ?? []) as FavoriteInstructor[];

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="My Learning"
          title="Favorite instructors"
          description="Instructors you follow."
        />

        {query.loading ? (
          <LoadingState title="Loading favorites" />
        ) : query.error ? (
          <ApiErrorState
            error={query.error}
            fallbackTitle="Could not load favorites"
          />
        ) : (
          <FavoriteInstructorList favorites={favorites} />
        )}
      </AppShell>
    </AuthGate>
  );
}
