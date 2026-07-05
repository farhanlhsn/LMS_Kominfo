"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { SearchEntityType, SearchHit } from "../../lib/lms-types";
import { useGlobalSearch } from "../../lib/api-hooks";
import { cn } from "../../lib/utils";

export interface SearchBarProps {
  defaultTypes?: SearchEntityType[];
  placeholder?: string;
  onSelect?: (hit: SearchHit) => void;
  className?: string;
}

const TYPE_LABELS: Record<SearchEntityType, string> = {
  course: "Courses",
  lesson: "Lessons",
  discussion: "Discussions",
  user: "Users",
  certificate: "Certificates",
  help_article: "Help",
};

export function SearchBar({
  defaultTypes,
  placeholder = "Search courses, lessons, people…",
  onSelect,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [types, setTypes] = useState<SearchEntityType[] | undefined>(defaultTypes);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const result = useGlobalSearch(
    debounced,
    { types: types && types.length ? types : undefined, limit: 10 },
    debounced.length >= 2,
  );

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          aria-label="Global search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {(Object.keys(TYPE_LABELS) as SearchEntityType[]).map((type) => {
          const active = !types || types.includes(type);
          return (
            <button
              type="button"
              key={type}
              onClick={() => {
                setTypes((current) => {
                  if (!current) return current;
                  if (current.includes(type)) {
                    const next = current.filter((t) => t !== type);
                    return next.length === 0 ? undefined : next;
                  }
                  return [...current, type];
                });
              }}
              className={cn(
                "rounded-full border px-2 py-1 transition",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
      {debounced.length >= 2 && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
          {result.loading && (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          )}
          {result.error && (
            <p className="p-3 text-sm text-destructive">Search failed.</p>
          )}
          {!result.loading && result.data && result.data.hits.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No results for “{debounced}”.</p>
          )}
          {result.data?.hits.map((hit) => (
            <button
              key={`${hit.type}-${hit.id}`}
              type="button"
              onClick={() => {
                if (onSelect) {
                  onSelect(hit);
                } else if (typeof window !== "undefined") {
                  window.location.href = hit.url;
                }
              }}
              className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{hit.title}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {TYPE_LABELS[hit.type]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{hit.snippet}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
