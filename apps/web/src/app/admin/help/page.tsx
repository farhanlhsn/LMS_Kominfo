"use client";

import { useState } from "react";
import {
  useCreateHelpArticle,
  useCreateHelpCategory,
  useDeleteHelpArticle,
  useHelpArticles,
  useHelpCategories,
  useUpdateHelpArticle,
} from "../../../lib/api-hooks";
import { HelpArticleList } from "../../../components/help/HelpArticleList";

export default function AdminHelpPage() {
  const categories = useHelpCategories();
  const createCategory = useCreateHelpCategory();
  const createArticle = useCreateHelpArticle();
  const updateArticle = useUpdateHelpArticle();
  const deleteArticle = useDeleteHelpArticle();

  const [articleId, setArticleId] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState({
    categoryId: "",
    slug: "",
    title: "",
    body: "",
    excerpt: "",
    tags: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  });
  const [newCategory, setNewCategory] = useState({ key: "", title: "" });
  const [status, setStatus] = useState<string | null>(null);

  const selected = useHelpArticles({ limit: 100 });

  const handleCreate = async () => {
    if (!newArticle.categoryId || !newArticle.slug || !newArticle.title || !newArticle.body) {
      setStatus("All article fields are required.");
      return;
    }
    setStatus(null);
    try {
      await createArticle({
        categoryId: newArticle.categoryId,
        slug: newArticle.slug,
        title: newArticle.title,
        body: newArticle.body,
        excerpt: newArticle.excerpt || undefined,
        tags: newArticle.tags ? newArticle.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status: newArticle.status,
      });
      setNewArticle({ categoryId: "", slug: "", title: "", body: "", excerpt: "", tags: "", status: "DRAFT" });
      setStatus("Article created.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.key || !newCategory.title) {
      setStatus("Category key and title are required.");
      return;
    }
    setStatus(null);
    try {
      await createCategory(newCategory);
      setNewCategory({ key: "", title: "" });
      setStatus("Category created.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateArticle(id, { status: "PUBLISHED" });
      setStatus("Article published.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try {
      await deleteArticle(id);
      setArticleId(null);
      setStatus("Article deleted.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Help Center</h1>
        <p className="text-sm text-muted-foreground">
          Manage help categories and articles shown to learners and staff.
        </p>
      </header>
      {status && <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs">{status}</p>}
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Categories</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {categories.data?.map((cat) => (
            <li key={cat.id} className="rounded bg-muted px-2 py-1">
              {cat.title} <span className="text-muted-foreground">({cat._count?.articles ?? 0})</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newCategory.key}
            onChange={(event) => setNewCategory((current) => ({ ...current, key: event.target.value }))}
            placeholder="category key"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          />
          <input
            value={newCategory.title}
            onChange={(event) => setNewCategory((current) => ({ ...current, title: event.target.value }))}
            placeholder="title"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateCategory}
            className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            Add category
          </button>
        </div>
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Create article</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <select
            aria-label="Category"
            value={newArticle.categoryId}
            onChange={(event) => setNewArticle((current) => ({ ...current, categoryId: event.target.value }))}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="">Select category…</option>
            {categories.data?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>
          <input
            value={newArticle.slug}
            onChange={(event) => setNewArticle((current) => ({ ...current, slug: event.target.value }))}
            placeholder="slug"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          />
          <input
            value={newArticle.title}
            onChange={(event) => setNewArticle((current) => ({ ...current, title: event.target.value }))}
            placeholder="title"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-2"
          />
          <textarea
            value={newArticle.excerpt}
            onChange={(event) => setNewArticle((current) => ({ ...current, excerpt: event.target.value }))}
            placeholder="Short excerpt"
            rows={2}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-2"
          />
          <textarea
            value={newArticle.body}
            onChange={(event) => setNewArticle((current) => ({ ...current, body: event.target.value }))}
            placeholder="Article body (Markdown supported)"
            rows={6}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm md:col-span-2"
          />
          <input
            value={newArticle.tags}
            onChange={(event) => setNewArticle((current) => ({ ...current, tags: event.target.value }))}
            placeholder="tags, comma separated"
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          />
          <select
            aria-label="Status"
            value={newArticle.status}
            onChange={(event) =>
              setNewArticle((current) => ({ ...current, status: event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED" }))
            }
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Create article
        </button>
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Articles</h2>
          {articleId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePublish(articleId)}
                className="rounded-md bg-success px-3 py-1 text-xs font-semibold text-success-foreground"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => handleDelete(articleId)}
                className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <HelpArticleList
          className="mt-3"
          onSelect={(id) => setArticleId(id)}
        />
        {articleId && selected.data && (
          <p className="mt-2 text-xs text-muted-foreground">
            {selected.data.length} article(s) · Selected: {articleId}
          </p>
        )}
      </section>
    </main>
  );
}
