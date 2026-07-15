import { describe, expect, it, vi } from "vitest";
import {
  AdminCohortController,
  LearnerCohortController,
  MeTimezoneController,
} from "./scheduling.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Scheduling controllers", () => {
  it("admin cohort endpoints cover members and schedule", async () => {
    const service = {
      listCohorts: vi.fn().mockResolvedValue([]),
      createCohort: vi.fn().mockResolvedValue({ id: "c1" }),
      getCohort: vi.fn().mockResolvedValue({ id: "c1" }),
      updateCohort: vi.fn().mockResolvedValue({ id: "c1" }),
      deleteCohort: vi.fn().mockResolvedValue({ id: "c1" }),
      addMember: vi.fn().mockResolvedValue({ id: "m1" }),
      removeMember: vi.fn().mockResolvedValue({ id: "m1" }),
      listSchedule: vi.fn().mockResolvedValue([]),
      addSchedule: vi.fn().mockResolvedValue({ id: "s1" }),
      batchAddSchedule: vi.fn().mockResolvedValue([]),
    };
    const admin = new AdminCohortController(service as any);
    await admin.list(org, user, "course-1", "PLANNED" as any);
    await admin.list(org, user);
    await admin.create(org, user, { name: "C" } as any);
    await admin.get(org, user, "c1");
    await admin.update(org, user, "c1", { name: "C2" } as any);
    await admin.remove(org, user, "c1");
    await admin.addMember(org, user, "c1", { userId: "u2" } as any);
    await admin.removeMember(org, user, "c1", "u2");
    await admin.listSchedule(org, "c1");
    await admin.addSchedule(org, user, "c1", {
      weekday: 1,
      startTime: "09:00",
      endTime: "10:00",
    } as any);
    await admin.bulkAddSchedule(org, user, "c1", { items: [] } as any);
    expect(service.batchAddSchedule).toHaveBeenCalled();
  });

  it("learner and timezone controllers", async () => {
    const service = {
      listMyCohorts: vi.fn().mockResolvedValue([]),
      getMyTimezone: vi.fn().mockResolvedValue({ timezone: "UTC" }),
      updateMyTimezone: vi.fn().mockResolvedValue({ timezone: "Asia/Jakarta" }),
    };
    const learner = new LearnerCohortController(service as any);
    await learner.listMine(org, user);
    const tz = new MeTimezoneController(service as any);
    await tz.get(org, user);
    await tz.update(org, user, { timezone: "Asia/Jakarta" } as any);
    expect(service.updateMyTimezone).toHaveBeenCalled();
  });
});
