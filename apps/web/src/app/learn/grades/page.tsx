"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { apiBaseUrl } from "../../../lib/api-client";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../../../components/ui/states";
import { MetricCard } from "../../../components/analytics/charts";
import { useLearnerGrades } from "../../../lib/api-hooks";
import type { LearnerCourseGrade } from "../../../lib/lms-types";

function percentColor(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

export default function LearnerGradesPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const gradesQuery = useLearnerGrades();

  const filtered = useMemo(() => {
    const data = gradesQuery.data?.courses ?? [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((c) => c.courseTitle.toLowerCase().includes(q));
  }, [gradesQuery.data, search]);

  return (
    <AuthGate>
      <AppShell currentPath="/my-learning">
        <PageHeader
          eyebrow="Learner"
          title="My Grades"
          description="Quiz and assignment scores across all your courses."
        />

        <div className="mb-4 flex items-center justify-between">
          <div />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium hover:bg-muted"
            onClick={() => window.open(`${apiBaseUrl()}/learn/progress/export`, "_blank")}
            type="button"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {gradesQuery.loading ? (
          <LoadingState title="Loading grades" />
        ) : gradesQuery.error ? (
          <ApiErrorState error={gradesQuery.error} fallbackTitle="Could not load grades" />
        ) : gradesQuery.data ? (
          <>
            {/* Overall GPA */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Overall GPA"
                value={gradesQuery.data.overallGpa != null ? `${gradesQuery.data.overallGpa}%` : "—"}
                sublabel="Across all courses"
              />
              <MetricCard
                label="Courses with grades"
                value={String(gradesQuery.data.courses.filter((c) => c.overallGrade != null).length)}
                sublabel={`of ${gradesQuery.data.courses.length} enrolled`}
              />
              <MetricCard
                label="Quizzes graded"
                value={String(gradesQuery.data.courses.reduce((s, c) => s + c.quizzes.length, 0))}
              />
              <MetricCard
                label="Assignments graded"
                value={String(gradesQuery.data.courses.reduce((s, c) => s + c.assignments.length, 0))}
              />
            </div>

            {filtered.length === 0 && search ? (
              <EmptyState title="No matching courses" description="Try a different search term." />
            ) : null}

            <FilterBar onClear={() => setSearch("")}>
              <label className="flex min-h-10 min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                <span className="sr-only">Search courses</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses"
                  type="search"
                  value={search}
                />
              </label>
            </FilterBar>

            <div className="mt-5 space-y-4">
              {filtered.map((course) => (
                <CourseGradeCard
                  key={course.courseId}
                  course={course}
                  expanded={expanded === course.courseId}
                  onToggle={() =>
                    setExpanded(expanded === course.courseId ? null : course.courseId)
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No grades yet"
            description="Complete quizzes and assignments to see your scores here."
          />
        )}
      </AppShell>
    </AuthGate>
  );
}

function CourseGradeCard({
  course,
  expanded,
  onToggle,
}: {
  course: LearnerCourseGrade;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasGrades = course.overallGrade != null || course.quizzes.length > 0 || course.assignments.length > 0;

  return (
    <section className="rounded-lg border border-border bg-card shadow-subtle">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-base font-semibold">{course.courseTitle}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quiz avg: {course.quizAverage != null ? `${course.quizAverage}%` : "—"}
              <span className="mx-2">·</span>
              Assignment avg: {course.assignmentAverage != null ? `${course.assignmentAverage}%` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {course.overallGrade != null ? (
            <span className={`text-lg font-bold ${percentColor(course.overallGrade)}`}>
              {course.overallGrade}%
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No grade</span>
          )}
          <svg
            className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {!hasGrades ? (
            <p className="text-sm text-muted-foreground">No graded assessments yet.</p>
          ) : (
            <>
              {course.quizzes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Quizzes</h4>
                  <DataTable
                    columns={["Quiz", "Score", "Max", "%", "Passed", "Date"]}
                    rows={course.quizzes.map((q) => [
                      q.quizTitle,
                      String(q.score),
                      String(q.maxScore),
                      <span key="pct" className={percentColor(q.percentage)}>{q.percentage}%</span>,
                      <StatusBadge key="pass" value={q.passed ? "PASSED" : "FAILED"} tone={q.passed ? "success" : "danger"} />,
                      new Date(q.attemptedAt).toLocaleDateString(),
                    ])}
                  />
                </div>
              )}
              {course.assignments.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Assignments</h4>
                  <DataTable
                    columns={["Assignment", "Score", "Max", "%", "Status", "Graded"]}
                    rows={course.assignments.map((a) => [
                      a.assignmentTitle,
                      a.score != null ? String(a.score) : "—",
                      a.maxScore != null ? String(a.maxScore) : "—",
                      a.percentage != null ? <span key="pct" className={percentColor(a.percentage)}>{a.percentage}%</span> : "—",
                      <StatusBadge key="status" value={a.status} />,
                      a.gradedAt ? new Date(a.gradedAt).toLocaleDateString() : "—",
                    ])}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
