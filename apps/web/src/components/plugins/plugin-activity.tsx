import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  MonitorUp,
  PanelRight,
  PictureInPicture2,
  Puzzle,
  Smartphone,
} from "lucide-react";
import React from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ExternalLinkCard,
  PdfViewer,
  RichTextHtmlViewer,
  VideoPlayer,
} from "../content/content";
import { AssignmentActivityRenderer } from "../assignments/assignment";
import { QuizActivityRenderer } from "../quiz/quiz";
import { StatusBadge } from "../ui/core";
import type { Activity, ActivityContentResponse } from "../../lib/lms-types";

type RendererProps = {
  response: ActivityContentResponse;
  onVideoProgress?: (currentTime: number, duration: number) => void;
  onRequestPictureInPicture?: () => void;
  onLabLaunchStateChange?: (launched: boolean) => void;
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
  "core.assignment": AssignmentActivityRenderer,
};

const coreEditors: Record<string, ComponentType<EditorProps>> = {
  "core.text": CoreActivityEditor,
  "core.video": CoreActivityEditor,
  "core.file": CoreActivityEditor,
  "core.link": CoreActivityEditor,
  "core.quiz": CoreActivityEditor,
  "core.assignment": CoreActivityEditor,
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
  return <Renderer key={props.response.activity.id} {...props} />;
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

function CoreLinkRenderer({
  response,
  onRequestPictureInPicture,
  onLabLaunchStateChange,
}: RendererProps) {
  const { content, externalUrl } = activityPayload(response);
  const lab = getPracticeLabConfig(response);

  if (lab.enabled) {
    return (
      <PracticeLabLauncher
        description={content?.textContent ?? "Open the linked lab resource."}
        href={externalUrl ?? lab.url ?? "#"}
        lab={lab}
        onLaunchStateChange={onLabLaunchStateChange}
        onRequestPictureInPicture={onRequestPictureInPicture}
        title={response.activity.title}
      />
    );
  }

  return (
    <ExternalLinkCard
      description={content?.textContent ?? "Open the linked resource."}
      href={externalUrl ?? "#"}
      title={response.activity.title}
    />
  );
}

type PracticeLabConfig = {
  enabled: boolean;
  providerName?: string;
  url?: string;
  videoUrl?: string;
  videoTitle?: string;
  instructions: string[];
  sideBySideNote?: string;
  pipNote?: string;
  dualMonitorNote?: string;
};

function getPracticeLabConfig(response: ActivityContentResponse): PracticeLabConfig {
  const content = response.content;
  const structured = asRecord(content?.content) ?? asRecord(content?.body);
  const metadata = asRecord(content?.metadata);
  const lab =
    asRecord(metadata?.lab) ??
    asRecord(structured?.lab) ??
    (metadata?.practiceLab === true || structured?.practiceLab === true
      ? {}
      : null);

  if (!lab) {
    return { enabled: false, instructions: [] };
  }

  return {
    enabled: lab.enabled !== false,
    providerName: readString(lab.providerName),
    url: readString(lab.url),
    videoUrl: readString(lab.videoUrl) ?? readString(structured?.videoUrl),
    videoTitle: readString(lab.videoTitle),
    instructions: readStringArray(lab.instructions),
    sideBySideNote: readString(lab.sideBySideNote),
    pipNote: readString(lab.pipNote),
    dualMonitorNote: readString(lab.dualMonitorNote),
  };
}

export function isPracticeLabActivity(response: ActivityContentResponse) {
  return (
    response.activity.activityTypeKey === "core.link" &&
    getPracticeLabConfig(response).enabled
  );
}

function PracticeLabLauncher({
  title,
  href,
  description,
  lab,
  onLaunchStateChange,
  onRequestPictureInPicture,
}: {
  title: string;
  href: string;
  description: string;
  lab: PracticeLabConfig;
  onLaunchStateChange?: (launched: boolean) => void;
  onRequestPictureInPicture?: () => void;
}) {
  const [selectedMode, setSelectedMode] = React.useState<
    "side-by-side" | "pip" | "dual-monitor" | null
  >(null);
  const canLaunch = href !== "#";
  const providerName = lab.providerName ?? "External lab";
  const instructions =
    lab.instructions.length > 0
      ? lab.instructions
      : ["Open the lab resource.", "Keep this lesson available while practicing."];

  function openLab(mode: "side-by-side" | "pip" | "dual-monitor") {
    if (!canLaunch || typeof window === "undefined") return;

    if (mode === "pip") {
      setSelectedMode(mode);
      onLaunchStateChange?.(true);
      return;
    }

    setSelectedMode(mode);
    onLaunchStateChange?.(true);

    if (mode === "side-by-side") {
      const width = Math.max(720, Math.floor(window.screen.availWidth * 0.48));
      const height = Math.max(640, Math.floor(window.screen.availHeight * 0.9));
      const left = Math.max(0, window.screen.availWidth - width - 24);
      window.open(
        href,
        "lms-practice-lab",
        `popup=yes,noopener,noreferrer,width=${width},height=${height},left=${left},top=40`,
      );
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }

  if (!selectedMode) {
    return (
      <LabModeChooser
        canLaunch={canLaunch}
        lab={lab}
        onSelect={openLab}
        title={title}
      />
    );
  }

  return (
    <section className="grid gap-4">
      {lab.videoUrl ? (
        <VideoPlayer
          onRequestPictureInPicture={onRequestPictureInPicture}
          src={lab.videoUrl}
          title={lab.videoTitle ?? `${title} guide`}
        />
      ) : null}

      {selectedMode === "pip" ? (
        <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-subtle">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Continue with PiP</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Start the companion video, activate PiP, then open the lab. Browsers require these as separate actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                onClick={onRequestPictureInPicture}
                type="button"
              >
                <PictureInPicture2 aria-hidden="true" className="h-4 w-4" />
                1. Activate PiP
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
                type="button"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                2. Open lab
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <article className="rounded-lg border border-border bg-card p-5 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Practice lab
            </p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:bg-muted"
              onClick={() => {
                setSelectedMode(null);
                onLaunchStateChange?.(false);
              }}
              type="button"
            >
              Change mode
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:bg-muted"
              disabled={!canLaunch}
              onClick={() => void navigator.clipboard?.writeText(href)}
              type="button"
            >
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy link
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Before you launch</h3>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
              {instructions.map((item, index) => (
                <li className="flex gap-2" key={`${item}-${index}`}>
                  <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground md:hidden">
          <Smartphone aria-hidden="true" className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            On mobile, use New tab + PiP when the browser supports it, or open
            the lab and return here from your recent apps.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{providerName}</span>
        </div>
      </article>
    </section>
  );
}

function LabModeChooser({
  title,
  canLaunch,
  lab,
  onSelect,
}: {
  title: string;
  canLaunch: boolean;
  lab: PracticeLabConfig;
  onSelect: (mode: "side-by-side" | "pip" | "dual-monitor") => void;
}) {
  return (
    <section className="w-full rounded-lg border border-border bg-card p-5 shadow-subtle sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MonitorUp aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Practice lab
        </p>
        <h2 className="mt-1 text-xl font-semibold">Choose how you want to learn</h2>
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <LabLaunchOption
          description={lab.sideBySideNote ?? "Keep the lesson and lab next to each other on one desktop screen."}
          disabled={!canLaunch}
          icon={<PanelRight aria-hidden="true" className="h-5 w-5" />}
          label="Side by side"
          onClick={() => onSelect("side-by-side")}
        />
        <LabLaunchOption
          description={lab.pipNote ?? "Open the lab in a new tab while the companion video floats above it."}
          disabled={!canLaunch}
          icon={<PictureInPicture2 aria-hidden="true" className="h-5 w-5" />}
          label="New tab + PiP"
          onClick={() => onSelect("pip")}
        />
        <LabLaunchOption
          description={lab.dualMonitorNote ?? "Open the lab in a new tab and move it to your second monitor."}
          disabled={!canLaunch}
          icon={<ExternalLink aria-hidden="true" className="h-5 w-5" />}
          label="Dual monitor"
          onClick={() => onSelect("dual-monitor")}
        />
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground md:hidden">
        <Smartphone aria-hidden="true" className="mt-0.5 h-4 w-4 text-primary" />
        <p>On mobile, New tab + PiP is recommended when supported. Otherwise, switch between the lab and lesson from recent apps.</p>
      </div>
    </section>
  );
}

function LabLaunchOption({
  icon,
  label,
  description,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-36 rounded-md border border-border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="mt-3 block text-sm font-semibold">{label}</span>
      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
