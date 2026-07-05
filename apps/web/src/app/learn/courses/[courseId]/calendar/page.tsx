"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, LearningCalendar } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function CourseCalendarPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/my-learning"><PageHeader eyebrow="Course schedule" title="Calendar" description="Live classes, deadlines, and announcements for this course." /><CoursePhaseNavigation courseId={courseId} active="calendar" /><LearningCalendar courseId={courseId} /></AppShell></AuthGate>; }
