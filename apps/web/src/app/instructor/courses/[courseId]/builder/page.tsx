"use client";

import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen, ChevronDown, ChevronRight,
  FilePlus, FolderPlus, Save, Send, Sparkles,
  Trash2, Video,
} from "lucide-react";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { RichTextEditor } from "../../../../../components/content/content";
import { AppShell } from "../../../../../components/layout/shells";
import { PluginActivityEditor } from "../../../../../components/plugins/plugin-activity";
import { AiApprovalQueue } from "../../../../../components/advanced-assignment/ai-approval-queue";
import { CaptionCueEditor } from "../../../../../components/advanced-assignment/caption-cue-editor";
import { ButtonLink, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { CoursePhaseNavigation } from "../../../../../components/engagement/engagement";
import { api } from "../../../../../lib/api-client";
import {
  useContentLibrary, useCreateInstructorCaptionTrack,
  useDeleteInstructorCaptionTrack, useFiles,
  useGenerateInstructorVideoQuiz, useGenerateInstructorVideoSummary,
  useInstructorAiGeneratedItems, useInstructorCaptionTracks,
  useInstructorCourse, useInstructorQuizzes, usePluginActivityTypes,
  useSession, useUpdateInstructorCaptionTrack,
} from "../../../../../lib/api-hooks";
import { hasPermission } from "../../../../../lib/authz";
import type { Activity, Course, CourseModule, Lesson, VideoCaptionTrack } from "../../../../../lib/lms-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Selection =
  | { type: "module"; id: string }
  | { type: "lesson"; id: string; moduleId: string }
  | { type: "activity"; id: string; lessonId: string }
  | null;

// ─── Curriculum tree ─────────────────────────────────────────────────────────

function ModuleTreeItem({
  mod, idx, selection, onSelect, onAddLesson, onAddActivity,
}: {
  mod: CourseModule; idx: number; selection: Selection;
  onSelect: (s: Selection) => void;
  onAddLesson: (moduleId: string) => void;
  onAddActivity: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selection?.type === "module" && selection.id === mod.id;
  return (
    <div>
      <div className={`group flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/10" : ""}`}
        onClick={() => onSelect({ type: "module", id: mod.id })}>
        <button type="button" className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm font-medium">{idx + 1}. {mod.title}</span>
        <button type="button" title="Add lesson"
          onClick={(e) => { e.stopPropagation(); onAddLesson(mod.id); }}
          className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:block">
          <FilePlus className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && mod.lessons.map((lesson, li) => (
        <LessonTreeItem key={lesson.id} lesson={lesson} lessonIdx={li} moduleId={mod.id}
          selection={selection} onSelect={onSelect} onAddActivity={onAddActivity} />
      ))}
    </div>
  );
}

function LessonTreeItem({
  lesson, lessonIdx, moduleId, selection, onSelect, onAddActivity,
}: {
  lesson: Lesson; lessonIdx: number; moduleId: string; selection: Selection;
  onSelect: (s: Selection) => void;
  onAddActivity: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = selection?.type === "lesson" && selection.id === lesson.id;
  return (
    <div>
      <div className={`group flex items-center gap-1 py-1.5 pl-7 pr-3 cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/10" : ""}`}
        onClick={() => onSelect({ type: "lesson", id: lesson.id, moduleId })}>
        <button type="button" className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
          {lesson.activities.length > 0
            ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)
            : <span className="h-3 w-3" />}
        </button>
        <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs">{lessonIdx + 1}. {lesson.title}</span>
        <button type="button" title="Add activity"
          onClick={(e) => { e.stopPropagation(); onAddActivity(lesson.id); }}
          className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:block">
          <FilePlus className="h-3 w-3" />
        </button>
      </div>
      {open && lesson.activities.map((act, ai) => {
        const isActSelected = selection?.type === "activity" && selection.id === act.id;
        return (
          <div key={act.id}
            className={`flex items-center gap-2 py-1 pl-14 pr-3 cursor-pointer hover:bg-muted/50 text-xs ${isActSelected ? "bg-primary/10 font-medium" : "text-muted-foreground"}`}
            onClick={() => onSelect({ type: "activity", id: act.id, lessonId: lesson.id })}>
            <span className="truncate">{ai + 1}. {act.title}</span>
            <StatusBadge value={act.activityTypeKey.replace("core.", "").replace("plugin.", "")} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Selection helpers ────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {badge && <StatusBadge value={badge} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

const INPUT = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const TEXTAREA = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// ─── Course overview panel ────────────────────────────────────────────────────

function CourseOverviewPanel({ course, canUpdate, canPublish, onAction }: {
  course: Course; canUpdate: boolean; canPublish: boolean;
  onAction: (action: () => Promise<unknown>, msg: string) => void;
}) {
  const totalActivities = course.modules?.flatMap((m) => m.lessons.flatMap((l) => l.activities)).length ?? 0;
  const totalLessons = course.modules?.flatMap((m) => m.lessons).length ?? 0;
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <PanelHeader title="Course overview" subtitle="Select an item in the curriculum tree to edit it." badge={course.status} />
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Modules", value: course.modules?.length ?? 0 },
          { label: "Lessons", value: totalLessons },
          { label: "Activities", value: totalActivities },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {canPublish && course.status !== "PUBLISHED" && (
          <button type="button"
            onClick={() => void onAction(() => api.publishCourse(course.id), "Course published.")}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Send className="h-4 w-4" /> Publish course
          </button>
        )}
        {canPublish && (
          <button type="button"
            onClick={() => void onAction(() => api.archiveCourse(course.id), "Course archived.")}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Archive
          </button>
        )}
        <ButtonLink href={`/instructor/courses/${course.id}/edit`} variant="secondary">Edit profile</ButtonLink>
      </div>
    </div>
  );
}

// ─── Module edit panel ────────────────────────────────────────────────────────

function ModuleEditPanel({ course, moduleId, onSave, onDelete }: {
  course: Course; moduleId: string;
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const mod = course.modules?.find((m) => m.id === moduleId);
  if (!mod) return <EmptyState title="Module not found" />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSave(mod!.id, {
      title: String(d.get("title") ?? ""),
      description: String(d.get("description") ?? ""),
      isPublished: d.get("isPublished") === "on",
    });
  }

  return (
    <div className="max-w-xl">
      <PanelHeader title={`Module: ${mod.title}`} subtitle={`${mod.lessons.length} lesson${mod.lessons.length !== 1 ? "s" : ""}`} badge={mod.isPublished ? "published" : "draft"} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Title">
          <input name="title" defaultValue={mod.title} required minLength={2} className={INPUT} />
        </Field>
        <Field label="Description">
          <input name="description" defaultValue={mod.description ?? ""} className={INPUT} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={mod.isPublished} className="h-4 w-4" />
          Published
        </label>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" /> Save module
          </button>
          <button type="button"
            onClick={() => { if (window.confirm("Delete this module and all its lessons?")) onDelete(mod.id); }}
            className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 inline h-4 w-4" /> Delete
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Lesson edit panel ───────────────────────────────────────────────────────

function LessonEditPanel({ course, lessonId, onSave, onDelete }: {
  course: Course; lessonId: string;
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const lesson = course.modules?.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  if (!lesson) return <EmptyState title="Lesson not found" />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSave(lesson!.id, {
      title: String(d.get("title") ?? ""),
      summary: String(d.get("summary") ?? ""),
      estimatedMinutes: Number(d.get("estimatedMinutes") ?? 0),
      isPublished: d.get("isPublished") === "on",
      isPreview: d.get("isPreview") === "on",
    });
  }

  return (
    <div className="max-w-xl">
      <PanelHeader
        title={`Lesson: ${lesson.title}`}
        subtitle={`${lesson.activities.length} activit${lesson.activities.length !== 1 ? "ies" : "y"}`}
        badge={lesson.isPublished ? "published" : "draft"}
      />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Title">
          <input name="title" defaultValue={lesson.title} required minLength={2} className={INPUT} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Summary">
            <input name="summary" defaultValue={lesson.summary ?? ""} className={INPUT} />
          </Field>
          <Field label="Estimated minutes">
            <input name="estimatedMinutes" type="number" min={0}
              defaultValue={lesson.estimatedMinutes ?? 0} className={INPUT} />
          </Field>
        </div>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={lesson.isPublished} className="h-4 w-4" />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPreview" defaultChecked={Boolean(lesson.isPreview)} className="h-4 w-4" />
            Free preview
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" /> Save lesson
          </button>
          <button type="button"
            onClick={() => { if (window.confirm("Delete this lesson and all its activities?")) onDelete(lesson.id); }}
            className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 inline h-4 w-4" /> Delete
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Activity edit panel ──────────────────────────────────────────────────────

function ActivityEditPanel({
  activity, fileOptions, libraryOptions, quizOptions, activityTypes,
  onSave, onDelete, onSaveContent, onAttachFile, onAttachLibrary, onAttachQuiz,
}: {
  activity: Activity;
  fileOptions: Array<{ id: string; originalFilename: string }>;
  libraryOptions: Array<{ id: string; title: string }>;
  quizOptions: Array<{ id: string; title: string; status: string }>;
  activityTypes: Array<{ key: string; name: string; implemented?: boolean }>;
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onSaveContent: (id: string, data: Record<string, unknown>) => void;
  onAttachFile: (id: string, fileId: string) => void;
  onAttachLibrary: (id: string, libId: string) => void;
  onAttachQuiz: (id: string, quizId: string) => void;
}) {
  const [tab, setTab] = useState<"settings" | "content">("content");
  const [selectedType, setSelectedType] = useState(activity.activityTypeKey);

  async function submitSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSave(activity.id, {
      title: String(d.get("title") ?? ""),
      description: String(d.get("description") ?? ""),
      isRequired: d.get("isRequired") === "on",
      isPublished: d.get("isPublished") === "on",
      activityTypeKey: selectedType,
    });
  }

  return (
    <div className="max-w-3xl">
      <PanelHeader
        title={activity.title}
        subtitle={activity.activityTypeKey}
        badge={activity.isPublished ? "published" : "draft"}
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["content", "settings"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <form onSubmit={submitSettings} className="flex flex-col gap-4">
          <Field label="Title">
            <input name="title" defaultValue={activity.title} required minLength={2} className={INPUT} />
          </Field>
          <Field label="Description">
            <input name="description" defaultValue={activity.description ?? ""} className={INPUT} />
          </Field>
          <Field label="Activity type">
            <p className="text-xs text-muted-foreground">Pilih tipe lalu klik Save settings.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(activityTypes.length ? activityTypes.filter((t) => t.implemented !== false) : [
                { key: "core.text", name: "Text" }, { key: "core.video", name: "Video" },
                { key: "core.file", name: "File" }, { key: "core.link", name: "Link" },
              ]).map((at) => (
                <button key={at.key} type="button"
                  onClick={() => setSelectedType(at.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    at.key === selectedType
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}>
                  {at.name}
                  {at.key === activity.activityTypeKey && at.key !== selectedType ? " (current)" : ""}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isRequired" defaultChecked={activity.isRequired} className="h-4 w-4" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublished" defaultChecked={activity.isPublished} className="h-4 w-4" />
              Published
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" /> Save settings
            </button>
            <button type="button"
              onClick={() => { if (window.confirm("Delete this activity?")) onDelete(activity.id); }}
              className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-1.5 inline h-4 w-4" /> Delete
            </button>
          </div>
        </form>
      )}

      {tab === "content" && (
        <ActivityContentPanel
          activity={activity}
          fileOptions={fileOptions}
          libraryOptions={libraryOptions}
          quizOptions={quizOptions}
          onSaveContent={onSaveContent}
          onAttachFile={onAttachFile}
          onAttachLibrary={onAttachLibrary}
          onAttachQuiz={onAttachQuiz}
        />
      )}
    </div>
  );
}

// ─── Video enhancements panel ─────────────────────────────────────────────────

function VideoEnhancementsPanel({ activity }: { activity: Activity }) {
  const captionTracks = useInstructorCaptionTracks(activity.id);
  const generatedItems = useInstructorAiGeneratedItems(activity.id);
  const createCaption = useCreateInstructorCaptionTrack();
  const updateCaption = useUpdateInstructorCaptionTrack();
  const deleteCaption = useDeleteInstructorCaptionTrack();
  const generateSummary = useGenerateInstructorVideoSummary();
  const generateQuiz = useGenerateInstructorVideoQuiz();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [captionContent, setCaptionContent] = useState("");
  const [captionLang, setCaptionLang] = useState("en");
  const [captionLabel, setCaptionLabel] = useState("English captions");
  const [captionDefault, setCaptionDefault] = useState(true);
  const [syncTranscript, setSyncTranscript] = useState(true);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  async function doRun(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setMsg(null);
    try { await action(); setMsg(success); await Promise.all([captionTracks.reload(), generatedItems.reload()]); }
    catch (err) { setMsg(err instanceof Error ? err.message : "Error"); }
    finally { setBusy(null); }
  }

  async function submitCaption(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await doRun("caption", () => createCaption(activity.id, {
      label: captionLabel, language: captionLang, rawContent: captionContent,
      source: "UPLOAD", isDefault: captionDefault, syncTranscript,
    }), "Caption track saved.");
    setCaptionContent("");
  }

  const defaultLang = captionTracks.data?.find((t) => t.isDefault)?.language
    ?? captionTracks.data?.[0]?.language ?? captionLang;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-5">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Video className="h-4 w-4 text-primary" /> Advanced video
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Upload captions and generate AI draft summaries or quizzes.</p>
      </div>

      {/* Caption upload form */}
      <form onSubmit={submitCaption} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add caption track</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Label">
            <input className={INPUT} value={captionLabel} onChange={(e) => setCaptionLabel(e.target.value)} />
          </Field>
          <Field label="Language code">
            <input className={INPUT} value={captionLang} onChange={(e) => setCaptionLang(e.target.value)} placeholder="en" />
          </Field>
        </div>
        <Field label="VTT / SRT content">
          <textarea className={`min-h-32 font-mono text-xs ${TEXTAREA}`} value={captionContent}
            onChange={(e) => setCaptionContent(e.target.value)}
            placeholder={"WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nWelcome."} />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={captionDefault} onChange={(e) => setCaptionDefault(e.target.checked)} /> Default</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={syncTranscript} onChange={(e) => setSyncTranscript(e.target.checked)} /> Sync transcript</label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="file" accept=".vtt,.srt" className="max-w-44 text-xs"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(setCaptionContent); }} />
            Load file
          </label>
        </div>
        {msg && <p className="rounded bg-muted px-3 py-1.5 text-xs">{msg}</p>}
        <button type="submit" disabled={!captionContent.trim() || busy !== null}
          className="flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save className="h-4 w-4" /> Save caption track
        </button>
      </form>

      {/* Tracks + AI drafts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caption tracks</p>
          {captionTracks.loading ? <LoadingState title="Loading…" /> :
            captionTracks.data?.length ? captionTracks.data.map((track) => (
              <CaptionTrackCard key={track.id} track={track}
                isEditing={editingTrackId === track.id}
                onEditCues={() => setEditingTrackId(editingTrackId === track.id ? null : track.id)}
                onMakeDefault={() => doRun("caption", () => updateCaption(track.id, { isDefault: true }), "Default updated.")}
                onDelete={() => doRun("caption", () => deleteCaption(track.id), "Track deleted.")} />
            )) : <p className="text-xs text-muted-foreground">No tracks yet.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI drafts</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null}
              onClick={() => void doRun("summary", () => generateSummary(activity.id, { language: defaultLang }), "Summary drafted.")}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              <Sparkles className="h-3.5 w-3.5" /> Summary
            </button>
            <button type="button" disabled={busy !== null}
              onClick={() => void doRun("quiz", () => generateQuiz(activity.id, { language: defaultLang, questionCount: 5 }), "Quiz drafted.")}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              <Sparkles className="h-3.5 w-3.5" /> Quiz
            </button>
          </div>
          {generatedItems.data?.length ? <AiApprovalQueue activityId={activity.id} /> : <p className="text-xs text-muted-foreground">No drafts yet.</p>}
        </div>
      </div>

      {editingTrackId && <CaptionCueEditor trackId={editingTrackId} />}
    </div>
  );
}

function CaptionTrackCard({ track, isEditing, onEditCues, onMakeDefault, onDelete }: {
  track: VideoCaptionTrack; isEditing: boolean;
  onEditCues: () => void; onMakeDefault: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{track.label}</p>
          <p className="text-xs text-muted-foreground">{track.language.toUpperCase()} · {track.kind} · {track.cues.length} cues</p>
        </div>
        {track.isDefault && <StatusBadge value="default" tone="success" />}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={onEditCues} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
          {isEditing ? "Close editor" : "Edit cues"}
        </button>
        {!track.isDefault && (
          <button type="button" onClick={() => void onMakeDefault()} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
            Set default
          </button>
        )}
        <button type="button" onClick={() => void onDelete()} className="flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function ActivityContentPanel({
  activity, fileOptions, libraryOptions, quizOptions,
  onSaveContent, onAttachFile, onAttachLibrary, onAttachQuiz,
}: {
  activity: Activity;
  fileOptions: Array<{ id: string; originalFilename: string }>;
  libraryOptions: Array<{ id: string; title: string }>;
  quizOptions: Array<{ id: string; title: string; status: string }>;
  onSaveContent: (id: string, data: Record<string, unknown>) => void;
  onAttachFile: (id: string, fileId: string) => void;
  onAttachLibrary: (id: string, libId: string) => void;
  onAttachQuiz: (id: string, quizId: string) => void;
}) {
  const isText = activity.activityTypeKey === "core.text";
  const isQuiz = activity.activityTypeKey === "core.quiz";
  const isVideo = activity.activityTypeKey === "core.video";
  const content = activity.activityContent?.content ?? {};
  const htmlDefault =
    typeof content.html === "string" ? content.html :
    typeof content.body === "string" && content.format === "rich_text_html" ? content.body :
    activity.activityContent?.textContent ?? "";

  async function submitGeneric(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSaveContent(activity.id, {
      textContent: String(d.get("textContent") ?? ""),
      externalUrl: String(d.get("externalUrl") ?? "") || undefined,
      content: { body: String(d.get("textContent") ?? ""), url: String(d.get("externalUrl") ?? "") || undefined },
    });
  }

  return (
    <PluginActivityEditor activity={activity} onSaveContent={(data) => onSaveContent(activity.id, data)}>
      <div className="flex flex-col gap-5">
        {isQuiz ? (
          <AttachSelect label="Attach quiz"
            options={quizOptions.map((q) => ({ id: q.id, label: `${q.title} (${q.status})` }))}
            onAttach={(id) => onAttachQuiz(activity.id, id)} />
        ) : isText ? (
          <div>
            <p className="mb-2 text-sm font-medium">Rich text content</p>
            <RichTextEditor defaultValue={htmlDefault}
              onSubmit={(_val, payload) => {
                onSaveContent(activity.id, {
                  textContent: payload.text,
                  content: { format: "rich_text_html", html: payload.html, body: payload.html },
                });
                return Promise.resolve();
              }} />
          </div>
        ) : (
          <form onSubmit={submitGeneric} className="flex flex-col gap-4">
            <Field label="Text content">
              <textarea name="textContent" rows={5} className={TEXTAREA}
                defaultValue={activity.activityContent?.textContent ?? ""} />
            </Field>
            <Field label="External URL">
              <input name="externalUrl" type="url" className={INPUT}
                defaultValue={activity.activityContent?.externalUrl ?? ""} />
            </Field>
            <button type="submit" className="flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Save className="h-4 w-4" /> Save content
            </button>
          </form>
        )}

        {!isQuiz && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</p>
            <AttachSelect label="File"
              options={fileOptions.map((f) => ({ id: f.id, label: f.originalFilename }))}
              onAttach={(id) => onAttachFile(activity.id, id)} />
            <AttachSelect label="Library item"
              options={libraryOptions.map((l) => ({ id: l.id, label: l.title }))}
              onAttach={(id) => onAttachLibrary(activity.id, id)} />
          </div>
        )}

        {isVideo && <VideoEnhancementsPanel activity={activity} />}
      </div>
    </PluginActivityEditor>
  );
}

function AttachSelect({ label, options, onAttach }: {
  label: string;
  options: Array<{ id: string; label: string }>;
  onAttach: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-52 flex-1 text-sm font-medium">
        {label}
        <select className={`mt-1 ${INPUT}`} value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      <button type="button" disabled={!selectedId}
        onClick={() => { if (selectedId) { onAttach(selectedId); setSelectedId(""); } }}
        className="h-9 rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-40 hover:bg-muted">
        Attach
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const params = useParams<{ courseId: string }>();
  const courseQuery = useInstructorCourse(params.courseId);
  const filesQuery = useFiles();
  const libraryQuery = useContentLibrary();
  const activityTypesQuery = usePluginActivityTypes();
  const quizzesQuery = useInstructorQuizzes();
  const session = useSession();
  const course = courseQuery.data;
  const canUpdate = hasPermission(session, PERMISSIONS.coursesUpdate);
  const canPublish = hasPermission(session, PERMISSIONS.coursesPublish);
  const canCreate = hasPermission(session, PERMISSIONS.coursesCreate);
  const [selection, setSelection] = useState<Selection>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await courseQuery.refresh();
      showToast(success);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), false);
    }
  }

  const activities = useMemo(
    () => course?.modules?.flatMap((m) => m.lessons.flatMap((l) => l.activities)) ?? [],
    [course],
  );
  const selectedActivity = selection?.type === "activity"
    ? (activities.find((a) => a.id === selection.id) ?? null)
    : null;

  return (
    <AuthGate>
      <AppShell currentPath="/instructor/courses">
        {courseQuery.loading ? (
          <LoadingState title="Loading builder" />
        ) : courseQuery.error || !course ? (
          <ApiErrorState error={courseQuery.error} fallbackTitle="Could not load course" />
        ) : (
          <div className="flex flex-col gap-0">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">Course Builder</p>
                <h1 className="text-base font-semibold">{course.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {toast && (
                  <span className={`rounded-md px-3 py-1 text-xs font-medium ${toast.ok ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                    {toast.msg}
                  </span>
                )}
                <ButtonLink href={`/instructor/courses/${course.id}/preview`} variant="secondary">
                  Preview
                </ButtonLink>
                {canCreate && (
                  <button type="button"
                    onClick={() => void run(() => api.duplicateCourse(course.id), "Course duplicated.")}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                    Duplicate
                  </button>
                )}
                {canPublish && (
                  <button type="button"
                    disabled={course.status === "PUBLISHED"}
                    onClick={() => void run(() => api.publishCourse(course.id), "Course published.")}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" />
                    {course.status === "PUBLISHED" ? "Published" : "Publish"}
                  </button>
                )}
              </div>
            </div>

            <CoursePhaseNavigation courseId={params.courseId} active="overview" instructor />

            {/* 2-column layout */}
            <div className="flex min-h-[calc(100vh-10rem)]">
              {/* Left sidebar — curriculum tree */}
              <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Curriculum
                  </span>
                  <button type="button"
                    onClick={() => void run(() => api.createModule(course.id, { title: "New Module" }), "Module added.")}
                    className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                    <FolderPlus className="h-3 w-3" /> Module
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {!course.modules?.length ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No modules yet. Add one to start.
                    </p>
                  ) : (
                    course.modules.map((mod, idx) => (
                      <ModuleTreeItem key={mod.id} mod={mod} idx={idx}
                        selection={selection} onSelect={setSelection}
                        onAddLesson={(mid) => run(() => api.createLesson(mid, { title: "New Lesson" }), "Lesson added.")}
                        onAddActivity={(lid) => run(() => api.createActivity(lid, { title: "New Activity", activityTypeKey: "core.text", isRequired: true }), "Activity added.")}
                      />
                    ))
                  )}
                </div>
              </aside>

              {/* Right — edit panel */}
              <main className="flex-1 overflow-y-auto bg-background p-6">
                {!selection && <CourseOverviewPanel course={course} canUpdate={canUpdate} canPublish={canPublish} onAction={run} />}
                {selection?.type === "module" && (
                  <ModuleEditPanel course={course} moduleId={selection.id}
                    onSave={(id, d) => run(() => api.updateModule(id, d), "Module saved.")}
                    onDelete={(id) => run(() => api.deleteModule(id), "Module deleted.")} />
                )}
                {selection?.type === "lesson" && (
                  <LessonEditPanel course={course} lessonId={selection.id}
                    onSave={(id, d) => run(() => api.updateLesson(id, d), "Lesson saved.")}
                    onDelete={(id) => run(() => api.deleteLesson(id), "Lesson deleted.")} />
                )}
                {selection?.type === "activity" && selectedActivity && (
                  <ActivityEditPanel
                    activity={selectedActivity}
                    fileOptions={filesQuery.data?.data ?? []}
                    libraryOptions={libraryQuery.data ?? []}
                    quizOptions={quizzesQuery.data ?? []}
                    activityTypes={activityTypesQuery.data?.activityTypes ?? []}
                    onSave={(id, d) => run(() => api.updateActivity(id, d), "Activity saved.")}
                    onDelete={(id) => run(() => api.deleteActivity(id), "Activity deleted.")}
                    onSaveContent={(id, d) => run(() => api.updateActivityContent(id, d), "Content saved.")}
                    onAttachFile={(id, fid) => run(() => api.attachFileToActivity(id, fid), "File attached.")}
                    onAttachLibrary={(id, lid) => run(() => api.attachLibraryItemToActivity(id, lid), "Library item attached.")}
                    onAttachQuiz={(id, qid) => run(() => api.attachQuizToActivity(id, qid), "Quiz attached.")}
                  />
                )}
              </main>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
