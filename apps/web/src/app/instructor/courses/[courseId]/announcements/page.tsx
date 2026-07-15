"use client";

import { use, useState, type FormEvent } from "react";
import { ArrowLeft, Megaphone } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, PageHeader } from "../../../../../components/ui/core";
import { ApiErrorState, LoadingState } from "../../../../../components/ui/states";
import { CoursePhaseNavigation } from "../../../../../components/engagement/engagement";
import { api } from "../../../../../lib/api-client";
import { useInstructorCourse } from "../../../../../lib/api-hooks";

export default function InstructorAnnouncementsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const course = useInstructorCourse(courseId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      const thread = await api.createDiscussionThread({
        courseId,
        title: String(form.get("title") ?? "").trim(),
        body: String(form.get("body") ?? "").trim(),
      });
      await api.moderateDiscussionThread(thread.id, { pinned: true });
      event.currentTarget.reset();
      setMessage("Announcement published and learners notified.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not publish announcement");
    } finally {
      setBusy(false);
    }
  }

  return <AuthGate><AppShell currentPath="/instructor/courses">
    {course.loading ? <LoadingState title="Loading course" /> : course.error || !course.data ? <ApiErrorState error={course.error} fallbackTitle="Could not load course" /> : <>
      <PageHeader eyebrow="Instructor" title="Announcements" description={`Send a pinned course announcement to all learners in ${course.data.title}.`} actions={<ButtonLink href={`/instructor/courses/${courseId}/builder`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Course builder</ButtonLink>} />
      <CoursePhaseNavigation courseId={courseId} active="announcements" instructor />
      <section className="max-w-2xl rounded-lg border border-border bg-card p-5 shadow-subtle">
        <div className="flex items-start gap-3"><Megaphone className="mt-1 h-5 w-5 text-primary" /><div><h2 className="text-lg font-semibold">New announcement</h2><p className="mt-1 text-sm text-muted-foreground">Announcement posts appear as pinned discussions. Delivery is immediate.</p></div></div>
        <form className="mt-5 space-y-4" onSubmit={publish}>
          <label className="block text-sm font-medium">Title<input className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" maxLength={160} minLength={3} name="title" required /></label>
          <label className="block text-sm font-medium">Message<textarea className="mt-1 min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={20000} name="body" required /></label>
          <button className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy} type="submit">{busy ? "Publishing…" : "Publish announcement"}</button>
          {message ? <p className="rounded-md bg-muted p-3 text-sm" role="status">{message}</p> : null}
        </form>
      </section>
    </>}
  </AppShell></AuthGate>;
}
