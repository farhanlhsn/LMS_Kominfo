"use client";
import { AuthGate } from "../../../components/auth/auth-gate";
import { InstructorDiscussionHub } from "../../../components/engagement/engagement";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
export default function AdminDiscussionModerationPage() { return <AuthGate><AppShell currentPath="/admin/discussions"><PageHeader eyebrow="Organization moderation" title="Discussion moderation" description="Review and moderate discussions within the active organization." /><InstructorDiscussionHub admin /></AppShell></AuthGate>; }
