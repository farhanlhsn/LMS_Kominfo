"use client";

import { use, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { useInstructorCourseRoster } from "../../../../../lib/api-hooks";
import { CoursePhaseNavigation } from "../../../../../components/engagement/engagement";

export default function RosterPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const query = useInstructorCourseRoster(courseId, { limit: "100" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const rows = useMemo(() => (query.data?.data ?? []).filter((row: any) => {
    const matchSearch = !search.trim() || `${row.user?.name ?? ""} ${row.user?.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchSearch && (!status || row.status === status);
  }), [query.data, search, status]);

  return <AuthGate><AppShell currentPath="/instructor/courses">
    <PageHeader eyebrow="Instructor" title="Student roster" description="Review enrollment status and learner progress." actions={<ButtonLink href={`/instructor/courses/${courseId}/builder`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Course builder</ButtonLink>} />
    <CoursePhaseNavigation courseId={courseId} active="roster" instructor />
    <div className="mb-4 flex flex-wrap gap-3"><input className="h-10 min-w-64 flex-1 rounded-md border border-input bg-card px-3 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Search learner" type="search" value={search} /><select className="h-10 rounded-md border border-input bg-card px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="DROPPED">Dropped</option></select></div>
    {query.loading ? <LoadingState title="Loading roster" /> : query.error ? <ApiErrorState error={query.error} fallbackTitle="Could not load roster" /> : !rows.length ? <EmptyState title="No learners found" description="Enrolled learners appear here." /> : <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="min-w-[680px] w-full text-sm"><thead className="border-b border-border bg-muted/40"><tr>{["Learner", "Status", "Progress", "Last accessed", "Enrolled"].map((header) => <th className="px-4 py-3 text-left font-semibold" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr className="border-b border-border last:border-0" key={row.id}><td className="px-4 py-3"><p className="font-semibold">{row.user?.name ?? "Unnamed learner"}</p><p className="text-xs text-muted-foreground">{row.user?.email}</p></td><td className="px-4 py-3"><StatusBadge value={row.status} /></td><td className="px-4 py-3">{row.progressPercent}%</td><td className="px-4 py-3 text-muted-foreground">{row.lastAccessedAt ? new Date(row.lastAccessedAt).toLocaleString() : "Never"}</td><td className="px-4 py-3 text-muted-foreground">{row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}
  </AppShell></AuthGate>;
}
