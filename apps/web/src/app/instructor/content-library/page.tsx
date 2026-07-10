"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box, File, FileText, Film, Image, Link, Plus, Search,
  Trash2, Upload, X,
} from "lucide-react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { FilterBar, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { ThreeDViewer } from "../../../components/content-3d/three-d-viewer";
import { api } from "../../../lib/api-client";
import { useContentLibrary, useThreeDAssets } from "../../../lib/api-hooks";
import type { ContentLibraryItem, ThreeDAssetRecord } from "../../../lib/lms-types";

type LibType = ContentLibraryItem["type"] | "ALL";

const TYPE_LABELS: Record<ContentLibraryItem["type"], string> = {
  RICH_TEXT: "Text",
  VIDEO: "Video",
  FILE: "File",
  PDF: "PDF",
  LINK: "Link",
  IMAGE: "Image",
  THREE_D_MODEL: "3D Model",
};

const TYPE_ICONS: Record<ContentLibraryItem["type"], React.ComponentType<any>> = {
  RICH_TEXT: FileText,
  VIDEO: Film,
  FILE: File,
  PDF: File,
  LINK: Link,
  IMAGE: Image,
  THREE_D_MODEL: Box,
};

const ACCEPT_MAP: Record<ContentLibraryItem["type"], string> = {
  RICH_TEXT: ".txt,.md",
  VIDEO: "video/*",
  FILE: "*",
  PDF: ".pdf",
  LINK: "",
  IMAGE: "image/*",
  THREE_D_MODEL: ".glb,.gltf,.fbx,.obj",
};

function detectTypeFromFile(file: File): ContentLibraryItem["type"] {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.match(/\.(glb|gltf|fbx|obj)$/)) return "THREE_D_MODEL";
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "FILE";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function InstructorContentLibraryPage() {
  const libraryQuery = useContentLibrary();
  const threeDQuery = useThreeDAssets();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<LibType>("ALL");
  const [preview3D, setPreview3D] = useState<ThreeDAssetRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = libraryQuery.data ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType = typeFilter === "ALL" || item.type === typeFilter;
      const matchSearch = `${item.title} ${item.description ?? ""} ${item.type}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [items, search, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: items.length };
    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (!fileArr.length) return;
    setUploading(true);
    setUploadMsg(null);
    let success = 0;
    let fail = 0;

    // First pass: upload all files and collect URLs
    const uploaded: Array<{ file: File; url: string; assetId: string }> = [];
    for (const file of fileArr) {
      try {
        const type = detectTypeFromFile(file);
        // Media assets (3D, image, video) → PUBLIC for permanent URL
        // Documents (PDF, file, text) → PRIVATE with long signed URL
        const isMedia = ["THREE_D_MODEL", "IMAGE", "VIDEO"].includes(type);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "CONTENT");
        formData.append("visibility", isMedia ? "PUBLIC" : "ORGANIZATION");
        formData.append("accessLevel", isMedia ? "PUBLIC" : "ORGANIZATION_MEMBERS");
        const asset = await api.uploadFile(formData);
        // PUBLIC files get permanent URL, private files get 7-day signed URL
        const { url } = await api.signedFileUrl(asset.id, isMedia ? 300 : 604800);
        uploaded.push({ file, url, assetId: asset.id });
      } catch (err) {
        fail++;
        console.error(err);
      }
    }

    // Build a map: basename → mtlUrl for pairing OBJ+MTL
    const mtlMap = new Map<string, string>();
    for (const { file, url } of uploaded) {
      if (file.name.toLowerCase().endsWith(".mtl")) {
        const base = file.name.replace(/\.mtl$/i, "").toLowerCase();
        mtlMap.set(base, url);
      }
    }

    // Second pass: create library items
    for (const { file, url, assetId } of uploaded) {
      try {
        const type = detectTypeFromFile(file);
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const mtlUrl = file.name.toLowerCase().endsWith(".obj")
          ? (mtlMap.get(baseName.toLowerCase()) ?? null)
          : null;

        // For 3D models, also register in ThreeDAsset library
        if (type === "THREE_D_MODEL") {
          const ext = file.name.split(".").pop()?.toUpperCase() as any;
          const fmt = ["GLB", "GLTF", "FBX", "OBJ"].includes(ext) ? ext : "GLB";
          await api.createThreeDAsset({
            name: baseName,
            format: fmt,
            url,
            sizeBytes: file.size,
          });
        }

        await api.createContentLibraryItem({
          title: baseName,
          type,
          fileId: assetId,
          metadata: { url, originalFilename: file.name, size: file.size, ...(mtlUrl ? { mtlUrl } : {}) },
        });
        success++;
      } catch (err) {
        fail++;
        console.error(err);
      }
    }
    setUploadMsg({
      text: fail === 0 ? `${success} file${success > 1 ? "s" : ""} uploaded.` : `${success} uploaded, ${fail} failed.`,
      ok: fail === 0,
    });
    setUploading(false);
    await libraryQuery.reload();
    if ((typeFilter === "ALL" || typeFilter === "THREE_D_MODEL") && fileArr.some(f => detectTypeFromFile(f) === "THREE_D_MODEL")) {
      await threeDQuery.reload();
    }
  }, [libraryQuery, threeDQuery, typeFilter]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
  }

  async function deleteItem(id: string) {
    try {
      await api.deleteContentLibraryItem(id);
      await libraryQuery.reload();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/content-library">
        <PageHeader
          eyebrow="Instructor"
          title="Content Library"
          description="Upload and manage reusable files, 3D models, videos, and more."
        />

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
          } ${uploading ? "cursor-wait opacity-60" : ""}`}
        >
          {uploading ? (
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium">{uploading ? "Uploading…" : "Drop files here or click to upload"}</p>
            <p className="text-xs text-muted-foreground">Images, videos, PDFs, files, and 3D models (GLB/GLTF/FBX/OBJ)</p>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept="image/*,video/*,.pdf,.glb,.gltf,.fbx,.obj,.txt,.md"
            onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
        </div>

        {uploadMsg && (
          <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${uploadMsg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
            {uploadMsg.text}
            <button type="button" onClick={() => setUploadMsg(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-10 flex-1 min-w-48 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              type="search" placeholder="Search library…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-1">
            {(["ALL", "RICH_TEXT", "VIDEO", "FILE", "PDF", "LINK", "IMAGE", "THREE_D_MODEL"] as LibType[]).map((t) => (
              <button key={t} type="button" onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}>
                {t === "ALL" ? "All" : TYPE_LABELS[t as ContentLibraryItem["type"]]}
                {typeCounts[t] != null && <span className="ml-1 opacity-60">({typeCounts[t]})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Library grid */}
        {libraryQuery.loading ? (
          <LoadingState title="Loading library" />
        ) : libraryQuery.error ? (
          <ApiErrorState error={libraryQuery.error} fallbackTitle="Could not load library" />
        ) : filteredItems.length === 0 ? (
          <EmptyState title="No items" description="Upload files or add links above." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? File;
              const is3D = item.type === "THREE_D_MODEL";
              const asset3D = is3D
                ? (threeDQuery.data ?? []).find((a) => a.id === (item.metadata as any)?.assetId || a.url === (item.metadata as any)?.url)
                : null;
              return (
                <div key={item.id} className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden">
                  {/* Thumbnail / preview */}
                  {item.type === "IMAGE" && (item.metadata as any)?.url ? (
                    <img src={(item.metadata as any).url} alt={item.title}
                      className="h-36 w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : is3D && asset3D ? (
                    <div className="h-36 cursor-pointer" onClick={() => setPreview3D(preview3D?.id === asset3D.id ? null : asset3D)}>
                      <ThreeDViewer asset={asset3D} height={144} showInfo={false} autoRotate
                        mtlUrl={(item.metadata as any)?.mtlUrl ?? null} />
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-muted/30">
                      <Icon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <button type="button" onClick={() => void deleteItem(item.id)}
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge value={TYPE_LABELS[item.type]} />
                      {(item.metadata as any)?.size && (
                        <span className="text-xs text-muted-foreground">{formatBytes((item.metadata as any).size)}</span>
                      )}
                    </div>
                    {(item.metadata as any)?.url && (
                      <a href={(item.metadata as any).url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 truncate text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        View file ↗
                      </a>
                    )}
                    {item.tags?.length ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
