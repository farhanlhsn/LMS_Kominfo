"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Library, Plus, RefreshCw } from "lucide-react";
import {
  ContentLibraryGrid,
  ContentLibraryTable,
  RichTextEditor,
} from "../../../components/content/content";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { FilterBar, FormSection, PageHeader, StatCard } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { api } from "../../../lib/api-client";
import { useContentLibrary, useFiles } from "../../../lib/api-hooks";

export default function InstructorContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const libraryQuery = useContentLibrary();
  const filesQuery = useFiles();
  const items = libraryQuery.data ?? [];
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        `${item.title} ${item.description ?? ""} ${item.type}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search],
  );

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setMessage(null);
    try {
      await api.createContentLibraryItem({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        type: String(form.get("type") ?? "RICH_TEXT"),
        fileId: String(form.get("fileId") ?? "") || undefined,
        tags,
        metadata: {
          externalUrl: String(form.get("externalUrl") ?? "") || undefined,
          textContent: String(form.get("textContent") ?? "") || undefined,
        },
      });
      formElement.reset();
      setMessage("Library item created.");
      await libraryQuery.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/content-library">
        <PageHeader
          eyebrow="Instructor"
          title="Content Library"
          description="Create reusable rich text, video, file, PDF, image, and link content for activity builders."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Library}
            label="Reusable items"
            value={String(items.length)}
          />
          <StatCard
            icon={RefreshCw}
            label="Background jobs"
            value="Ready"
            helper="Processing and indexing queues are abstracted."
          />
          <StatCard
            icon={Plus}
            label="Activity content"
            value="Extensible"
            helper="Content is keyed by activityTypeKey."
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <FilterBar>
              <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                <span className="sr-only">Search reusable content</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reusable content"
                  type="search"
                  value={search}
                />
              </label>
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                type="button"
              >
                Reset
              </button>
            </FilterBar>

            {libraryQuery.loading ? (
              <LoadingState title="Loading content library" />
            ) : libraryQuery.error ? (
              <ApiErrorState
                error={libraryQuery.error}
                fallbackTitle="Could not load content library"
              />
            ) : filteredItems.length ? (
              <>
                <ContentLibraryGrid items={filteredItems} />
                <ContentLibraryTable items={filteredItems} />
              </>
            ) : (
              <EmptyState
                title="No library items"
                description="Create reusable content to attach it in the course builder."
              />
            )}
          </div>

          <aside className="space-y-5">
            <FormSection
              title="New library item"
              description="Saved items are organization-scoped and reusable in activities."
            >
              <form className="grid gap-3" onSubmit={createItem}>
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  minLength={2}
                  name="title"
                  placeholder="Title"
                  required
                />
                <textarea
                  className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm"
                  name="description"
                  placeholder="Description"
                />
                <select
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="type"
                >
                  <option value="RICH_TEXT">Rich text</option>
                  <option value="VIDEO">Video</option>
                  <option value="FILE">File</option>
                  <option value="PDF">PDF</option>
                  <option value="LINK">Link</option>
                  <option value="IMAGE">Image</option>
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="fileId"
                >
                  <option value="">No attached file</option>
                  {(filesQuery.data?.data ?? []).map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.originalFilename}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="externalUrl"
                  placeholder="External URL"
                  type="url"
                />
                <input
                  className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                  name="tags"
                  placeholder="Tags separated by commas"
                />
                <textarea
                  className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm"
                  name="textContent"
                  placeholder="Reusable text content"
                />
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  type="submit"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Create item
                </button>
              </form>
              {message ? (
                <p className="text-sm text-muted-foreground">{message}</p>
              ) : null}
            </FormSection>

            <section>
              <h2 className="mb-3 text-base font-semibold">Rich text draft</h2>
              <RichTextEditor defaultValue="Draft reusable lesson copy here, then save it as a library item above." />
            </section>
          </aside>
        </div>
      </AppShell>
    </AuthGate>
  );
}
