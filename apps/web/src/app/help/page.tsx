"use client";

import { useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
import { EmptyState, LoadingState, ApiErrorState } from "../../components/ui/states";
import {
  useHelpArticles,
  useHelpCategories,
  useCreateSupportTicket,
} from "../../lib/api-hooks";
import type { HelpArticle, HelpCategory } from "../../lib/lms-types";

function CategoryPill({
  category,
  active,
  onClick,
}: {
  category: HelpCategory;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {category.title}
      {category._count?.articles != null && (
        <span className="opacity-70">({category._count.articles})</span>
      )}
    </button>
  );
}

function ArticleCard({
  article,
  onClick,
}: {
  article: HelpArticle;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{article.title}</span>
        {article.excerpt && (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {article.excerpt}
          </span>
        )}
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function ArticleDetail({
  article,
  onBack,
}: {
  article: HelpArticle;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to articles
      </button>
      <h2 className="text-lg font-semibold">{article.title}</h2>
      <div className="prose prose-sm max-w-none text-foreground">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{article.body}</p>
      </div>
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketForm({ onSubmit }: { onSubmit: (msg: string) => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const createTicket = useCreateSupportTicket();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    try {
      await createTicket({ subject, body });
      setSubject("");
      setBody("");
      setStatus("Your request has been submitted. We'll get back to you shortly.");
      if (onSubmit) onSubmit(subject);
    } catch (err) {
      setStatus((err as Error).message ?? "Failed to submit ticket.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Contact support</h3>
      <input
        className="rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        required
        type="text"
        value={subject}
      />
      <textarea
        className="rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your issue…"
        required
        rows={4}
        value={body}
      />
      {status && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs">
          {status}
        </p>
      )}
      <button
        type="submit"
        className="self-start rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        Submit request
      </button>
    </form>
  );
}

export default function HelpPage() {
  const categoriesQuery = useHelpCategories();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const articlesQuery = useHelpArticles({
    categoryId: activeCategoryId ?? undefined,
    limit: 50,
  });

  const categories = categoriesQuery.data ?? [];
  const articles = (articlesQuery.data ?? []).filter(
    (a) => a.status === "PUBLISHED",
  );

  return (
    <AppShell currentPath="/help">
      <PageHeader
        eyebrow="Support"
        title="Help Center"
        description="Browse articles or contact support."
        actions={
          <button
            type="button"
            onClick={() => setShowTicketForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Contact support
          </button>
        }
      />

      {showTicketForm && (
        <div className="rounded-md border border-border bg-card p-5">
          <TicketForm onSubmit={() => setShowTicketForm(false)} />
        </div>
      )}

      {selectedArticle ? (
        <ArticleDetail
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {categoriesQuery.loading ? (
            <LoadingState title="Loading categories" />
          ) : categoriesQuery.error ? (
            <ApiErrorState error={categoriesQuery.error} fallbackTitle="Could not load categories" />
          ) : categories.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button
                type="button"
                aria-pressed={activeCategoryId === null}
                onClick={() => setActiveCategoryId(null)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategoryId === null
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  category={cat}
                  active={activeCategoryId === cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                />
              ))}
            </div>
          ) : null}

          {articlesQuery.loading ? (
            <LoadingState title="Loading articles" />
          ) : articlesQuery.error ? (
            <ApiErrorState error={articlesQuery.error} fallbackTitle="Could not load articles" />
          ) : articles.length === 0 ? (
            <EmptyState
              title="No articles yet"
              description="Check back later or contact support below."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => setSelectedArticle(article)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
