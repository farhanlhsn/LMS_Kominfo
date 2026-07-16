"use client";

import { useState } from "react";
import {
  useCohort,
  useCohortSchedule,
  useAddCohortMember,
  useRemoveCohortMember,
  useAddCohortSchedule,
} from "../../lib/api-hooks";
import { Button } from "../ui/button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CohortManage({ cohortId }: { cohortId: string }) {
  const cohort = useCohort(cohortId);
  const schedule = useCohortSchedule(cohortId);
  const addMember = useAddCohortMember();
  const removeMember = useRemoveCohortMember();
  const addSchedule = useAddCohortSchedule();
  const [status, setStatus] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [slot, setSlot] = useState({ weekday: 1, startTime: "09:00", endTime: "10:00", meetingUrl: "" });

  async function handleAddMember() {
    if (!userId.trim()) return;
    setStatus(null);
    try {
      await addMember(cohortId, { userId: userId.trim() });
      setUserId("");
      await cohort.reload();
      setStatus("Member added.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleRemoveMember(id: string) {
    setStatus(null);
    try {
      await removeMember(cohortId, id);
      await cohort.reload();
      setStatus("Member removed.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleAddSchedule() {
    setStatus(null);
    try {
      await addSchedule(cohortId, {
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        meetingUrl: slot.meetingUrl || undefined,
      });
      setSlot({ weekday: 1, startTime: "09:00", endTime: "10:00", meetingUrl: "" });
      await schedule.reload();
      setStatus("Session added.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to add session");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {status ? <p className="md:col-span-2 text-xs text-muted-foreground">{status}</p> : null}

      <section>
        <h4 className="text-sm font-semibold">Members</h4>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {(cohort.data?.members ?? []).length === 0 ? (
            <li className="text-xs text-muted-foreground">No members yet.</li>
          ) : (
            (cohort.data?.members ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                <span>{m.user?.name ?? m.user?.email ?? m.userId} <span className="text-xs text-muted-foreground">({m.status})</span></span>
                <button type="button" onClick={() => void handleRemoveMember(m.userId)} className="text-xs text-destructive">
                  remove
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            className="h-9 flex-1 rounded border border-border px-2 text-sm"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Button size="sm" onClick={() => void handleAddMember()} disabled={!userId.trim()}>
            Add
          </Button>
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold">Weekly schedule</h4>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {(schedule.data ?? []).length === 0 ? (
            <li className="text-xs text-muted-foreground">No sessions yet.</li>
          ) : (
            (schedule.data ?? []).map((s) => (
              <li key={s.id} className="rounded border border-border px-2 py-1 text-xs">
                {WEEKDAYS[s.weekday] ?? s.weekday} {s.startTime}–{s.endTime}
                {s.meetingUrl ? ` · ${s.meetingUrl}` : ""}
              </li>
            ))
          )}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            aria-label="Weekday"
            className="h-9 rounded border border-border px-2 text-sm"
            value={slot.weekday}
            onChange={(e) => setSlot((s) => ({ ...s, weekday: Number(e.target.value) }))}
          >
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>{w}</option>
            ))}
          </select>
          <input
            className="h-9 rounded border border-border px-2 text-sm"
            placeholder="Meeting URL"
            value={slot.meetingUrl}
            onChange={(e) => setSlot((s) => ({ ...s, meetingUrl: e.target.value }))}
          />
          <input
            type="time"
            aria-label="Start time"
            className="h-9 rounded border border-border px-2 text-sm"
            value={slot.startTime}
            onChange={(e) => setSlot((s) => ({ ...s, startTime: e.target.value }))}
          />
          <input
            type="time"
            aria-label="End time"
            className="h-9 rounded border border-border px-2 text-sm"
            value={slot.endTime}
            onChange={(e) => setSlot((s) => ({ ...s, endTime: e.target.value }))}
          />
        </div>
        <Button size="sm" className="mt-2" onClick={() => void handleAddSchedule()}>
          Add session
        </Button>
      </section>
    </div>
  );
}
