"use client";

import { use, useMemo, useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { AuthGate } from "../../../../../components/auth/auth-gate";
import { AppShell } from "../../../../../components/layout/shells";
import { ButtonLink, PageHeader, StatusBadge } from "../../../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../../../components/ui/states";
import { useInstructorCourseGradebook } from "../../../../../lib/api-hooks";
import type { InstructorGradebookRow } from "../../../../../lib/lms-types";
import { CoursePhaseNavigation } from "../../../../../components/engagement/engagement";

export default function GradebookPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const query = useInstructorCourseGradebook(courseId);
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();
    return (query.data?.data ?? []).filter((row: InstructorGradebookRow) =>
      !value || `${row.student.name ?? ""} ${row.student.email}`.toLowerCase().includes(value),
    );
  }, [query.data, search]);

  function exportCsv() {
    const header = ["Student", "Email", "Progress", "Average", ...((query.data?.data[0]?.assignmentScores ?? []).map((item) => item.title))];
    const body = rows.map((row) => [
      row.student.name ?? "",
      row.student.email,
      row.progressPercent,
      row.average ?? "",
      ...row.assignmentScores.map((item) => item.score == null ? "" : `${item.score}/${item.maxScore ?? ""}`),
    ]);
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gradebook.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <AuthGate><AppShell currentPath="/instructor/courses">
    <PageHeader eyebrow="Instructor" title="Gradebook" description="Review learner progress and assignment scores." actions={<div className="flex gap-2"><ButtonLink href={`/instructor/courses/${courseId}/builder`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Course builder</ButtonLink><button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={exportCsv} type="button"><Download className="h-4 w-4" />Export CSV</button></div>} />
    <CoursePhaseNavigation courseId={courseId} active="gradebook" instructor />
    <div className="mb-4 flex flex-wrap gap-3"><input className="h-10 min-w-64 flex-1 rounded-md border border-input bg-card px-3 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Search learner" type="search" value={search} /></div>
    {query.loading ? <LoadingState title="Loading gradebook" /> : query.error ? <ApiErrorState error={query.error} fallbackTitle="Could not load gradebook" /> : !rows.length ? <EmptyState title="No learners found" description="Enrolled learners and assignment scores appear here." /> : <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="min-w-[760px] w-full text-sm"><thead className="border-b border-border bg-muted/40"><tr>{["Learner", "Progress", "Average", "Status", "Assignments"].map((header) => <th className="px-4 py-3 text-left font-semibold" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-b border-border last:border-0" key={row.studentId}><td className="px-4 py-3"><p className="font-semibold">{row.student.name ?? "Unnamed learner"}</p><p className="text-xs text-muted-foreground">{row.student.email}</p></td><td className="px-4 py-3">{row.progressPercent}%</td><td className="px-4 py-3 font-semibold">{row.average == null ? "—" : `${row.average}%`}</td><td className="px-4 py-3"><StatusBadge value={row.enrollmentStatus} /></td><td className="px-4 py-3"><div className="flex max-w-[34rem] flex-wrap gap-1.5">{row.assignmentScores.map((item) => <span className="rounded bg-muted px-2 py-1 text-xs" key={item.assignmentId}>{item.title}: {item.score == null ? "—" : `${item.score}/${item.maxScore ?? ""}`}</span>)}</div></td></tr>)}</tbody></table></div>}
  </AppShell></AuthGate>;
}
