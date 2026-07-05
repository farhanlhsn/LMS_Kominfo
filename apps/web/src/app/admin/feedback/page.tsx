"use client";

import { useState } from "react";
import { PageHeader, ButtonLink, FilterBar, StatusBadge } from "../../../components/ui/core";
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

  const courseList = (courses.data ?? []) as Array<{ id: string; title: string; slug: string }>;
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
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Course feedback"
        description="Aggregated ratings and qualitative comments from learners."
      />

      <FilterBar>
        <select
          aria-label="Select course"
          className="h-10 rounded-md border border-input bg-card px-3 text-sm"
          onChange={(e) => setSelectedCourseId(e.target.value || null)}
          value={selectedCourseId ?? ""}
        >
          <option value="">Select a course…</option>
          {courseList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
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

      <div className="mt-6 flex gap-2">
        <ButtonLink href="/admin" variant="secondary">
          ← Back to admin
        </ButtonLink>
      </div>
    </div>
  );
}
