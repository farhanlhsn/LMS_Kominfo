"use client";
import { AuthGate } from "../../components/auth/auth-gate";
import { LearnerDiscussionHub } from "../../components/engagement/engagement";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
export default function MyDiscussionsPage() { return <AuthGate><AppShell currentPath="/discussions"><PageHeader eyebrow="Learning community" title="My discussions" description="Browse and participate in discussions from all courses you are enrolled in." /><LearnerDiscussionHub /></AppShell></AuthGate>; }
