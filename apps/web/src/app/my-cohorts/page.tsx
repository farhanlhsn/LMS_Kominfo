"use client";

import { useState } from "react";
import { CalendarDays, Clock, Users } from "lucide-react";
import { AuthGate } from "../../components/auth/auth-gate";
import { AppShell } from "../../components/layout/shells";
import { PageHeader, StatusBadge } from "../../components/ui/core";
import { EmptyState, LoadingState, ApiErrorState } from "../../components/ui/states";
import { useCohortSchedule, useMyCohorts } from "../../lib/api-hooks";
import type { Cohort, CohortSchedule } from "../../lib/lms-types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ScheduleRow({ entry }: { entry: CohortSchedule }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
        {WEEKDAYS[entry.weekday] ?? entry.weekday}
      </span>
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>
        {entry.startTime} – {entry.endTime}
      </span>
      {entry.meetingUrl && (
        <a
          href={entry.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary underline-offset-2 hover:underline"
        >
          Join
        </a>
      )}
    </li>
  );
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  const [open, setOpen] = useState(false);
  const scheduleQuery = useCohortSchedule(open ? cohort.id : null);
  const schedule = scheduleQuery.data ?? [];

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{cohort.name}</span>
          {cohort.course && (
            <span className="text-xs text-muted-foreground">{cohort.course.title}</span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(cohort.startAt)} – {formatDate(cohort.endAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {cohort._count?.members ?? 0} / {cohort.maxSeats} seats
            </span>
            <span>{cohort.timezone}</span>
          </div>
        </div>
        <StatusBadge value={cohort.status} />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Weekly schedule
          </h3>
          {scheduleQuery.loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : schedule.length === 0 ? (
            <p className="text-xs text-muted-foreground">No schedule set for this cohort.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {schedule.map((entry) => (
                <ScheduleRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyCohorts() {
  const query = useMyCohorts();
  const cohorts = query.data ?? [];

  return (
    <AuthGate>
      <AppShell currentPath="/my-cohorts">
        <PageHeader
          eyebrow="My Learning"
          title="My Cohorts"
          description="Cohorts you are enrolled in, including schedules and session links."
        />

        {query.loading ? (
          <LoadingState title="Loading cohorts" />
        ) : query.error ? (
          <ApiErrorState error={query.error} fallbackTitle="Could not load cohorts" />
        ) : cohorts.length === 0 ? (
          <EmptyState
            title="No cohorts yet"
            description="You haven't been added to any cohort. Check with your instructor or admin."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {cohorts.map((cohort) => (
              <CohortCard key={cohort.id} cohort={cohort} />
            ))}
          </div>
        )}
      </AppShell>
    </AuthGate>
  );
}
