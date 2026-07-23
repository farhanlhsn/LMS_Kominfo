"use client";

import { useCallback, useState } from "react";
import {
  useCreateCohort,
  useInstructorCourses,
  useUpdateCohort,
} from "../../lib/api-hooks";
import { Button } from "../ui/button";
import type { Cohort, CohortStatus } from "../../lib/lms-types";

export interface CohortFormProps {
  initial?: Cohort | null;
  onSubmitted?: (cohort: Cohort) => void;
  onCancel?: () => void;
}

const ALL_STATUSES: CohortStatus[] = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

export function CohortForm({ initial, onSubmitted, onCancel }: CohortFormProps) {
  const create = useCreateCohort();
  const update = useUpdateCohort();
  const courses = useInstructorCourses();
  const [name, setName] = useState(initial?.name ?? "");
  const [courseId, setCourseId] = useState(initial?.courseId ?? "");
  const [startAt, setStartAt] = useState(initial?.startAt?.slice(0, 10) ?? "");
  const [endAt, setEndAt] = useState(initial?.endAt?.slice(0, 10) ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "UTC");
  const [maxSeats, setMaxSeats] = useState<number>(initial?.maxSeats ?? 0);
  const [status, setStatus] = useState<CohortStatus>(initial?.status ?? "PLANNED");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name || !courseId || !startAt || !endAt) {
      setError("Name, course, start and end are required");
      return;
    }
    setBusy(true);
    try {
      const result = initial
        ? await update(initial.id, {
            name,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            timezone,
            maxSeats,
            status,
          })
        : await create({
            name,
            courseId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            timezone,
            maxSeats,
            status,
          });
      onSubmitted?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cohort");
    } finally {
      setBusy(false);
    }
  }, [name, courseId, startAt, endAt, timezone, maxSeats, status, initial, create, update, onSubmitted]);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Name
          <input
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Course
          <select
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={Boolean(initial)}
          >
            <option value="">
              {courses.loading ? "Loading courses..." : "Select a course"}
            </option>
            {(courses.data ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Start date
          <input
            type="date"
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          End date
          <input
            type="date"
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Timezone
          <input
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Max seats
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={maxSeats}
            onChange={(e) => setMaxSeats(Number(e.target.value))}
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-1 w-full rounded border border-border px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as CohortStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? "Saving…" : initial ? "Update cohort" : "Create cohort"}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
