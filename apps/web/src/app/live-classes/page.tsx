"use client";
import { AuthGate } from "../../components/auth/auth-gate";
import { LiveClassList } from "../../components/engagement/engagement";
import { AppShell } from "../../components/layout/shells";
import { PageHeader } from "../../components/ui/core";
export default function LiveClassesPage() { return <AuthGate><AppShell currentPath="/live-classes"><PageHeader eyebrow="Synchronous learning" title="Live classes" description="Your accessible scheduled and active course sessions." /><LiveClassList /></AppShell></AuthGate>; }
