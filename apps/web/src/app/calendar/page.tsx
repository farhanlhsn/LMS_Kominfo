"use client";
import { AuthGate } from "../../components/auth/auth-gate";
import { LearningCalendar } from "../../components/engagement/engagement";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
export default function CalendarPage() { return <AuthGate><AppShell currentPath="/calendar"><PageHeader eyebrow="Learning schedule" title="Calendar" description="Live classes, assignment deadlines, and quiz dates visible to you." /><LearningCalendar /></AppShell></AuthGate>; }
