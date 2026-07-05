"use client";
import { useParams } from "next/navigation";
import { AuthGate } from "../../../../../../components/auth/auth-gate";
import { DiscussionDetail } from "../../../../../../components/engagement/engagement";
import { AppShell } from "../../../../../../components/layout/shells";
export default function DiscussionPage() { const { courseId, threadId } = useParams<{ courseId: string; threadId: string }>(); return <AuthGate><AppShell currentPath="/my-learning" showBackButton backHref={`/learn/courses/${courseId}/discussions`} backLabel="Discussions"><DiscussionDetail threadId={threadId} /></AppShell></AuthGate>; }
