"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { PERMISSIONS } from "@lms/shared";
import { AuthGate, PermissionGate } from "../../../components/auth/auth-gate";
import { AppShell } from "../../../components/layout/shells";
import { PageHeader, FilterBar, StatusBadge } from "../../../components/ui/core";
import { CourseFeedbackSummary } from "../../../components/experiences/experiences-views";
import { useCourses, useCourseFeedback } from "../../../lib/api-hooks";
import { useSubmitCourseFeedback } from "../../../lib/api-hooks";

export default function AdminFeedbackPage() {
  const courses = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const feedback = useCourseFeedback(selectedCourseId);
  const submit = useSubmitCourseFeedback();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courseList = (Array.isArray(courses.data) ? courses.data : (courses.data as any)?.data ?? []) as Array<{ id: string; title: string; slug: string }>;
  const active = courseList.find((c) => c.id === selectedCourseId);

  const handleSimulate = async () => {
    if (!selectedCourseId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit({ courseId: selectedCourseId, rating, comment: comment || undefined });
      setComment("");
      await feedback.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <PermissionGate anyOf={[PERMISSIONS.analyticsView]}>
    <AppShell currentPath="/admin/feedback">
      <div>
        <PageHeader
        eyebrow="Admin"
        title="Course feedback"
        description="Aggregated ratings and qualitative comments from learners."
      />

      <FilterBar>
        <div className="relative w-full">
          <Select value={selectedCourseId ?? ""} onValueChange={(val) => setSelectedCourseId(val || null)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select a course…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Select a course…</SelectItem>
              {courseList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <StatusBadge value={`${courseList.length} courses`} tone="info" />
      </FilterBar>

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {active ? (
            <CourseFeedbackSummary data={feedback.data ?? null} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a course to view feedback.</p>
          )}
        </div>
        <section className="rounded-lg border border-border bg-card p-4 shadow-subtle">
          <h2 className="text-sm font-semibold">Simulate submission</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this to populate the feedback panel while testing.
          </p>
          {active ? (
            <div className="mt-3 grid gap-2">
              <label className="block text-xs">
                Rating (1–5)
                <input
                  className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
                  max={5}
                  min={1}
                  onChange={(e) => setRating(Number(e.target.value))}
                  type="number"
                  value={rating}
                />
              </label>
              <label className="block text-xs">
                Comment
                <textarea
                  className="mt-1 min-h-16 w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
                  onChange={(e) => setComment(e.target.value)}
                  value={comment}
                />
              </label>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <button
                className="rounded-md border border-primary bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                disabled={submitting}
                onClick={handleSimulate}
                type="button"
              >
                {submitting ? "Saving…" : "Submit feedback"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Select a course first.</p>
          )}
        </section>
      </div>
      </div>
    </AppShell>
      </PermissionGate>
    </AuthGate>
  );
}
