import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SchedulingService } from "./scheduling.service";

const adminOrg = {
  id: "org-1",
  slug: "o",
  name: "Org",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: ["courses:update"],
  isPlatformAdmin: false,
};

function setup() {
  const prisma = {
    cohort: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cohortMember: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "m1",
        user: { id: "u2", email: "u2@e.c", name: "U2" },
      }),
      update: vi.fn().mockResolvedValue({ id: "m1" }),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    cohortSchedule: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops;
    }),
    course: { findFirst: vi.fn() },
    user: { update: vi.fn(), findFirst: vi.fn() },
    userTimezonePreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };
  return { service: new SchedulingService(prisma as any), prisma };
}

describe("SchedulingService", () => {
  it("lists my cohorts without manage permission", async () => {
    const { service, prisma } = setup();
    prisma.cohort.findMany.mockResolvedValue([{ id: "c1" }]);
    expect(await service.listMyCohorts("org-1", "u1")).toEqual([{ id: "c1" }]);
  });

  it("enforces manage permission for admin list", async () => {
    const { service } = setup();
    await expect(
      service.listCohorts(
        { ...adminOrg, permissionKeys: [] },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates cohort when course exists", async () => {
    const { service, prisma } = setup();
    prisma.course.findFirst.mockResolvedValue({ id: "course-1" });
    prisma.cohort.create.mockResolvedValue({ id: "coh-1" });
    const start = new Date("2026-01-01T00:00:00Z").toISOString();
    const end = new Date("2026-02-01T00:00:00Z").toISOString();
    await expect(
      service.createCohort(adminOrg as any, "admin", {
        courseId: "course-1",
        name: "Spring",
        startAt: start,
        endAt: end,
      } as any),
    ).resolves.toEqual({ id: "coh-1" });
  });

  it("rejects invalid cohort dates and missing course", async () => {
    const { service, prisma } = setup();
    await expect(
      service.createCohort(adminOrg as any, "admin", {
        courseId: "c",
        name: "X",
        startAt: "not-a-date",
        endAt: "also-bad",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.course.findFirst.mockResolvedValue(null);
    const start = new Date("2026-01-01T00:00:00Z").toISOString();
    const end = new Date("2026-02-01T00:00:00Z").toISOString();
    await expect(
      service.createCohort(adminOrg as any, "admin", {
        courseId: "missing",
        name: "X",
        startAt: start,
        endAt: end,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("getCohort throws when missing", async () => {
    const { service, prisma } = setup();
    prisma.cohort.findFirst.mockResolvedValue(null);
    await expect(
      service.getCohort(adminOrg as any, "admin", "x"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("validates schedule times on addSchedule", async () => {
    const { service, prisma } = setup();
    prisma.cohort.findFirst.mockResolvedValue({
      id: "coh-1",
      organizationId: "org-1",
      startAt: new Date("2026-01-01"),
      endAt: new Date("2026-02-01"),
      members: [],
      schedule: [],
      course: { id: "c", title: "T", slug: "t" },
    });
    await expect(
      service.addSchedule(adminOrg as any, "admin", "coh-1", {
        weekday: 1,
        startTime: "25:00",
        endTime: "10:00",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.cohortSchedule.create.mockResolvedValue({ id: "sch-1" });
    await expect(
      service.addSchedule(adminOrg as any, "admin", "coh-1", {
        weekday: 1,
        startTime: "09:00",
        endTime: "10:00",
      } as any),
    ).resolves.toEqual({ id: "sch-1" });
  });

  it("converts timezone and falls back on invalid zone", () => {
    const { service } = setup();
    const input = new Date("2026-06-01T12:00:00Z");
    const converted = service.convertTimezone(input, "UTC", "America/New_York");
    expect(converted).toBeInstanceOf(Date);
    expect(service.convertTimezone(input, "", "UTC")).toBe(input);
    expect(service.convertTimezone(input, "UTC", "Not/AZone")).toBe(input);
  });

  it("updates timezone preference", async () => {
    const { service, prisma } = setup();
    prisma.userTimezonePreference.upsert.mockResolvedValue({
      timezone: "Asia/Jakarta",
    });
    await expect(
      service.updateMyTimezone("org-1", "u1", {
        timezone: "Asia/Jakarta",
      } as any),
    ).resolves.toEqual({ timezone: "Asia/Jakarta" });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("manages members schedules and cohort updates", async () => {
    const { service, prisma } = setup();
    prisma.cohort.findFirst.mockResolvedValue({
      id: "coh-1",
      organizationId: "org-1",
      maxSeats: 10,
      startAt: new Date("2026-01-01"),
      endAt: new Date("2026-02-01"),
      members: [],
      schedule: [],
      course: { id: "c", title: "T", slug: "t" },
    });
    prisma.cohort.update.mockResolvedValue({ id: "coh-1", name: "Updated" });
    prisma.cohort.delete = vi.fn().mockResolvedValue({ id: "coh-1" });

    await service.updateCohort(adminOrg as any, "admin", "coh-1", {
      name: "Updated",
    } as any);
    await service.addMember(adminOrg as any, "admin", "coh-1", {
      userId: "u2",
    } as any);
    prisma.cohortMember.findFirst.mockResolvedValue({ id: "m1", userId: "u2" });
    await service.removeMember(adminOrg as any, "admin", "coh-1", "u2");
    await service.listSchedule(adminOrg as any, "coh-1");
    prisma.cohortSchedule.create.mockResolvedValue({ id: "sch-1" });
    await service.batchAddSchedule(adminOrg as any, "admin", "coh-1", {
      items: [
        { weekday: 1, startTime: "09:00", endTime: "10:00" },
        { weekday: 2, startTime: "09:00", endTime: "10:00" },
      ],
    } as any);
    await service.deleteCohort(adminOrg as any, "admin", "coh-1");
    prisma.userTimezonePreference.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ timezone: "UTC" });
    await service.getMyTimezone("org-1", "u1");
    expect(prisma.cohortMember.update).toHaveBeenCalled();
  });

  it("covers list filters, date validation, capacity, schedule order", async () => {
    const { service, prisma } = setup();
    prisma.cohort.findMany.mockResolvedValue([]);
    await service.listCohorts(adminOrg as any, "admin", {
      courseId: "c1",
      status: "ACTIVE" as any,
    });
    prisma.cohort.findFirst.mockResolvedValue({
      id: "coh-1",
      organizationId: "org-1",
      maxSeats: 1,
      startAt: new Date("2026-01-01"),
      endAt: new Date("2026-02-01"),
      members: [],
      schedule: [],
      course: { id: "c", title: "T", slug: "t" },
    });
    prisma.cohort.update.mockResolvedValue({ id: "coh-1" });
    await service.updateCohort(adminOrg as any, "admin", "coh-1", {
      startAt: "2026-01-05T00:00:00Z",
      endAt: "2026-03-01T00:00:00Z",
    } as any);
    await expect(
      service.updateCohort(adminOrg as any, "admin", "coh-1", {
        startAt: "2026-03-01T00:00:00Z",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.cohortMember.count.mockResolvedValue(1);
    await expect(
      service.addMember(adminOrg as any, "admin", "coh-1", {
        userId: "u3",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.cohortMember.count.mockResolvedValue(0);
    prisma.cohortMember.findFirst.mockResolvedValue({ id: "m1" });
    await expect(
      service.addMember(adminOrg as any, "admin", "coh-1", {
        userId: "u2",
      } as any),
    ).rejects.toThrow();

    await expect(
      service.addSchedule(adminOrg as any, "admin", "coh-1", {
        weekday: 1,
        startTime: "10:00",
        endTime: "09:00",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateMyTimezone("org-1", "u1", {} as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});


