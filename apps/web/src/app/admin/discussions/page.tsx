"use client";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { PERMISSIONS } from "@lms/shared";
import { InstructorDiscussionHub } from "../../../components/engagement/engagement";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader } from "../../../components/ui/core";
export default function AdminDiscussionModerationPage() { return <AuthGate><PermissionGate anyOf={[PERMISSIONS.auditRead]}><AppShell currentPath="/admin/discussions"><PageHeader eyebrow="Organization moderation" title="Discussion moderation" description="Review and moderate discussions within the active organization." /><InstructorDiscussionHub admin /></AppShell></PermissionGate></AuthGate>; }
