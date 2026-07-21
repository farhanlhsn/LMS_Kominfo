"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, DiscussionList } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function CourseDiscussionsPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/my-learning"><PageHeader eyebrow="Course community" title="Discussions" description="Ask questions, share ideas, and learn with your course community." breadcrumbs={[{ label: "Course", href: `/learn/courses/${courseId}` }, { label: "Discussions" }]} /><CoursePhaseNavigation courseId={courseId} active="discussion" /><DiscussionList courseId={courseId} /></AppShell></AuthGate>; }
