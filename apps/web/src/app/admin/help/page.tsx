"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import {
  useCreateHelpArticle,
  useCreateHelpCategory,
  useDeleteHelpArticle,
  useDeleteHelpCategory,
  useHelpArticles,
  useHelpCategories,
  useUpdateHelpArticle,
  useUpdateHelpCategory,
} from "../../../lib/api-hooks";
import { HelpArticleList } from "../../../components/help/HelpArticleList";

export default function AdminHelpPage() {
  const categories = useHelpCategories();
  const createCategory = useCreateHelpCategory();
  const updateCategory = useUpdateHelpCategory();
  const deleteCategory = useDeleteHelpCategory();
  const createArticle = useCreateHelpArticle();
  const updateArticle = useUpdateHelpArticle();
  const deleteArticle = useDeleteHelpArticle();

  const [articleId, setArticleId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
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

  const selected = useHelpArticles({});

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

  const handleUpdateCategory = async (id: string) => {
    setStatus(null);
    try {
      await updateCategory(id, newCategory);
      setNewCategory({ key: "", title: "" });
      setEditingCategoryId(null);
      setStatus("Category updated.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and its articles?")) return;
    setStatus(null);
    try {
      await deleteCategory(id);
      setStatus("Category deleted.");
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
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.contentLibraryManage]}>
    <AppShell currentPath="/admin/help">
      <div className="flex flex-col gap-6">
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
            <li key={cat.id} className="flex items-center gap-2 rounded bg-muted px-2 py-1">
              <span>{cat.title} <span className="text-muted-foreground">({cat._count?.articles ?? 0})</span></span>
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryId(cat.id);
                  setNewCategory({ key: cat.key, title: cat.title });
                }}
                className="text-primary"
              >
                edit
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCategory(cat.id)}
                className="text-destructive"
              >
                delete
              </button>
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
          {editingCategoryId ? (
            <>
              <button
                type="button"
                onClick={() => void handleUpdateCategory(editingCategoryId)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryId(null);
                  setNewCategory({ key: "", title: "" });
                }}
                className="rounded-md border border-border px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCreateCategory}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Add category
            </button>
          )}
        </div>
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Create article</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="relative w-full">
            <Select value={newArticle.categoryId} onValueChange={(val) => setNewArticle((current) => ({ ...current, categoryId: val }))}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select category…</SelectItem>
                {categories.data?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="relative w-full">
            <Select value={newArticle.status} onValueChange={(val) => setNewArticle((current) => ({ ...current, status: val as "DRAFT" | "PUBLISHED" | "ARCHIVED" }))}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Draft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
    </div>
    </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
