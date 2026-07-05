"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, DiscussionList } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function InstructorDiscussionsPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/instructor/discussions"><PageHeader eyebrow="Course management" title="Discussions" description="Review, participate in, and moderate course conversations." /><CoursePhaseNavigation courseId={courseId} active="discussion" instructor /><DiscussionList courseId={courseId} manager /></AppShell></AuthGate>; }
