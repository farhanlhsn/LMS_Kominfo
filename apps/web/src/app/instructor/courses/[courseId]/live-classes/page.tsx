"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, LiveClassList } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function ManageLiveClassesPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/instructor/courses"><PageHeader eyebrow="Course management" title="Live classes" description="Schedule, review, and cancel live learning sessions." breadcrumbs={[{ label: "Courses", href: "/instructor/courses" }, { label: "Live classes" }]} /><CoursePhaseNavigation courseId={courseId} active="live" instructor /><LiveClassList courseId={courseId} canManage /></AppShell></AuthGate>; }
