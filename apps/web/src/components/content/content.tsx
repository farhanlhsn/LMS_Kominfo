import {
  ArrowUpRight,
  Bold,
  Box,
  Copy,
  File,
  FileText,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  PlayCircle,
  Pilcrow,
  PictureInPicture,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef } from "react";
import { sanitizeRichTextHtml } from "@lms/shared";
import type {
  ActivityContentResponse,
  ContentLibraryItem,
  FileAsset,
  VideoCaptionTrack,
} from "../../lib/lms-types";
import { ButtonLink, DataTable, StatusBadge } from "../ui/core";
import { EmptyState } from "../ui/states";

const itemTypeIcons: Record<ContentLibraryItem["type"], LucideIcon> = {
  RICH_TEXT: FileText,
  VIDEO: Video,
  FILE: File,
  PDF: FileText,
  LINK: Link2,
  IMAGE: Image,
  THREE_D_MODEL: Box,
};

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function ProcessingStatusBadge({
  status,
}: {
  status: FileAsset["processingStatus"];
}) {
  const tone = {
    PENDING: "neutral",
    PROCESSING: "info",
    READY: "success",
    FAILED: "danger",
  } satisfies Record<
    FileAsset["processingStatus"],
    "neutral" | "info" | "success" | "danger"
  >;

  return <StatusBadge tone={tone[status]} value={status.toLowerCase()} />;
}

export function FileUpload({
  onUpload,
  uploading,
}: {
  onUpload: (file: globalThis.File) => Promise<void>;
  uploading?: boolean;
}) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-6 text-card-foreground shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Upload aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Upload content file</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Files are validated by the API and stored through the configured
              storage provider.
            </p>
          </div>
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <Upload aria-hidden="true" className="h-4 w-4" />
          {uploading ? "Uploading" : "Choose file"}
          <input
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>
    </section>
  );
}

export function FileCard({
  file,
  action,
}: {
  file: FileAsset;
  action?: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText aria-hidden="true" className="h-5 w-5" />
        </span>
        <ProcessingStatusBadge status={file.processingStatus} />
      </div>
      <h2 className="mt-4 break-words text-base font-semibold">
        {file.originalFilename}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{file.mimeType}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="font-medium">{formatBytes(file.size)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Purpose</dt>
          <dd className="font-medium">{file.purpose.toLowerCase()}</dd>
        </div>
      </dl>
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}

export function FilePicker({
  files,
  onSelect,
}: {
  files: FileAsset[];
  onSelect?: (file: FileAsset) => void;
}) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="No files"
        description="Upload files before attaching them to activities."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <h2 className="text-base font-semibold">File picker</h2>
      <div className="mt-4 grid gap-2">
        {files.map((file) => (
          <button
            key={file.id}
            className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border px-3 text-left text-sm hover:bg-muted"
            onClick={() => onSelect?.(file)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {file.originalFilename}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </span>
            </span>
            <ProcessingStatusBadge status={file.processingStatus} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function ContentLibraryGrid({
  items,
  onSelect,
}: {
  items: ContentLibraryItem[];
  onSelect?: (item: ContentLibraryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No library items"
        description="Create reusable content before attaching it to activities."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ContentLibraryCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function ContentLibraryCard({
  item,
  onSelect,
}: {
  item: ContentLibraryItem;
  onSelect?: (item: ContentLibraryItem) => void;
}) {
  const Icon = itemTypeIcons[item.type] ?? FileText;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <StatusBadge value={item.type.toLowerCase()} />
      </div>
      <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
      {item.description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
      ) : null}
      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {onSelect ? (
        <button
          className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          onClick={() => onSelect(item)}
          type="button"
        >
          Attach
        </button>
      ) : null}
    </article>
  );
}

export function ContentLibraryTable({
  items,
}: {
  items: ContentLibraryItem[];
}) {
  return (
    <DataTable
      columns={["Title", "Type", "File", "Updated"]}
      rows={items.map((item) => [
        <span key="title" className="font-medium">
          {item.title}
        </span>,
        <span key="type">{item.type.toLowerCase()}</span>,
        <span key="file">{item.file?.originalFilename ?? "No file"}</span>,
        <span key="updated">{new Date(item.updatedAt).toLocaleDateString()}</span>,
      ])}
    />
  );
}

export function RichTextEditor({
  defaultValue,
  onSubmit,
}: {
  defaultValue?: string;
  onSubmit?: (
    value: string,
    payload: { html: string; text: string },
  ) => Promise<unknown>;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawHtml = editorRef.current?.innerHTML ?? "";
    const html = sanitizeRichTextHtml(rawHtml);
    const text = editorRef.current?.innerText.trim() ?? "";
    await onSubmit?.(text, { html, text });
  }

  function command(commandName: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(commandName, false, value);
  }

  function createLink() {
    const url = window.prompt("Paste a link URL");
    if (!url) return;
    command("createLink", url);
  }

  return (
    <form
      className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle"
      onSubmit={submit}
    >
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/50 p-2">
        <EditorButton label="Paragraph" onClick={() => command("formatBlock", "p")}>
          <Pilcrow aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
        <EditorButton label="Heading" onClick={() => command("formatBlock", "h2")}>
          <Heading2 aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
        <EditorButton label="Bold" onClick={() => command("bold")}>
          <Bold aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
        <EditorButton label="Italic" onClick={() => command("italic")}>
          <Italic aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
        <EditorButton label="Bullet list" onClick={() => command("insertUnorderedList")}>
          <List aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
        <EditorButton label="Link" onClick={createLink}>
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </EditorButton>
      </div>
      <div
        ref={editorRef}
        className="prose-scope min-h-52 w-full bg-card px-4 py-3 text-sm leading-6 outline-none"
        contentEditable
        dangerouslySetInnerHTML={{
          __html: sanitizeRichTextHtml(defaultValue ?? "<p></p>"),
        }}
        role="textbox"
        aria-label="Rich text content"
        suppressContentEditableWarning
      />
      {onSubmit ? (
        <div className="border-t border-border p-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            type="submit"
          >
            Save content
          </button>
        </div>
      ) : null}
    </form>
  );
}

function EditorButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function RichTextViewer({ children }: { children: ReactNode }) {
  return (
    <article className="min-h-full rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-7 lg:p-9">
      {children}
    </article>
  );
}

export function RichTextHtmlViewer({
  title,
  html,
  fallback,
}: {
  title: string;
  html?: string | null;
  fallback?: string | null;
}) {
  const safeHtml = sanitizeRichTextHtml(html ?? "");
  return (
    <RichTextViewer>
      <h2 className="text-xl font-semibold">{title}</h2>
      {safeHtml ? (
        <div
          className="prose-scope mt-5 text-base leading-7 text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-muted-foreground">
          {fallback ?? "No rich text content has been saved for this activity."}
        </p>
      )}
    </RichTextViewer>
  );
}

function toWebVttTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);
  return [hours, minutes, wholeSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
    .concat(`.${String(milliseconds).padStart(3, "0")}`);
}

function captionTrackToVtt(track: VideoCaptionTrack) {
  const body = track.cues
    .map(
      (cue, index) =>
        `${index + 1}\n${toWebVttTimestamp(cue.startSeconds)} --> ${toWebVttTimestamp(cue.endSeconds)}\n${cue.text.replace(/\r/g, "")}`,
    )
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}

export function VideoPlayer({
  title,
  src,
  tracks,
  onProgress,
  onRequestPictureInPicture,
}: {
  title: string;
  src?: string | null;
  tracks?: VideoCaptionTrack[];
  onProgress?: (currentTime: number, duration: number) => void;
  onRequestPictureInPicture?: () => void;
}) {
  const trackSources = useMemo(
    () =>
      (tracks ?? []).map((track) => ({
        ...track,
        src: URL.createObjectURL(
          new Blob([captionTrackToVtt(track)], { type: "text/vtt" }),
        ),
      })),
    [tracks],
  );

  useEffect(
    () => () => {
      for (const track of trackSources) {
        URL.revokeObjectURL(track.src);
      }
    },
    [trackSources],
  );

  const canUsePictureInPicture =
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled &&
    Boolean(onRequestPictureInPicture);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <div className="relative flex aspect-video items-center justify-center bg-muted">
        {src ? (
          <video
            className="h-full w-full"
            controls
            onTimeUpdate={(event) =>
              onProgress?.(
                event.currentTarget.currentTime,
                event.currentTarget.duration || 0,
              )
            }
            src={src}
          >
            {trackSources.map((track) => (
              <track
                default={track.isDefault}
                key={track.id}
                kind={track.kind === "SUBTITLE" ? "subtitles" : "captions"}
                label={track.label}
                src={track.src}
                srcLang={track.language}
              />
            ))}
          </video>
        ) : (
          <PlayCircle aria-hidden="true" className="h-14 w-14 text-primary" />
        )}
        {canUsePictureInPicture ? (
          <button
            className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background/90 px-2 text-xs font-semibold text-foreground shadow-subtle"
            onClick={(event) => {
              event.preventDefault();
              onRequestPictureInPicture?.();
            }}
            type="button"
          >
            <PictureInPicture aria-hidden="true" className="h-3.5 w-3.5" />
            PiP
          </button>
        ) : null}
      </div>
      <div className="p-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
    </section>
  );
}

export function PdfViewer({
  title,
  fileAccessUrl,
}: {
  title: string;
  fileAccessUrl?: string | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-muted text-center">
        <FileText aria-hidden="true" className="h-12 w-12 text-primary" />
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        {fileAccessUrl ? (
          <ButtonLink className="mt-4" href={fileAccessUrl} variant="secondary">
            Open file
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </ButtonLink>
        ) : (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            No downloadable file is attached yet.
          </p>
        )}
      </div>
    </section>
  );
}

export function ActivityContentRenderer({
  response,
  onVideoProgress,
}: {
  response: ActivityContentResponse;
  onVideoProgress?: (currentTime: number, duration: number) => void;
}) {
  const plugin = response.plugin;
  if (plugin && (!plugin.available || !plugin.enabled || plugin.placeholder)) {
    const label = plugin.name ?? plugin.key ?? response.activity.activityTypeKey;
    return (
      <section className="rounded-lg border border-warning/30 bg-card p-5 shadow-subtle">
        <h2 className="text-lg font-semibold">Activity unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {label} is not available for this organization. The saved content is
          kept, but it is not shown as active learning content.
        </p>
      </section>
    );
  }
  const type = response.activity.activityTypeKey;
  const content = response.content;
  const structured = content?.content ?? content?.body ?? {};
  const title = response.activity.title;
  const externalUrl =
    content?.externalUrl ??
    (typeof structured.url === "string" ? structured.url : undefined) ??
    (typeof structured.videoUrl === "string" ? structured.videoUrl : undefined);

  if (type === "core.video") {
    return (
      <VideoPlayer
        onProgress={onVideoProgress}
        src={externalUrl}
        title={title}
      />
    );
  }

  if (type === "core.file") {
    return (
      <PdfViewer fileAccessUrl={response.fileAccess?.url} title={title} />
    );
  }

  if (type === "core.link") {
    return (
      <ExternalLinkCard
        href={externalUrl ?? "#"}
        title={title}
        description={content?.textContent ?? "Open the linked resource."}
      />
    );
  }

  const html =
    typeof structured.html === "string"
      ? structured.html
      : typeof structured.body === "string" && structured.format === "rich_text_html"
        ? structured.body
        : null;

  return (
    <RichTextHtmlViewer
      fallback={
        content?.textContent ??
        (typeof structured.body === "string" ? structured.body : null)
      }
      html={html}
      title={title}
    />
  );
}

export function ExternalLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  const canLaunch = href !== "#";

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Link2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            External lab or resource
          </p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {canLaunch ? (
        <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            Launch in new tab
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted"
            onClick={() => void navigator.clipboard?.writeText(href)}
            type="button"
          >
            Copy link
            <Copy aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Use a new tab for dual-monitor work, or keep this lesson open
        side-by-side with notes and resources.
      </p>
    </article>
  );
}
