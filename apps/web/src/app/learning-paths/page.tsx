"use client";

import { BarChart3,BookOpen,Clock,Users } from "lucide-react";
import Link from "next/link";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { PageHeader,StatusBadge } from "../../components/ui/core";
import { ApiErrorState,EmptyState } from "../../components/ui/states";
import { useLearningPaths } from "../../lib/api-hooks";
import type { LearningPath } from "../../lib/lms-types";

export default function LearningPathsPage() {
  const query = useLearningPaths({ status: "PUBLISHED" });
  const result = query.data;

  return (
    <AuthGate>
      <AppShell currentPath="/learning-paths">
        <PageHeader
          eyebrow="Catalog"
          title="Learning Paths"
          description="Structured programs that group courses into a guided learning journey."
        />

        {query.loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : query.error ? (
          <ApiErrorState error={query.error} fallbackTitle="Could not load learning paths" />
        ) : !result?.data?.length ? (
          <EmptyState
            title="No learning paths yet"
            description="Learning paths group courses into guided programs."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.data.map((path: LearningPath) => (
              <Link key={path.id} href={"/learning-paths/" + encodeURIComponent(path.slug)} className="group rounded-lg border border-border bg-card p-5 shadow-subtle transition hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <BookOpen aria-hidden="true" className="h-6 w-6 text-primary" />
                  <StatusBadge value={path.status === "PUBLISHED" ? "Published" : path.status === "DRAFT" ? "Draft" : "Archived"} tone={path.status === "PUBLISHED" ? "success" : "neutral"} />
                </div>
                <h2 className="mt-4 text-base font-semibold group-hover:text-primary">{path.title}</h2>
                {path.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{path.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {path._count?.enrollments ?? 0} enrolled</span>
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {path._count?.courses ?? 0} courses</span>
                  {path.durationHours > 0 ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {path.durationHours}h</span> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
