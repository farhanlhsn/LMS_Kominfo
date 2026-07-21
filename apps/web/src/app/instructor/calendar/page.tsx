"use client";
import { AuthGate } from "../../../components/auth/auth-gate";
import { InstructorScheduleHub } from "../../../components/engagement/engagement";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
export default function InstructorCalendarPage() { return <AuthGate><AppShell currentPath="/instructor/calendar"><PageHeader eyebrow="Instructor" title="Teaching schedule" description="Review live classes, assignment deadlines, quizzes, and course announcements." /><InstructorScheduleHub /></AppShell></AuthGate>; }
