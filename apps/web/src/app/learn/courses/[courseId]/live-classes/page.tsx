"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, LiveClassList } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function CourseLiveClassesPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/my-learning"><PageHeader eyebrow="Course schedule" title="Live classes" description="Join scheduled live sessions for this course." /><CoursePhaseNavigation courseId={courseId} active="live" /><LiveClassList courseId={courseId} /></AppShell></AuthGate>; }
