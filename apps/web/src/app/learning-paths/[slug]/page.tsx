"use client";

import { ArrowRight,BookOpen,CheckCircle,Clock,Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader,StatCard,StatusBadge } from "../../../components/ui/core";
import { ApiErrorState,LoadingState } from "../../../components/ui/states";
import {
  useLearningPath,
  useMyLearningPathEnrollments,
} from "../../../lib/api-hooks";

export default function LearningPathDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : null;
  const query = useLearningPath(slug);
  const enrollments = useMyLearningPathEnrollments();
  const path = query.data;
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const enrollment = (enrollments.data ?? []).find(
    (item) => item.learningPathId === path?.id,
  );

  async function handleEnroll() {
    if (!path) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const { api } = await import("../../../lib/api-client");
      await api.enrollLearningPath(path.id);
      await Promise.all([query.reload(), enrollments.reload()]);
    } catch (error) {
      setEnrollError(error instanceof Error ? error.message : String(error));
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <AuthGate>
      <AppShell currentPath="/learning-paths">
        {query.loading ? (
          <LoadingState title="Loading learning path" />
        ) : query.error ? (
          <ApiErrorState error={query.error} fallbackTitle="Could not load learning path" />
        ) : path ? (
          <>
            <PageHeader
              eyebrow="Learning Path"
              title={path.title}
              description={path.description ?? undefined}
              breadcrumbs={[{ label: "Learning Paths", href: "/learning-paths" }, { label: path.title }]}
              actions={
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  disabled={enrolling || Boolean(enrollment)}
                  onClick={() => void handleEnroll()}
                  type="button"
                >
                  {enrollment
                    ? "Enrolled"
                    : enrolling
                      ? "Enrolling..."
                      : "Enroll now"}
                  {enrollment ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </button>
              }
            />
            {enrollError ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                {enrollError}
              </p>
            ) : null}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard icon={BookOpen} label="Courses" value={String(path.courses?.length ?? 0)} />
              <StatCard icon={Users} label="Enrolled" value={String(path._count?.enrollments ?? 0)} />
              {path.durationHours > 0 ? <StatCard icon={Clock} label="Duration" value={path.durationHours + "h"} /> : null}
            </div>

            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Courses in this path</h2>
              {path.courses?.length ? (
                <div className="mt-4 divide-y divide-border">
                  {path.courses.map((pc, index) => (
                    <div key={pc.id} className="flex items-center gap-4 py-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={"/courses/" + encodeURIComponent(pc.course.slug)} className="text-sm font-semibold hover:text-primary">
                          {pc.course.title}
                        </Link>
                        {pc.course.level ? <p className="mt-1 text-xs text-muted-foreground">Level: {pc.course.level}</p> : null}
                      </div>
                      {pc.required ? <StatusBadge value="Required" tone="info" /> : <StatusBadge value="Optional" tone="neutral" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No courses added yet.</p>
              )}
            </section>
          </>
        ) : null}
      </AppShell>
    </AuthGate>
  );
}
