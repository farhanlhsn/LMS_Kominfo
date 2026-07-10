import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ClipboardList,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  MonitorUp,
  PanelRight,
  PictureInPicture2,
  Play,
  Plus,
  Puzzle,
  Send,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useCallback, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ExternalLinkCard,
  PdfViewer,
  RichTextHtmlViewer,
  VideoPlayer,
} from "../content/content";
import { AssignmentActivityRenderer } from "../assignments/assignment";
import { CodeEditor } from "../code-runner/code-editor";
import { H5PLauncher, ScormLauncher } from "../experiences/experiences-views";
import { QuizActivityRenderer } from "../quiz/quiz";
import { ThreeDViewer } from "../content-3d/three-d-viewer";
import { StatusBadge } from "../ui/core";
import { useExecuteCode, useJudgeCode, useCodeSubmissions, useThreeDAssets, useCreateThreeDAsset } from "../../lib/api-hooks";
import type {
  Activity,
  ActivityContentResponse,
  CodeJudgeResult,
  CodeLanguage,
  ThreeDAssetRecord,
  ThreeDFormat,
  VideoCaptionTrack,
} from "../../lib/lms-types";

type RendererProps = {
  response: ActivityContentResponse;
  videoTracks?: VideoCaptionTrack[];
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
  "plugin.3d_viewer": ThreeDPluginRenderer,
  "plugin.code_runner": CodeRunnerPluginRenderer,
  "plugin.h5p": H5PPluginRenderer,
  "plugin.scorm": ScormPluginRenderer,
};

const coreEditors: Record<string, ComponentType<EditorProps>> = {
  "core.text": CoreActivityEditor,
  "core.video": CoreActivityEditor,
  "core.file": CoreActivityEditor,
  "core.link": CoreActivityEditor,
  "core.quiz": CoreActivityEditor,
  "core.assignment": CoreActivityEditor,
  "plugin.3d_viewer": ThreeDActivityEditor,
  "plugin.code_runner": CodeRunnerActivityEditor,
  "plugin.h5p": CoreActivityEditor,
  "plugin.scorm": CoreActivityEditor,
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
    return pluginKey.startsWith("core.") || pluginKey.startsWith("plugin.");
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
  videoTracks,
  onVideoProgress,
  onRequestPictureInPicture,
}: RendererProps) {
  const { externalUrl } = activityPayload(response);
  return (
    <VideoPlayer
      onRequestPictureInPicture={onRequestPictureInPicture}
      onProgress={onVideoProgress}
      src={externalUrl}
      tracks={videoTracks}
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

function ThreeDPluginRenderer({ response }: RendererProps) {
  const asset = resolveThreeDAsset(response);
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Box aria-hidden="true" className="h-4 w-4 text-primary" />
        <StatusBadge value="3D viewer" tone="info" />
        <span className="text-sm font-medium">{response.activity.title}</span>
      </div>
      <ThreeDViewer asset={asset} />
    </section>
  );
}

function CodeRunnerPluginRenderer({ response }: RendererProps) {
  const { content, structured } = activityPayload(response);
  const instructions =
    content?.textContent ??
    readString(structured.instructions) ??
    readString(structured.prompt) ??
    "Write and run code for this exercise.";
  const initialCode =
    readString(structured.starterCode) ??
    readString(structured.initialCode) ??
    readString(structured.code) ??
    "";
  const language = readCodeLanguage(structured.language);
  const assignmentId = readString(structured.assignmentId) ?? readString(structured.assignment_id);

  const judgeCode = useJudgeCode();
  const submissionsQuery = useCodeSubmissions(assignmentId ? { assignmentId } : {});

  const [code, setCode] = useState(initialCode);
  const [lang, setLang] = useState<CodeLanguage>(language);
  const [testCases, setTestCases] = useState<Array<{ name: string; input: string; expectedOutput: string }>>([
    { name: "Test 1", input: "", expectedOutput: "" },
  ]);
  const [judgeResult, setJudgeResult] = useState<CodeJudgeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"editor" | "history">("editor");

  const addTestCase = () =>
    setTestCases((tc) => [...tc, { name: `Test ${tc.length + 1}`, input: "", expectedOutput: "" }]);

  const removeTestCase = (i: number) =>
    setTestCases((tc) => tc.filter((_, idx) => idx !== i));

  const updateTestCase = (i: number, field: "name" | "input" | "expectedOutput", value: string) =>
    setTestCases((tc) => tc.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  async function handleJudge() {
    if (!assignmentId) return;
    const valid = testCases.filter((tc) => tc.expectedOutput.trim());
    if (!valid.length) return;
    setBusy(true);
    setJudgeResult(null);
    try {
      const result = await judgeCode({
        assignmentId,
        language: lang,
        code,
        testCases: valid.map((tc) => ({ name: tc.name, input: tc.input || undefined, expectedOutput: tc.expectedOutput })),
      });
      setJudgeResult(result);
      await submissionsQuery.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Problem statement */}
      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-primary">
          <Code2 className="h-5 w-5" aria-hidden="true" />
          <StatusBadge value="Code exercise" tone="info" />
        </div>
        <h2 className="mt-2 text-lg font-semibold">{response.activity.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{instructions}</p>
      </article>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["editor", "history"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "editor" ? "Code Editor" : "Submission History"}
          </button>
        ))}
      </div>

      {tab === "editor" && (
        <div className="flex flex-col gap-4">
          {/* Monaco editor */}
          <CodeEditor
            initialCode={code}
            initialLanguage={lang}
            onCodeChange={setCode}
            onLanguageChange={setLang}
            height={360}
          />

          {/* Test cases */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 pb-3">
              <h3 className="text-sm font-semibold">Test cases</h3>
              <button type="button" onClick={addTestCase}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {testCases.map((tc, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="h-7 flex-1 rounded border border-border bg-card px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      value={tc.name}
                      onChange={(e) => updateTestCase(i, "name", e.target.value)}
                      placeholder="Test case name"
                    />
                    {testCases.length > 1 && (
                      <button type="button" onClick={() => removeTestCase(i)}
                        className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Input (stdin)</p>
                      <textarea
                        className="h-16 w-full rounded border border-border bg-card px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        value={tc.input}
                        onChange={(e) => updateTestCase(i, "input", e.target.value)}
                        placeholder="(optional)"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Expected output <span className="text-destructive">*</span></p>
                      <textarea
                        className="h-16 w-full rounded border border-border bg-card px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                        placeholder="Expected output"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {assignmentId ? (
              <button type="button" onClick={handleJudge} disabled={busy}
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
                {busy ? "Judging…" : "Submit & Judge"}
              </button>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Configure an assignment ID in the activity content to enable graded submission.</p>
            )}
          </div>

          {/* Judge result */}
          {judgeResult && (
            <div className={`rounded-xl border p-5 ${judgeResult.status === "PASSED" ? "border-emerald-300 bg-emerald-50" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-center gap-3">
                {judgeResult.status === "PASSED"
                  ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  : <XCircle className="h-6 w-6 text-destructive" />}
                <div>
                  <p className="font-semibold">{judgeResult.status === "PASSED" ? "All tests passed!" : "Some tests failed"}</p>
                  <p className="text-sm text-muted-foreground">Score: {judgeResult.score.toFixed(0)}%</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {judgeResult.results.map((r) => (
                  <div key={r.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${r.passed ? "border-emerald-200 bg-emerald-50/50" : "border-destructive/20 bg-destructive/5"}`}>
                    <div className="flex items-center gap-2">
                      {r.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="font-medium">{r.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-2">
          {submissionsQuery.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !submissionsQuery.data?.length ? (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            submissionsQuery.data.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase">{sub.language}</span>
                    <StatusBadge
                      value={sub.status}
                      tone={sub.status === "PASSED" ? "success" : sub.status === "FAILED" ? "danger" : "neutral"}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(sub.createdAt).toLocaleString()}</span>
                </div>
                {sub.score != null && (
                  <span className={`text-sm font-bold ${sub.score >= 100 ? "text-emerald-600" : sub.score >= 50 ? "text-amber-600" : "text-destructive"}`}>
                    {sub.score.toFixed(0)}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function H5PPluginRenderer({ response }: RendererProps) {
  const { structured } = activityPayload(response);
  return (
    <H5PLauncher
      library={
        readString(structured.library) ??
        readString(structured.h5pLibrary) ??
        "H5P.InteractiveContent"
      }
      title={response.activity.title}
    />
  );
}

function ScormPluginRenderer({ response }: RendererProps) {
  const { externalUrl, structured } = activityPayload(response);
  return (
    <ScormLauncher
      entryUrl={externalUrl ?? readString(structured.entryUrl)}
      title={response.activity.title}
      version={readString(structured.version) ?? "1.2"}
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readCodeLanguage(value: unknown): CodeLanguage {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  return [
    "PYTHON",
    "JAVASCRIPT",
    "TYPESCRIPT",
    "GO",
    "RUST",
    "JAVA",
    "CPP",
    "RUBY",
    "PHP",
  ].includes(normalized)
    ? (normalized as CodeLanguage)
    : "PYTHON";
}

function readThreeDFormat(value: unknown, url?: string): ThreeDFormat {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  if (["GLB", "GLTF", "FBX", "OBJ"].includes(normalized)) {
    return normalized as ThreeDFormat;
  }
  const lowerUrl = url?.toLowerCase() ?? "";
  if (lowerUrl.endsWith(".gltf")) return "GLTF";
  if (lowerUrl.endsWith(".fbx")) return "FBX";
  if (lowerUrl.endsWith(".obj")) return "OBJ";
  return "GLB";
}

function resolveThreeDAsset(response: ActivityContentResponse): ThreeDAssetRecord | null {
  const { content, structured, externalUrl } = activityPayload(response);
  const asset = asRecord(structured.asset) ?? asRecord(content?.metadata?.asset) ?? structured;
  const url =
    readString(asset.url) ??
    readString(asset.assetUrl) ??
    response.fileAccess?.url ??
    externalUrl;

  if (!url) return null;

  return {
    id: readString(asset.id) ?? response.activity.id,
    organizationId: readString(asset.organizationId) ?? "activity-content",
    name:
      readString(asset.name) ??
      readString(asset.title) ??
      response.activity.title,
    format: readThreeDFormat(asset.format, url),
    sizeBytes: readNumber(asset.sizeBytes) ?? 0,
    url,
    thumbnailUrl:
      readString(asset.thumbnailUrl) ?? readString(asset.thumbnail) ?? null,
    uploadedBy: readString(asset.uploadedBy) ?? "activity-content",
    createdAt:
      readString(asset.createdAt) ?? readString(asset.uploadedAt) ?? new Date(0).toISOString(),
  };
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

function ThreeDActivityEditor({ activity, children }: EditorProps) {
  const assetsQuery = useThreeDAssets();
  const createAsset = useCreateThreeDAsset();
  const [form, setForm] = useState({ name: "", format: "GLB" as "GLB" | "GLTF" | "FBX" | "OBJ", url: "", thumbnailUrl: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<import("../../lib/lms-types").ThreeDAssetRecord | null>(null);

  const assets: import("../../lib/lms-types").ThreeDAssetRecord[] = assetsQuery.data ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const asset = await createAsset({ name: form.name, format: form.format, url: form.url, thumbnailUrl: form.thumbnailUrl || undefined });
      setMsg(`Asset "${asset.name}" created. Save activity content with the asset URL.`);
      await assetsQuery.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Box aria-hidden="true" className="h-4 w-4 text-primary" />
        <StatusBadge value="3D viewer" tone="info" />
        <span className="text-sm font-medium">{activity.title}</span>
      </div>

      {/* Asset library */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Asset library</h3>
        {assets.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No 3D assets uploaded yet.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {assets.map((a) => (
              <button key={a.id} type="button" onClick={() => setPreview(preview?.id === a.id ? null : a)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${preview?.id === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                {a.thumbnailUrl
                  ? <img src={a.thumbnailUrl} alt={a.name} className="h-12 w-12 rounded object-cover" />
                  : <div className="flex h-12 w-12 items-center justify-center rounded bg-muted"><Box className="h-6 w-6 text-muted-foreground" /></div>}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.format} · {(a.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {preview && (
          <div className="mt-4">
            <ThreeDViewer asset={preview} height={280} />
          </div>
        )}
      </div>

      {/* Upload / register new asset */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Register new 3D asset</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Provide a URL to a hosted GLB/GLTF/FBX/OBJ file.</p>
        {msg && <p className="mt-2 rounded bg-muted px-3 py-1.5 text-xs">{msg}</p>}
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Name
            <input required className="mt-1 h-8 w-full rounded border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="text-xs font-medium">
            Format
            <select className="mt-1 h-8 w-full rounded border border-border bg-card px-2 text-xs focus:outline-none"
              value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as any }))}>
              {["GLB", "GLTF", "FBX", "OBJ"].map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Asset URL <span className="text-destructive">*</span>
            <input required type="url" className="mt-1 h-8 w-full rounded border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…/model.glb" />
          </label>
          <label className="text-xs font-medium sm:col-span-2">
            Thumbnail URL (optional)
            <input type="url" className="mt-1 h-8 w-full rounded border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.thumbnailUrl} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://…/thumb.jpg" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              Register asset
            </button>
          </div>
        </form>
      </div>

      {children}
    </section>
  );
}

function CodeRunnerActivityEditor({ activity, children }: EditorProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Code2 aria-hidden="true" className="h-4 w-4 text-primary" />
        <StatusBadge value="Code runner" tone="info" />
        <span className="text-sm font-medium">{activity.title}</span>
      </div>
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Code runner activity setup</p>
        <p className="mt-1 text-xs">In the Content tab, set the following in the text field or external URL:</p>
        <ul className="mt-2 list-disc pl-4 text-xs space-y-1">
          <li><code className="rounded bg-muted px-1">instructions</code> — problem description shown to learners</li>
          <li><code className="rounded bg-muted px-1">starterCode</code> — optional pre-filled code template</li>
          <li><code className="rounded bg-muted px-1">language</code> — default language (PYTHON, JAVASCRIPT, etc.)</li>
          <li><code className="rounded bg-muted px-1">assignmentId</code> — link to an assignment to enable graded submission</li>
        </ul>
        <p className="mt-2 text-xs">Store these as a JSON object in the activity content field.</p>
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
