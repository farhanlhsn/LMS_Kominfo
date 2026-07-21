"use client";

import { useMemo, useState } from "react";
import { Bookmark, Trash2, ExternalLink } from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { FilterBar, PageHeader } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useDeleteLearnerBookmark, useLearnerBookmarks } from "../../../lib/api-hooks";
import type { LearnerBookmark } from "../../../lib/lms-types";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function BookmarksOverviewPage() {
  const [search, setSearch] = useState("");
  const bookmarksQuery = useLearnerBookmarks({});
  const deleteBookmark = useDeleteLearnerBookmark();

  const grouped = useMemo(() => {
    const data = bookmarksQuery.data ?? [];
    const map = new Map<string, LearnerBookmark[]>();
    for (const b of data) {
      const key = b.course?.title ?? b.courseId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookmarksQuery.data]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(([course, bookmarks]) => [
        course,
        bookmarks.filter(
          (b) =>
            (b.title ?? "").toLowerCase().includes(q) ||
            (b.note ?? "").toLowerCase().includes(q) ||
            course.toLowerCase().includes(q),
        ),
      ] as const)
      .filter(([, bookmarks]) => bookmarks.length > 0);
  }, [grouped, search]);

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Learner"
          title="Bookmarks"
          description="All your saved bookmarks across courses."
        />

        <FilterBar onClear={() => setSearch("")}>
          <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
            <span className="sr-only">Search bookmarks</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookmarks"
              type="search"
              value={search}
            />
          </label>
        </FilterBar>

        {bookmarksQuery.loading ? (
          <div className="mt-5">
            <LoadingState title="Loading bookmarks" />
          </div>
        ) : bookmarksQuery.error ? (
          <div className="mt-5">
            <ApiErrorState
              error={bookmarksQuery.error}
              fallbackTitle="Could not load bookmarks"
            />
          </div>
        ) : filtered.length > 0 ? (
          <div className="mt-5 space-y-6">
            {filtered.map(([course, bookmarks]) => (
              <section key={course}>
                <h2 className="mb-3 text-lg font-semibold">{course}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bookmarks.map((b) => (
                    <article
                      key={b.id}
                      className="relative rounded-lg border border-border bg-card p-4 shadow-subtle"
                    >
                      <div className="flex items-start gap-3">
                        <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {b.title ?? "Bookmark"}
                          </p>
                          {b.videoTimeSeconds != null ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTimestamp(b.videoTimeSeconds)}
                            </p>
                          ) : null}
                          {b.note ? (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {b.note}
                            </p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2">
                            {b.lesson ? (
                              <a
                                href={`/learn/lessons/${b.lesson.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {b.lesson.title ?? "View lesson"}
                              </a>
                            ) : null}
                            <button
                              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                              onClick={() => {
                                void deleteBookmark(b.id).then(() =>
                                  bookmarksQuery.reload(),
                                );
                              }}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title={search ? "No matching bookmarks" : "No bookmarks yet"}
              description={
                search
                  ? "Try a different search term."
                  : "Bookmark moments in your lessons and they'll appear here."
              }
            />
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
