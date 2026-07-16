"use client";

import { useState } from "react";
import {
  useCohorts,
  useAddCohortMember,
  useAddCohortSchedule,
  useCohortSchedule,
} from "../../lib/api-hooks";

export function CohortManagement() {
  const cohorts = useCohorts();
  const addMember = useAddCohortMember();
  const addSchedule = useAddCohortSchedule();
  const [activeId, setActiveId] = useState<string | null>(null);
  const schedule = useCohortSchedule(activeId);
  const [userId, setUserId] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleAddMember(cohortId: string) {
    if (!userId.trim()) return;
    setError(null);
    try {
      await addMember(cohortId, { userId: userId.trim() });
      setUserId("");
      setStatus("Member added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleAddSchedule(cohortId: string) {
    setError(null);
    try {
      await addSchedule(cohortId, {
        weekday: Number(weekday),
        startTime,
        endTime,
      });
      setStatus("Schedule added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add schedule");
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      <label className="text-sm">
        Cohort
        <select
          className="ml-2 rounded border border-border px-2 py-1"
          value={activeId ?? ""}
          onChange={(e) => setActiveId(e.target.value || null)}
        >
          <option value="">Select a cohort…</option>
          {(cohorts.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {activeId ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Add member</h3>
            <div className="mt-2 flex gap-2">
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user id"
                className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleAddMember(activeId)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                Add
              </button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Add schedule</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <label>
                Weekday
                <select
                  className="mt-1 w-full rounded border border-border px-2 py-1"
                  value={weekday}
                  onChange={(e) => setWeekday(e.target.value)}
                >
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input
                  type="time"
                  className="mt-1 w-full rounded border border-border px-2 py-1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  className="mt-1 w-full rounded border border-border px-2 py-1"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => void handleAddSchedule(activeId)}
                className="self-end rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                Add slot
              </button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4 md:col-span-2">
            <h3 className="text-sm font-semibold">Schedule slots</h3>
            {schedule.data?.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {schedule.data.map((s) => (
                  <li key={s.id}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.weekday]} ·{" "}
                    {s.startTime}–{s.endTime}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No schedule slots.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
