"use client";
import { AuthGate } from "../../../components/auth/auth-gate";
import { InstructorDiscussionHub } from "../../../components/engagement/engagement";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
export default function InstructorDiscussionsPage() { return <AuthGate><AppShell currentPath="/instructor/discussions"><PageHeader eyebrow="Instructor" title="Discussions" description="Manage pinned, locked, hidden, and active discussions across your courses." /><InstructorDiscussionHub /></AppShell></AuthGate>; }
