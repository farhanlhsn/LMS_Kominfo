"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { CoursePhaseNavigation, LearningCalendar } from "../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../components/layout/shells";
import { PageHeader } from "../../../../../components/ui/core";
export default function InstructorCalendarPage() { const { courseId } = useParams<{ courseId: string }>(); return <AuthGate><AppShell currentPath="/instructor/courses"><PageHeader eyebrow="Course management" title="Schedule" description="Review this course’s live classes, assignment deadlines, quizzes, and announcements." /><CoursePhaseNavigation courseId={courseId} active="calendar" instructor /><LearningCalendar courseId={courseId} canManage /></AppShell></AuthGate>; }
