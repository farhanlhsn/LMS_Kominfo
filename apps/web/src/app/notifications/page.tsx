"use client";
import { AuthGate } from "../../components/auth/auth-gate";
import { NotificationCenter } from "../../components/engagement/engagement";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
export default function NotificationsPage() { return <AuthGate><AppShell currentPath="/notifications"><PageHeader eyebrow="Updates" title="Notifications" description="Course activity, live class changes, and learning reminders." /><NotificationCenter /></AppShell></AuthGate>; }
