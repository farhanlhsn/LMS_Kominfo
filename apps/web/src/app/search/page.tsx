"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../components/ui/core";
import { EmptyState, LoadingState } from "../../components/ui/states";
import { useGlobalSearch } from "../../lib/api-hooks";
import type { SearchEntityType, SearchHit } from "../../lib/lms-types";

const ENTITY_LABELS: Record<SearchEntityType, string> = {
  course: "Course",
  lesson: "Lesson",
  discussion: "Discussion",
  user: "User",
  certificate: "Certificate",
  help_article: "Help",
};

const ENTITY_FILTERS: { key: SearchEntityType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "course", label: "Courses" },
  { key: "lesson", label: "Lessons" },
  { key: "discussion", label: "Discussions" },
  { key: "help_article", label: "Help" },
];

function SearchResultItem({ hit }: { hit: SearchHit }) {
  const href = hit.url ?? "#";
  return (
    <a
      href={href}
      className="flex flex-col gap-1 rounded-md border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <StatusBadge value={ENTITY_LABELS[hit.type] ?? hit.type} />
        <span className="text-sm font-medium">{hit.title}</span>
      </div>
      {hit.snippet && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{hit.snippet}</p>
      )}
    </a>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchEntityType | "all">("all");

  const types: SearchEntityType[] | undefined =
    filter === "all" ? undefined : [filter];

  const result = useGlobalSearch(query, { types, limit: 30 }, query.trim().length > 1);

  const hits = result.data?.hits ?? [];
  const facets = result.data?.facetCounts;
  const total = result.data?.total ?? 0;

  return (
    <AppShell currentPath="/search">
      <PageHeader
        eyebrow="Platform"
        title="Search"
        description="Find courses, lessons, discussions, and help articles."
      />

      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything…"
            type="search"
            value={query}
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {ENTITY_FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? total
                : (facets?.[f.key as SearchEntityType] ?? 0);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {query.trim().length > 1 && count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {query.trim().length <= 1 ? (
          <EmptyState
            title="Start typing to search"
            description="Enter at least 2 characters to see results."
          />
        ) : result.loading ? (
          <LoadingState title="Searching…" />
        ) : hits.length === 0 ? (
          <EmptyState
            title="No results"
            description={`Nothing matched "${query}". Try different keywords.`}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
            {hits.map((hit) => (
              <SearchResultItem key={`${hit.type}-${hit.id}`} hit={hit} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
