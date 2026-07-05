"use client";

import { useState } from "react";
import {
  useHelpArticles,
  useHelpCategories,
} from "../../lib/api-hooks";
import { cn } from "../../lib/utils";

export interface HelpArticleListProps {
  categoryId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function HelpArticleList({ categoryId, onSelect, className }: HelpArticleListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | undefined>(categoryId);
  const categories = useHelpCategories();
  const articles = useHelpArticles({ q: search, categoryId: filter, limit: 30 });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Search help articles"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search help articles…"
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter by category"
          value={filter ?? ""}
          onChange={(event) => setFilter(event.target.value || undefined)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </div>
      {articles.loading && <p className="text-sm text-muted-foreground">Loading articles…</p>}
      {articles.error && <p className="text-sm text-destructive">{articles.error.message}</p>}
      {articles.data && articles.data.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          No articles yet.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {articles.data?.map((article) => (
          <li key={article.id}>
            <button
              type="button"
              onClick={() => onSelect?.(article.id)}
              className="w-full rounded-md border border-border bg-card p-3 text-left transition hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{article.title}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] uppercase",
                    article.status === "PUBLISHED"
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {article.status}
                </span>
              </div>
              {article.excerpt && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {article.category?.title && (
                  <span className="rounded bg-muted px-1.5 py-0.5">{article.category.title}</span>
                )}
                {Array.isArray(article.tags) && (article.tags as string[]).map((tag) => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5">#{tag}</span>
                ))}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
