import { AlertTriangle, FileText, Puzzle } from "lucide-react";
import React from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ExternalLinkCard,
  PdfViewer,
  RichTextHtmlViewer,
  VideoPlayer,
} from "../content/content";
import { QuizActivityRenderer } from "../quiz/quiz";
import { StatusBadge } from "../ui/core";
import type { Activity, ActivityContentResponse } from "../../lib/lms-types";

type RendererProps = {
  response: ActivityContentResponse;
  onVideoProgress?: (currentTime: number, duration: number) => void;
  onRequestPictureInPicture?: () => void;
};

type EditorProps = {
  activity: Activity;
  children?: ReactNode;
};

const coreRenderers: Record<string, ComponentType<RendererProps>> = {
  "core.text": CoreTextRenderer,
  "core.video": CoreVideoRenderer,
  "core.file": CoreFileRenderer,
  "core.link": CoreLinkRenderer,
  "core.quiz": QuizActivityRenderer,
};

const coreEditors: Record<string, ComponentType<EditorProps>> = {
  "core.text": CoreActivityEditor,
  "core.video": CoreActivityEditor,
  "core.file": CoreActivityEditor,
  "core.link": CoreActivityEditor,
  "core.quiz": CoreActivityEditor,
};

export const PluginRendererRegistry = {
  get(activityTypeKey: string) {
    return coreRenderers[activityTypeKey] ?? UnknownActivityRenderer;
  },
  keys() {
    return Object.keys(coreRenderers);
  },
};

export const PluginEditorRegistry = {
  get(activityTypeKey: string) {
    return coreEditors[activityTypeKey] ?? UnsupportedActivityEditor;
  },
  keys() {
    return Object.keys(coreEditors);
  },
};

export const PluginAdminSettingsRegistry = {
  hasSettings(pluginKey: string) {
    return pluginKey.startsWith("core.");
  },
};

export function PluginActivityRenderer(props: RendererProps) {
  const plugin = props.response.plugin;
  if (plugin && (!plugin.available || !plugin.enabled || plugin.placeholder)) {
    return <UnavailableActivityRenderer {...props} />;
  }
  const Renderer = PluginRendererRegistry.get(
    props.response.activity.activityTypeKey,
  );
  return <Renderer {...props} />;
}

export function PluginActivityEditor({ activity, children }: EditorProps) {
  const Editor = PluginEditorRegistry.get(activity.activityTypeKey);
  return <Editor activity={activity}>{children}</Editor>;
}

function activityPayload(response: ActivityContentResponse) {
  const content = response.content;
  const structured = content?.content ?? content?.body ?? {};
  const externalUrl =
    content?.externalUrl ??
    (typeof structured.url === "string" ? structured.url : undefined) ??
    (typeof structured.videoUrl === "string" ? structured.videoUrl : undefined);

  return { content, structured, externalUrl };
}

function CoreTextRenderer({ response }: RendererProps) {
  const { content, structured } = activityPayload(response);
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
      title={response.activity.title}
    />
  );
}

function CoreVideoRenderer({
  response,
  onVideoProgress,
  onRequestPictureInPicture,
}: RendererProps) {
  const { externalUrl } = activityPayload(response);
  return (
    <VideoPlayer
      onRequestPictureInPicture={onRequestPictureInPicture}
      onProgress={onVideoProgress}
      src={externalUrl}
      title={response.activity.title}
    />
  );
}

function CoreFileRenderer({ response }: RendererProps) {
  return (
    <PdfViewer
      fileAccessUrl={response.fileAccess?.url}
      title={response.activity.title}
    />
  );
}

function CoreLinkRenderer({ response }: RendererProps) {
  const { content, externalUrl } = activityPayload(response);
  return (
    <ExternalLinkCard
      description={content?.textContent ?? "Open the linked resource."}
      href={externalUrl ?? "#"}
      title={response.activity.title}
    />
  );
}

function UnknownActivityRenderer({ response }: RendererProps) {
  return (
    <section className="rounded-lg border border-warning/30 bg-card p-5 shadow-subtle">
      <AlertTriangle aria-hidden="true" className="h-6 w-6 text-warning" />
      <h2 className="mt-4 text-lg font-semibold">
        Unsupported activity renderer
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This activity uses {response.activity.activityTypeKey}. The plugin is
        missing, disabled, or not implemented yet.
      </p>
    </section>
  );
}

function UnavailableActivityRenderer({ response }: RendererProps) {
  const plugin = response.plugin;
  const label = plugin?.name ?? plugin?.key ?? response.activity.activityTypeKey;
  const reason =
    plugin?.reason === "placeholder"
      ? "reserved for a future capability"
      : plugin?.reason === "disabled"
        ? "disabled for this organization"
        : "not available";
  return (
    <section className="rounded-lg border border-warning/30 bg-card p-5 shadow-subtle">
      <AlertTriangle aria-hidden="true" className="h-6 w-6 text-warning" />
      <h2 className="mt-4 text-lg font-semibold">Activity unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {label} is {reason}. This content is kept safely, but it is not shown as
        active learning content.
      </p>
    </section>
  );
}

function CoreActivityEditor({ activity, children }: EditorProps) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
        <StatusBadge value={activity.activityTypeKey} />
        <span className="text-sm font-medium">{activity.title}</span>
      </div>
      {children}
    </section>
  );
}

function UnsupportedActivityEditor({ activity }: EditorProps) {
  return (
    <section className="rounded-lg border border-warning/30 bg-warning/10 p-4">
      <Puzzle aria-hidden="true" className="h-5 w-5 text-warning" />
      <h3 className="mt-3 text-sm font-semibold">
        Activity editor unavailable
      </h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {activity.activityTypeKey} is reserved for a future plugin. It cannot be
        edited as active learning content yet.
      </p>
    </section>
  );
}
