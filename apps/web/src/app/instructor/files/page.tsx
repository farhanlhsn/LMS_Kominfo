"use client";

import { useMemo, useState } from "react";
import { FilePlus2, FolderOpen, HardDrive, ShieldCheck } from "lucide-react";
import {
  FileCard,
  FilePicker,
  FileUpload,
  formatBytes,
} from "../../../components/content/content";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatCard,
} from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { useFiles, useSignedFileUrl, useUploadFile } from "../../../lib/api-hooks";

export default function InstructorFilesPage() {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const query = useFiles();
  const uploadFile = useUploadFile();
  const signedFileUrl = useSignedFileUrl();
  const files = query.data?.data ?? [];
  const filteredFiles = useMemo(
    () =>
      files.filter((file) =>
        `${file.originalFilename} ${file.mimeType} ${file.purpose}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [files, search],
  );
  const rows = filteredFiles.map((file) => [
    <span className="font-medium" key="name">
      {file.originalFilename}
    </span>,
    <span key="type" className="text-muted-foreground">
      {file.mimeType}
    </span>,
    <span key="size">{formatBytes(file.size)}</span>,
    <span key="updated">{new Date(file.updatedAt).toLocaleDateString()}</span>,
  ]);

  async function upload(file: File) {
    const data = new FormData();
    data.set("file", file);
    data.set("purpose", file.type.startsWith("video/") ? "VIDEO" : "CONTENT");
    data.set("visibility", "ORGANIZATION");
    data.set("accessLevel", "ORGANIZATION_MEMBERS");
    setUploading(true);
    setMessage(null);
    try {
      await uploadFile(data);
      setMessage("File uploaded.");
      await query.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  async function openSignedUrl(fileId: string) {
    setMessage(null);
    try {
      const result = await signedFileUrl(fileId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/files">
        <PageHeader
          eyebrow="Instructor"
          title="File Manager"
          description="Upload, validate, organize, and reuse organization-scoped files without exposing storage credentials to the browser."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={HardDrive}
            label="Managed assets"
            value={String(files.length)}
          />
          <StatCard
            icon={ShieldCheck}
            label="Access model"
            value="RBAC"
            helper="Signed URLs are issued by the API."
          />
          <StatCard
            icon={FilePlus2}
            label="Processing"
            value="Queued"
            helper="Content processing jobs remain abstracted."
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <FileUpload onUpload={upload} uploading={uploading} />
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}

            <FilterBar>
              <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                <span className="sr-only">Search files</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files"
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

            {query.loading ? (
              <LoadingState title="Loading files" />
            ) : query.error ? (
              <ApiErrorState
                error={query.error}
                fallbackTitle="Could not load files"
              />
            ) : filteredFiles.length ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      action={
                        <button
                          className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                          onClick={() => void openSignedUrl(file.id)}
                          type="button"
                        >
                          Open signed URL
                        </button>
                      }
                    />
                  ))}
                </div>
                <DataTable
                  columns={["File", "Type", "Size", "Updated"]}
                  rows={rows}
                />
              </>
            ) : (
              <EmptyState
                title="No files"
                description="Upload files to reuse them in course activities."
              />
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen aria-hidden="true" className="h-4 w-4 text-primary" />
                Folder foundation
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Folders are organization-scoped and ready for future library
                workflows.
              </p>
            </section>
            <FilePicker files={files} />
          </aside>
        </div>
      </AppShell>
    </AuthGate>
  );
}
