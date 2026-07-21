"use client";

import Link from "next/link";
import { Bell, CalendarDays, Lock, MessageSquare, Pin, Radio } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getSession } from "../../lib/api-client";
import type { CalendarEvent, DiscussionReport, DiscussionThread, InAppNotification, LiveClass, NotificationPreference } from "../../lib/lms-types";
import { ButtonLink, StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";

const inputClass = "min-h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function useLoad<T>(loader: () => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await loader()); } catch (value) { setError(value instanceof Error ? value : new Error("Request failed")); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload };
}

export function DiscussionList({ courseId, lessonId, activityId, manager = false }: { courseId: string; lessonId?: string; activityId?: string; manager?: boolean }) {
  const query = useLoad(() => api.discussionThreads(courseId, { lessonId, activityId }), [courseId, lessonId, activityId]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pinned" | "locked" | "hidden">("all");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api.createDiscussionThread({ courseId, lessonId, activityId, title: form.get("title"), body: form.get("body") });
      formElement.reset(); await query.reload();
    } catch (value) { window.alert(value instanceof Error ? value.message : "Could not create discussion"); }
    finally { setSaving(false); }
  }
  if (query.loading) return <LoadingState title="Loading discussions" />;
  if (query.error) return <ApiErrorState error={query.error} fallbackTitle="Could not load discussions" />;
  const visibleThreads = (query.data ?? []).filter((thread) => filter === "all" || (filter === "pinned" && thread.pinned) || (filter === "locked" && thread.locked) || (filter === "hidden" && thread.status === "HIDDEN"));
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="space-y-3">
      {manager ? <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">{(["all", "pinned", "locked", "hidden"] as const).map((value) => <button className={`rounded-md px-3 py-2 text-sm font-semibold ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} key={value} onClick={() => setFilter(value)}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div> : null}
      {!visibleThreads.length ? <EmptyState icon={MessageSquare} title="No discussions found" description="Start a thoughtful conversation or change the current filter." /> : visibleThreads.map((thread) =>
        <Link key={thread.id} href={`/learn/courses/${courseId}/discussions/${thread.id}`} className="block rounded-lg border border-border bg-card p-5 shadow-subtle transition hover:border-primary/40">
          <div className="flex flex-wrap items-center gap-2">
            {thread.pinned ? <StatusBadge value="Pinned" tone="info" /> : null}
            {thread.locked ? <StatusBadge value="Locked" tone="warning" /> : null}
            <h2 className="text-lg font-semibold">{thread.title}</h2>
          </div>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{thread.body}</p>
          <p className="mt-3 text-xs text-muted-foreground">{thread.author?.name ?? "Course member"} · {thread._count?.replies ?? 0} replies</p>
        </Link>)}
    </section>
    <form onSubmit={submit} className="h-fit space-y-4 rounded-lg border border-border bg-card p-5 shadow-subtle">
      <h2 className="font-semibold">Start a discussion</h2>
      <label className="block text-sm font-medium">Title<input className={`${inputClass} mt-1`} name="title" minLength={3} maxLength={160} required /></label>
      <label className="block text-sm font-medium">Message<textarea className={`${inputClass} mt-1 min-h-32`} name="body" maxLength={20000} required /></label>
      <button className={buttonClass} disabled={saving} type="submit">{saving ? "Posting…" : "Post thread"}</button>
    </form>
  </div>;
}

export function DiscussionDetail({ threadId }: { threadId: string }) {
  const query = useLoad(() => api.discussionThread(threadId), [threadId]);
  const [saving, setSaving] = useState(false);
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const formElement = event.currentTarget; const form = new FormData(formElement);
    try { await api.createDiscussionReply(threadId, { body: form.get("body") }); formElement.reset(); await query.reload(); }
    catch (value) { window.alert(value instanceof Error ? value.message : "Could not post reply"); } finally { setSaving(false); }
  }
  if (query.loading) return <LoadingState title="Loading discussion" />;
  if (query.error || !query.data) return <ApiErrorState error={query.error} fallbackTitle="Could not load discussion" />;
  const thread = query.data;
  const roles = getSession()?.activeOrganization.roleKeys ?? [];
  const canModerate = Boolean(getSession()?.activeOrganization.isPlatformAdmin) || roles.some((role) => ["org_admin", "course_manager", "instructor"].includes(role));
  return <div className="space-y-5">
    <article className="rounded-lg border border-border bg-card p-6 shadow-subtle">
      <div className="flex flex-wrap gap-2">{thread.pinned ? <StatusBadge value="Pinned" tone="info" /> : null}{thread.locked ? <StatusBadge value="Locked" tone="warning" /> : null}</div>
      <h1 className="mt-3 text-2xl font-semibold">{thread.title}</h1><p className="mt-2 text-xs text-muted-foreground">{thread.author?.name ?? "Course member"}</p>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-6">{thread.body}</p>
      {canModerate ? <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4"><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold" onClick={async () => { await api.moderateDiscussionThread(thread.id, { pinned: !thread.pinned }); await query.reload(); }}><Pin className="h-4 w-4" />{thread.pinned ? "Unpin" : "Pin"}</button><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold" onClick={async () => { await api.moderateDiscussionThread(thread.id, { locked: !thread.locked }); await query.reload(); }}><Lock className="h-4 w-4" />{thread.locked ? "Unlock" : "Lock"}</button><button className="inline-flex min-h-9 items-center rounded-md border border-destructive px-3 text-sm font-semibold text-destructive" onClick={async () => { await api.moderateDiscussionThread(thread.id, { status: thread.status === "HIDDEN" ? "VISIBLE" : "HIDDEN" }); await query.reload(); }}>{thread.status === "HIDDEN" ? "Show thread" : "Hide thread"}</button></div> : null}
      {!canModerate && thread.authorId !== getSession()?.user.id ? <button className="mt-4 text-xs font-semibold text-muted-foreground hover:text-destructive" onClick={async () => { const details = window.prompt("Describe why this discussion should be reviewed (optional)"); if (details === null) return; await api.reportDiscussionThread(thread.id, { reason: "OTHER", details: details || undefined }); window.alert("Report submitted to course moderators."); }}>Report discussion</button> : null}
    </article>
    <section className="space-y-3" aria-label="Replies">
      {!thread.replies?.length ? <EmptyState title="No replies yet" description="Be the first to respond." /> : thread.replies.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-5"><p className="text-xs font-semibold text-muted-foreground">{item.author?.name ?? "Course member"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p></article>)}
    </section>
    {thread.locked ? <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm"><Lock className="mr-2 inline h-4 w-4" />This thread is locked.</div> : <form onSubmit={reply} className="rounded-lg border border-border bg-card p-5"><label className="block text-sm font-medium">Add a reply<textarea className={`${inputClass} mt-2 min-h-28`} name="body" required /></label><button className={`${buttonClass} mt-3`} disabled={saving}>{saving ? "Posting…" : "Post reply"}</button></form>}
  </div>;
}

export function WorkspaceDiscussionPanel({ courseId, lessonId, activityId }: { courseId: string; lessonId: string; activityId?: string }) {
  const query = useLoad(() => api.discussionThreads(courseId, { lessonId, activityId }), [courseId, lessonId, activityId]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useLoad(async () => selectedId ? api.discussionThread(selectedId) : null, [selectedId]);
  const [composer, setComposer] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); await api.createDiscussionThread({ courseId, lessonId, activityId, title: form.get("title"), body: form.get("body") }); formElement.reset(); setComposer(false); await query.reload(); }
  async function reply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selectedId) return; const formElement = event.currentTarget; const form = new FormData(formElement); await api.createDiscussionReply(selectedId, { body: form.get("body") }); formElement.reset(); await detail.reload(); }
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h3 className="text-sm font-semibold">Lesson discussion</h3><p className="text-xs text-muted-foreground">Questions about this lesson{activityId ? " and activity" : ""}</p></div><button className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => setComposer((value) => !value)}>New thread</button></div>
    {composer ? <form className="space-y-2 border-b border-border bg-muted/30 p-3" onSubmit={(event) => void create(event)}><input className={inputClass} name="title" placeholder="Discussion title" minLength={3} required /><textarea className={`${inputClass} min-h-20`} name="body" placeholder="What would you like to discuss?" required /><div className="flex gap-2"><button className={buttonClass}>Post</button><button className="rounded-md border border-border px-3 text-sm" onClick={() => setComposer(false)} type="button">Cancel</button></div></form> : null}
    {selectedId ? <div className="min-h-0 flex-1 overflow-y-auto p-3"><button className="mb-3 text-xs font-semibold text-primary" onClick={() => setSelectedId(null)}>← All threads</button>{detail.loading ? <LoadingState title="Loading thread" /> : detail.error || !detail.data ? <ApiErrorState error={detail.error} fallbackTitle="Could not load thread" /> : <div className="space-y-3"><article className="rounded-md border border-border bg-card p-3"><div className="flex gap-2">{detail.data.pinned ? <StatusBadge value="Pinned" tone="info" /> : null}{detail.data.locked ? <StatusBadge value="Locked" tone="warning" /> : null}</div><h4 className="mt-2 font-semibold">{detail.data.title}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{detail.data.body}</p></article>{detail.data.replies?.map((item) => <article className="rounded-md border border-border bg-card p-3" key={item.id}><p className="text-xs font-semibold text-muted-foreground">{item.author?.name ?? "Course member"}</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p></article>)}{!detail.data.locked ? <form className="flex gap-2" onSubmit={(event) => void reply(event)}><textarea className={`${inputClass} min-h-16 flex-1`} name="body" placeholder="Write a reply" required /><button className={buttonClass}>Reply</button></form> : <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">This thread is locked.</p>}</div>}</div> : <div className="min-h-0 flex-1 overflow-y-auto p-3">{query.loading ? <LoadingState title="Loading discussions" /> : query.error ? <ApiErrorState error={query.error} fallbackTitle="Could not load discussions" /> : !query.data?.length ? <EmptyState icon={MessageSquare} title="No lesson discussions" description="Start the first conversation for this learning context." /> : <div className="space-y-2">{query.data.map((thread) => <button className="block w-full rounded-md border border-border bg-card p-3 text-left hover:border-primary/40" key={thread.id} onClick={() => setSelectedId(thread.id)}><div className="flex items-center gap-2">{thread.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : null}<span className="text-sm font-semibold">{thread.title}</span>{thread.locked ? <Lock className="h-3.5 w-3.5 text-warning" /> : null}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{thread.body}</p><p className="mt-2 text-xs text-muted-foreground">{thread._count?.replies ?? 0} replies</p></button>)}</div>}</div>}
  </div>;
}

export function WorkspaceUpcomingPanel({ courseId }: { courseId: string }) {
  const from = new Date(); const to = new Date(from.getTime() + 14 * 24 * 60 * 60_000);
  const query = useLoad(() => api.calendarEvents({ from: from.toISOString(), to: to.toISOString(), courseId }), [courseId]);
  if (query.loading) return <div className="p-3"><LoadingState title="Loading upcoming events" /></div>;
  if (query.error) return <div className="p-3"><ApiErrorState error={query.error} fallbackTitle="Could not load upcoming events" /></div>;
  return <div className="min-h-0 flex-1 overflow-y-auto p-3"><div className="mb-3"><h3 className="text-sm font-semibold">Upcoming</h3><p className="text-xs text-muted-foreground">Next 14 days in this course</p></div>{!query.data?.length ? <EmptyState icon={CalendarDays} title="Nothing upcoming" description="No live classes or deadlines in the next 14 days." /> : <div className="space-y-2">{query.data.slice(0, 8).map((event) => <article className="rounded-md border border-border bg-card p-3" key={`${event.sourceType}-${event.sourceId}-${event.type}`}><StatusBadge value={event.type.replaceAll("_", " ")} tone="info" /><h4 className="mt-2 text-sm font-semibold">{event.title}</h4><p className="mt-1 text-xs text-muted-foreground">{new Date(event.startsAt).toLocaleString()}</p>{event.actionUrl ? <Link className="mt-2 inline-block text-xs font-semibold text-primary" href={event.actionUrl}>Open event</Link> : null}</article>)}</div>}</div>;
}

export function CoursePhaseNavigation({ courseId, active = "overview", instructor = false }: { courseId: string; active?: "overview" | "discussion" | "live" | "calendar" | "announcements"; instructor?: boolean }) {
  const base = instructor ? `/instructor/courses/${courseId}` : `/learn/courses/${courseId}`;
  const items = instructor ? [
    { key: "overview", label: "Course builder", href: `${base}/builder` },
    { key: "gradebook", label: "Gradebook", href: `${base}/gradebook` },
    { key: "roster", label: "Roster", href: `${base}/roster` },
    { key: "announcements", label: "Announcements", href: `${base}/announcements` },
    { key: "discussion", label: "Discussions", href: `${base}/discussions` },
    { key: "live", label: "Live classes", href: `${base}/live-classes` },
    { key: "calendar", label: "Schedule", href: `${base}/calendar` },
  ] : [
    { key: "overview", label: "Overview", href: base },
    { key: "discussion", label: "Discussion", href: `${base}/discussions` },
    { key: "live", label: "Live class", href: `${base}/live-classes` },
    { key: "calendar", label: "Calendar", href: `${base}/calendar` },
  ];
  return <nav aria-label="Course sections" className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">{items.map((item) => <Link className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${active === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} href={item.href} key={item.key}>{item.label}</Link>)}</nav>;
}

export function InstructorDiscussionHub({ admin = false }: { admin?: boolean }) {
  const courses = useLoad(() => api.instructorCourses(), []);
  const [courseId, setCourseId] = useState("");
  useEffect(() => { if (!courseId && courses.data?.[0]?.id) setCourseId(courses.data[0].id); }, [courseId, courses.data]);
  if (courses.loading) return <LoadingState title="Loading managed courses" />;
  if (courses.error) return <ApiErrorState error={courses.error} fallbackTitle="Could not load managed courses" />;
  if (!courses.data?.length) return <EmptyState icon={MessageSquare} title="No courses to moderate" description="Discussions appear after you are assigned to a course." />;
  return <div className="space-y-8"><label className="block max-w-xl text-sm font-medium">Course<select className={`${inputClass} mt-1`} value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.data.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>{admin ? <DiscussionReports courseId={courseId} /> : null}{courseId ? <DiscussionList courseId={courseId} manager /> : null}{admin ? <p className="text-xs text-muted-foreground">Moderation actions are restricted to the active organization.</p> : null}</div>;
}

export function LearnerDiscussionHub() {
  const enrollments = useLoad(() => api.myEnrollments(), []);
  const [courseId, setCourseId] = useState("");
  useEffect(() => { if (!courseId && enrollments.data?.[0]?.courseId) setCourseId(enrollments.data[0].courseId); }, [courseId, enrollments.data]);
  if (enrollments.loading) return <LoadingState title="Loading your course discussions" />;
  if (enrollments.error) return <ApiErrorState error={enrollments.error} fallbackTitle="Could not load discussions" />;
  if (!enrollments.data?.length) return <EmptyState icon={MessageSquare} title="No enrolled courses" description="Enroll in a course to join its discussions." />;
  return <div className="space-y-5"><label className="block max-w-xl text-sm font-medium">Course<select className={`${inputClass} mt-1`} value={courseId} onChange={(event) => setCourseId(event.target.value)}>{enrollments.data.map((enrollment) => <option key={enrollment.courseId} value={enrollment.courseId}>{enrollment.course.title}</option>)}</select></label>{courseId ? <DiscussionList courseId={courseId} /> : null}</div>;
}

function DiscussionReports({ courseId }: { courseId?: string }) {
  const query = useLoad(() => api.discussionReports(courseId), [courseId]);
  if (query.loading) return <LoadingState title="Loading moderation reports" />;
  if (query.error) return <ApiErrorState error={query.error} fallbackTitle="Could not load moderation reports" />;
  const open = (query.data ?? []).filter((report: DiscussionReport) => report.status === "OPEN");
  return <section><div className="mb-3"><h2 className="text-lg font-semibold">Open reports</h2><p className="text-sm text-muted-foreground">Review reported threads and replies before hiding content.</p></div>{!open.length ? <EmptyState title="No open reports" description="Reported content for this course will appear here." /> : <div className="space-y-2">{open.map((report) => <article className="rounded-lg border border-warning/30 bg-card p-4" key={report.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><StatusBadge value={report.reason.toLowerCase()} tone="warning" /><h3 className="mt-2 font-semibold">{report.thread?.title ?? report.reply?.thread.title ?? "Reported discussion"}</h3><p className="mt-1 text-sm text-muted-foreground">{report.details || "No additional details provided."}</p><p className="mt-2 text-xs text-muted-foreground">Reported by {report.reporter?.name ?? "Course member"}</p></div><div className="flex gap-2"><button className="rounded-md border border-destructive px-3 py-2 text-sm font-semibold text-destructive" onClick={async () => { await api.resolveDiscussionReport(report.id, { status: "RESOLVED", hideContent: true }); await query.reload(); }}>Hide & resolve</button><button className="rounded-md border border-border px-3 py-2 text-sm font-semibold" onClick={async () => { await api.resolveDiscussionReport(report.id, { status: "DISMISSED" }); await query.reload(); }}>Dismiss</button></div></div></article>)}</div>}</section>;
}

export function InstructorScheduleHub() {
  const courses = useLoad(() => api.instructorCourses(), []);
  const [courseId, setCourseId] = useState("");
  useEffect(() => { if (!courseId && courses.data?.[0]?.id) setCourseId(courses.data[0].id); }, [courseId, courses.data]);
  if (courses.loading) return <LoadingState title="Loading managed courses" />;
  if (courses.error) return <ApiErrorState error={courses.error} fallbackTitle="Could not load managed courses" />;
  return <div className="space-y-5"><label className="block max-w-xl text-sm font-medium">Course<select className={`${inputClass} mt-1`} value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">All managed courses</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><LearningCalendar courseId={courseId || undefined} canManage={Boolean(courseId)} /></div>;
}

export function LiveClassList({ courseId, canManage = false }: { courseId?: string; canManage?: boolean }) {
  const query = useLoad(() => api.liveClasses(courseId), [courseId]); const [saving, setSaving] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!courseId) return; setSaving(true); const formElement = event.currentTarget; const form = new FormData(formElement);
    try { await api.createLiveClass({ courseId, title: form.get("title"), description: form.get("description") || undefined, provider: form.get("provider"), meetingUrl: form.get("meetingUrl") || undefined, startAt: new Date(String(form.get("startAt"))).toISOString(), endAt: new Date(String(form.get("endAt"))).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); formElement.reset(); await query.reload(); }
    catch (value) { window.alert(value instanceof Error ? value.message : "Could not schedule class"); } finally { setSaving(false); }
  }
  async function join(item: LiveClass) { try { const result = await api.joinLiveClass(item.id); window.open(result.meetingUrl, "_blank", "noopener,noreferrer"); } catch (value) { window.alert(value instanceof Error ? value.message : "Could not join class"); } }
  async function edit(event: FormEvent<HTMLFormElement>, item: LiveClass) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api.updateLiveClass(item.id, { title: form.get("title"), meetingUrl: form.get("meetingUrl") || undefined, startAt: new Date(String(form.get("startAt"))).toISOString(), endAt: new Date(String(form.get("endAt"))).toISOString(), timezone: item.timezone }); await query.reload(); } catch (value) { window.alert(value instanceof Error ? value.message : "Could not update class"); } }
  if (query.loading) return <LoadingState title="Loading live classes" />; if (query.error) return <ApiErrorState error={query.error} fallbackTitle="Could not load live classes" />;
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="space-y-3">{!query.data?.length ? <EmptyState icon={Radio} title="No live classes scheduled" description="Upcoming sessions will appear here." /> : query.data.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-5 shadow-subtle"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.course?.title}</p><h2 className="mt-1 text-lg font-semibold">{item.title}</h2></div><StatusBadge value={item.status.toLowerCase()} tone={item.status === "CANCELLED" ? "danger" : item.status === "LIVE" ? "success" : "info"} /></div><p className="mt-3 text-sm text-muted-foreground">{new Date(item.startAt).toLocaleString()} – {new Date(item.endAt).toLocaleTimeString()} · {item.timezone}</p>{item.description ? <p className="mt-3 text-sm">{item.description}</p> : null}<div className="mt-4 flex gap-2"><button className={buttonClass} disabled={["CANCELLED", "ENDED"].includes(item.status)} onClick={() => void join(item)}>Join session</button>{canManage && item.status !== "CANCELLED" ? <button className="rounded-md border border-destructive px-3 text-sm font-semibold text-destructive" onClick={async () => { await api.cancelLiveClass(item.id); await query.reload(); }}>Cancel</button> : null}</div>{canManage && item.status !== "CANCELLED" ? <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Edit session</summary><form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void edit(event, item)}><label className="text-sm">Title<input className={`${inputClass} mt-1`} name="title" defaultValue={item.title} required /></label><label className="text-sm">Meeting URL<input className={`${inputClass} mt-1`} name="meetingUrl" type="url" defaultValue={item.meetingUrl ?? ""} /></label><label className="text-sm">Starts<input className={`${inputClass} mt-1`} name="startAt" type="datetime-local" defaultValue={new Date(item.startAt).toISOString().slice(0, 16)} required /></label><label className="text-sm">Ends<input className={`${inputClass} mt-1`} name="endAt" type="datetime-local" defaultValue={new Date(item.endAt).toISOString().slice(0, 16)} required /></label><button className={buttonClass}>Save changes</button></form></details> : null}</article>)}</section>
    {canManage && courseId ? <form onSubmit={create} className="h-fit space-y-3 rounded-lg border border-border bg-card p-5 shadow-subtle"><h2 className="font-semibold">Schedule live class</h2><p className="text-xs leading-5 text-muted-foreground">Choose the meeting provider, then paste a link created outside the LMS. No Zoom or Google Meet API connection is used.</p><label className="block text-sm">Title<input className={`${inputClass} mt-1`} name="title" required /></label><label className="block text-sm">Description<textarea className={`${inputClass} mt-1`} name="description" /></label><label className="block text-sm">Meeting provider<select className={`${inputClass} mt-1`} name="provider"><option value="MANUAL_LINK">Other meeting link</option><option value="ZOOM">Zoom link (manual)</option><option value="GOOGLE_MEET">Google Meet link (manual)</option><option value="CUSTOM">Custom provider link</option></select></label><label className="block text-sm">Meeting link<input className={`${inputClass} mt-1`} name="meetingUrl" placeholder="https://…" type="url" required /></label><label className="block text-sm">Starts<input className={`${inputClass} mt-1`} name="startAt" type="datetime-local" required /></label><label className="block text-sm">Ends<input className={`${inputClass} mt-1`} name="endAt" type="datetime-local" required /></label><p className="text-xs text-muted-foreground">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><button className={buttonClass} disabled={saving}>{saving ? "Scheduling…" : "Schedule and notify learners"}</button></form> : <div />}
  </div>;
}

export function NotificationCenter() {
  const query = useLoad(() => api.notifications(), []); const preference = useLoad(() => api.notificationPreferences(), []);
  const [unreadOnly, setUnreadOnly] = useState(false);
  if (query.loading) return <LoadingState title="Loading notifications" />; if (query.error) return <ApiErrorState error={query.error} fallbackTitle="Could not load notifications" />;
  async function mark(item: InAppNotification) { if (!item.readAt) await api.markNotificationRead(item.id); if (item.actionUrl) window.location.href = item.actionUrl; else await query.reload(); }
  const visible = (query.data ?? []).filter((item) => !unreadOnly || !item.readAt);
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"><div className="flex rounded-md border border-border p-1"><button className={`rounded px-3 py-1.5 text-sm font-semibold ${!unreadOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setUnreadOnly(false)}>All</button><button className={`rounded px-3 py-1.5 text-sm font-semibold ${unreadOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setUnreadOnly(true)}>Unread</button></div><button className="text-sm font-semibold text-primary" onClick={async () => { await api.markAllNotificationsRead(); await query.reload(); }}>Mark all read</button></div>{!visible.length ? <EmptyState icon={Bell} title={unreadOnly ? "No unread notifications" : "You’re all caught up"} description="Course activity and reminders will appear here." /> : visible.map((item) => <button key={item.id} onClick={() => void mark(item)} className={`block w-full rounded-lg border p-5 text-left transition hover:border-primary/40 ${item.readAt ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}><div className="flex items-start gap-3"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-muted" : "bg-primary"}`} /><span><span className="block font-semibold">{item.title}</span><span className="mt-1 block text-sm text-muted-foreground">{item.body}</span><span className="mt-2 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></span></div></button>)}</section><PreferenceCard preference={preference.data} onSave={async (data) => { await api.updateNotificationPreferences(data); await preference.reload(); }} /></div>;
}

function PreferenceCard({ preference, onSave }: { preference: NotificationPreference | null; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [saving, setSaving] = useState(false); if (!preference) return <div />;
  const types = [{ key: "discussion_reply", label: "Discussion replies" }, { key: "discussion_mention", label: "Discussion mentions" }, { key: "course_announcement", label: "Course announcements" }, { key: "course_published", label: "Course updates" }, { key: "live_class_scheduled", label: "Live class schedules" }, { key: "live_class_cancelled", label: "Live class cancellations" }, { key: "assignment_graded", label: "Assignment grades" }, { key: "certificate_issued", label: "Certificates" }, { key: "organization_invite", label: "Organization invitations" }];
  const muted = Array.isArray(preference.mutedTypes) ? preference.mutedTypes : [];
  return <form className="h-fit rounded-lg border border-border bg-card p-5" onSubmit={async (event) => { event.preventDefault(); setSaving(true); const data = new FormData(event.currentTarget); const enabledTypes = data.getAll("enabledType").map(String); await onSave({ inAppEnabled: data.get("inAppEnabled") === "on", emailEnabled: data.get("emailEnabled") === "on", mutedTypes: types.map((item) => item.key).filter((key) => !enabledTypes.includes(key)) }); setSaving(false); }}><h2 className="font-semibold">Preferences</h2><p className="mt-1 text-xs text-muted-foreground">Choose which updates appear in your notification center.</p><label className="mt-4 flex items-center gap-3 text-sm font-medium"><input defaultChecked={preference.inAppEnabled} name="inAppEnabled" type="checkbox" />Enable in-app notifications</label><fieldset className="mt-5 space-y-3 border-t border-border pt-4"><legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notification types</legend>{types.map((item) => <label className="flex items-center gap-3 text-sm" key={item.key}><input defaultChecked={!muted.includes(item.key)} name="enabledType" type="checkbox" value={item.key} />{item.label}</label>)}</fieldset><label className="mt-5 flex items-center gap-3 border-t border-border pt-4 text-sm"><input defaultChecked={Boolean(preference.emailEnabled)} name="emailEnabled" type="checkbox" />Email-ready preference</label><p className="mt-1 text-xs text-muted-foreground">Email delivery remains disabled until an email provider is configured.</p><button className={`${buttonClass} mt-5`} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button></form>;
}

export function LearningCalendar({ courseId, canManage = false }: { courseId?: string; canManage?: boolean } = {}) {
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [type, setType] = useState("");
  const [mode, setMode] = useState<"agenda" | "month">("agenda");
  function goToToday() { const now = new Date(); setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)); }
  const query = useLoad(() => api.calendarEvents({ from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59`).toISOString(), type: type || undefined, courseId }), [from, to, type, courseId]);
  const grouped = (query.data ?? []).reduce<Record<string, CalendarEvent[]>>((result, event) => { const key = new Date(event.startsAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); (result[key] ??= []).push(event); return result; }, {});
  const start = new Date(`${from}T00:00:00`); const end = new Date(`${to}T00:00:00`); const days: Date[] = [];
  for (let day = new Date(start); day <= end && days.length < 42; day.setDate(day.getDate() + 1)) days.push(new Date(day));
  async function openEvent(event: CalendarEvent) { if (event.type === "live_class") { try { const result = await api.joinLiveClass(event.sourceId); window.open(result.meetingUrl, "_blank", "noopener,noreferrer"); } catch (value) { window.alert(value instanceof Error ? value.message : "The session cannot be joined yet"); } } else if (event.actionUrl) window.location.href = event.actionUrl; }
  async function createEvent(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); try { await api.createCalendarEvent({ courseId: courseId || undefined, visibility: courseId && canManage ? "course" : "personal", title: form.get("title"), description: form.get("description") || undefined, type: form.get("type"), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: form.get("endsAt") ? new Date(String(form.get("endsAt"))).toISOString() : undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); formElement.reset(); await query.reload(); } catch (value) { window.alert(value instanceof Error ? value.message : "Could not create calendar event"); } }
  return <div className="space-y-5">
    {(canManage && courseId) || !courseId ? <details className="rounded-lg border border-border bg-card p-4 shadow-subtle"><summary className="cursor-pointer font-semibold text-primary">{courseId ? "Create course event" : "Add personal event"}</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void createEvent(event)}><label className="text-sm">Title<input className={`${inputClass} mt-1`} name="title" required /></label><label className="text-sm">Event type<select className={`${inputClass} mt-1`} name="type">{courseId ? <><option value="COURSE_EVENT">Course event</option><option value="ANNOUNCEMENT">Announcement</option><option value="COURSE_START">Course start</option><option value="COURSE_END">Course end</option></> : <><option value="COURSE_EVENT">Personal schedule</option><option value="ANNOUNCEMENT">Personal reminder</option></>}</select></label><label className="text-sm">Starts<input className={`${inputClass} mt-1`} name="startsAt" type="datetime-local" required /></label><label className="text-sm">Ends (optional)<input className={`${inputClass} mt-1`} name="endsAt" type="datetime-local" /></label><label className="text-sm sm:col-span-2">Description<textarea className={`${inputClass} mt-1`} name="description" /></label><button className={buttonClass}>{courseId ? "Create event and notify learners" : "Add to my calendar"}</button></form></details> : null}
    <div className="grid grid-cols-2 items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-subtle sm:flex sm:flex-wrap sm:p-4"><label className="min-w-0 text-sm">From<input className={`${inputClass} mt-1 px-2 sm:px-3`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="min-w-0 text-sm">To<input className={`${inputClass} mt-1 px-2 sm:px-3`} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><label className="col-span-2 min-w-0 text-sm sm:col-span-1 sm:min-w-52">Type<select className={`${inputClass} mt-1`} value={type} onChange={(e) => setType(e.target.value)}><option value="">All events</option><option value="live_class">Live classes</option><option value="course_announcement">Announcements</option><option value="assignment_due">Assignment deadlines</option><option value="quiz_available">Quiz availability</option><option value="quiz_due">Quiz deadlines</option></select></label><button className="min-h-10 rounded-md border border-border bg-card px-4 text-sm font-semibold text-primary hover:bg-muted" onClick={goToToday} type="button">Today</button><div className="col-span-2 grid grid-cols-2 rounded-md border border-border p-1 sm:ml-auto sm:flex"><button className={`rounded px-3 py-2 text-sm font-semibold ${mode === "agenda" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setMode("agenda")}>Agenda</button><button className={`rounded px-3 py-2 text-sm font-semibold ${mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setMode("month")}>Month</button></div></div>
    {query.loading ? <LoadingState title="Loading learning calendar" /> : query.error ? <ApiErrorState error={query.error} fallbackTitle="Could not load calendar" /> : !query.data?.length ? <EmptyState icon={CalendarDays} title="No learning events in this range" description="Try a broader date range or add a personal event." /> : mode === "agenda" ? <div className="space-y-6">{Object.entries(grouped).map(([date, events]) => <section key={date}><h2 className="mb-2 text-sm font-semibold text-muted-foreground">{date}</h2><div className="space-y-2">{events.map((event) => <CalendarEventCard event={event} key={`${event.sourceType}-${event.sourceId}-${event.type}`} onDelete={event.sourceType === "custom" && (canManage || event.metadata?.editable) ? async () => { await api.deleteCalendarEvent(event.sourceId); await query.reload(); } : undefined} onOpen={() => void openEvent(event)} />)}</div></section>)}</div> : <div className="overflow-hidden rounded-lg border border-border bg-card p-1.5 sm:p-3"><div className="grid w-full min-w-0 grid-cols-7 gap-px overflow-hidden rounded-md bg-border"><div className="contents">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <div className="min-w-0 bg-muted px-0.5 py-2 text-center text-[10px] font-semibold sm:p-2 sm:text-xs" key={label}>{label}</div>)}</div>{Array.from({ length: start.getDay() }).map((_, index) => <div className="min-h-20 min-w-0 bg-background sm:min-h-28" key={`blank-${index}`} />)}{days.map((day) => { const isToday = day.toDateString() === today.toDateString(); const events = (query.data ?? []).filter((event) => new Date(event.startsAt).toDateString() === day.toDateString()); return <div className={`min-h-20 min-w-0 overflow-hidden p-1 sm:min-h-28 sm:p-2 ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : "bg-card"}`} key={day.toISOString()}><div className="flex min-w-0 items-center justify-between gap-1"><p className={`text-[10px] font-semibold sm:text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.getDate()}</p>{isToday ? <span className="truncate text-[7px] font-bold uppercase text-primary sm:text-[9px]">Today</span> : null}</div><div className="mt-1 space-y-0.5 sm:mt-2 sm:space-y-1">{events.slice(0, 2).map((event) => <button aria-label={event.title} className={`block w-full min-w-0 truncate rounded px-1 py-0.5 text-left text-[8px] font-semibold sm:px-1.5 sm:py-1 sm:text-[11px] ${event.visibility === "personal" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`} key={`${event.sourceId}-${event.type}`} onClick={() => void openEvent(event)} title={event.title}>{event.title}</button>)}{events.length > 2 ? <p className="truncate text-[8px] text-muted-foreground sm:text-[11px]">+{events.length - 2}</p> : null}</div></div>; })}</div></div>}
  </div>;
}

function CalendarEventCard({ event, onOpen, onDelete }: { event: CalendarEvent; onOpen: () => void; onDelete?: () => void }) {
  const labels: Record<string, string> = { live_class: "Live class", assignment_due: "Assignment due", quiz_available: "Quiz opens", quiz_due: "Quiz due", course_announcement: "Announcement" };
  return <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-subtle sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary"><span className="text-[10px] font-semibold uppercase">{new Date(event.startsAt).toLocaleDateString(undefined, { month: "short" })}</span><span className="text-lg font-bold leading-none">{new Date(event.startsAt).getDate()}</span></div><div className="min-w-0"><StatusBadge value={labels[event.type] ?? event.type.replaceAll("_", " ")} tone={event.type === "live_class" ? "success" : "info"} /><h3 className="mt-2 truncate font-semibold">{event.title}</h3><p className="mt-1 text-sm text-muted-foreground">{new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{event.metadata?.courseTitle ? ` · ${event.metadata.courseTitle}` : ""}</p></div></div><div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto"><button className={buttonClass} onClick={onOpen}>{event.type === "live_class" ? "Join live class" : event.type === "assignment_due" ? "Open assignment" : event.type.startsWith("quiz") ? "Open quiz" : "View"}</button>{onDelete ? <button className="min-h-10 rounded-md border border-destructive px-3 text-sm font-semibold text-destructive" onClick={onDelete}>Delete</button> : null}</div></article>;
}

export function NotificationBadge() {
  const count = useLoad(() => api.unreadNotificationCount(), []);
  const notifications = useLoad(() => api.notifications(), []);
  const [open, setOpen] = useState(false);
  async function markRead(item: InAppNotification) { if (!item.readAt) { await api.markNotificationRead(item.id); await Promise.all([count.reload(), notifications.reload()]); } }
  return <div className="relative">
    <button aria-expanded={open} aria-haspopup="dialog" aria-label={`Notifications${count.data?.count ? `, ${count.data.count} unread` : ""}`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-subtle hover:text-foreground" onClick={() => setOpen((value) => !value)} type="button"><Bell className="h-4 w-4" />{count.data?.count ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-xs text-destructive-foreground">{count.data.count > 99 ? "99+" : count.data.count}</span> : null}</button>
    {open ? <div className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-panel" role="dialog" aria-label="Recent notifications"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{count.data?.count ?? 0} unread</p></div>{count.data?.count ? <button className="text-xs font-semibold text-primary" onClick={async () => { await api.markAllNotificationsRead(); await Promise.all([count.reload(), notifications.reload()]); }}>Mark all read</button> : null}</div><div className="max-h-96 overflow-y-auto">{notifications.loading ? <p className="p-5 text-sm text-muted-foreground">Loading notifications…</p> : !notifications.data?.length ? <p className="p-5 text-sm text-muted-foreground">You’re all caught up.</p> : notifications.data.slice(0, 6).map((item) => <button className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted ${item.readAt ? "" : "bg-primary/5"}`} key={item.id} onClick={() => void markRead(item)}><div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-muted" : "bg-primary"}`} /><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.body}</span><span className="mt-1 block text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></span></div></button>)}</div><Link className="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-muted" href="/notifications" onClick={() => setOpen(false)}>View all notifications</Link></div> : null}
  </div>;
}
