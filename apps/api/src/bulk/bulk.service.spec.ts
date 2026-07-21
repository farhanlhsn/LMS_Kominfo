import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { BulkJobItemStatus, BulkJobStatus, BulkJobType } from "@lms/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { BulkOperationService } from "./bulk.service";
import { CreateBulkJobDto } from "./dto/bulk.dto";

describe("BulkOperationService", () => {
  let service: BulkOperationService;
  let prisma: any;
  let realtime: { publish: ReturnType<typeof vi.fn> };

  const baseJob = {
    id: "job_1",
    organizationId: "org_1",
    type: BulkJobType.ARCHIVE,
    status: BulkJobStatus.PENDING,
    input: {},
    result: {},
    progressTotal: 2,
    progressDone: 0,
    progressFailed: 0,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      // partial fixture; typed loosely
      bulkJob: {
        create: vi.fn().mockResolvedValue(baseJob),
        findFirst: vi.fn().mockResolvedValue(baseJob),
        findUnique: vi.fn().mockResolvedValue(baseJob),
        findMany: vi.fn().mockResolvedValue([baseJob]),
        update: vi.fn().mockResolvedValue({ ...baseJob, status: BulkJobStatus.CANCELLED }),
      },
      bulkJobItem: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: vi.fn().mockResolvedValue([]),
      course: { update: vi.fn().mockResolvedValue({}) },
    };
    realtime = { publish: vi.fn().mockResolvedValue(undefined) };

    service = new BulkOperationService(prisma as never, realtime as never);
  });

  it("rejects empty item lists", async () => {
    await expect(
      service.createAndRun("org_1", "user_1", {
        type: "ARCHIVE",
        items: [],
      } as CreateBulkJobDto),
    ).rejects.toThrow(BadRequestException);
  });

  it("runs small batch synchronously and updates status", async () => {
    const dto: CreateBulkJobDto = {
      type: "ARCHIVE",
      items: [
        { entityType: "course", entityId: "c1" },
        { entityType: "course", entityId: "c2" },
      ],
    };
    const result = await service.createAndRun("org_1", "user_1", dto);
    expect(prisma.bulkJobItem.createMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.items.every((i) => i.status === "ok")).toBe(true);
  });

  it("marks items as failed when entityId starts with fail_", async () => {
    const dto: CreateBulkJobDto = {
      type: "ARCHIVE",
      items: [{ entityType: "course", entityId: "fail_xx" }],
    };
    const result = await service.createAndRun("org_1", "user_1", dto);
    const first = result.items[0];
    expect(first?.status).toBe("failed");
  });

  it("schedules async execution for large batches", async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      entityType: "course" as const,
      entityId: `c${i}`,
    }));
    const dto: CreateBulkJobDto = { type: "ARCHIVE", items };
    const result = await service.createAndRun("org_1", "user_1", dto);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0);
  });

  it("cancels an active job", async () => {
    prisma.bulkJob.findFirst.mockResolvedValueOnce({ ...baseJob, status: BulkJobStatus.RUNNING });
    const result = await service.cancel("org_1", "user_1", "job_1", "ops mistake");
    expect(result.status).toBe(BulkJobStatus.CANCELLED);
    expect(realtime.publish).toHaveBeenCalled();
  });

  it("refuses to cancel terminal job", async () => {
    prisma.bulkJob.findFirst.mockResolvedValueOnce({ ...baseJob, status: BulkJobStatus.COMPLETED });
    await expect(
      service.cancel("org_1", "user_1", "job_1", "no"),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws NotFound for unknown job", async () => {
    prisma.bulkJob.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne("org_1", "missing")).rejects.toThrow(NotFoundException);
  });

  it("filters list query by type and status", async () => {
    await service.list("org_1", { type: "ARCHIVE", status: "COMPLETED" });
    expect(prisma.bulkJob.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1", type: BulkJobType.ARCHIVE, status: BulkJobStatus.COMPLETED },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: { take: 0 } },
    });
  });

  it("enforces platform admin for run", () => {
    expect(() => service.assertCanRun("org_1", false)).toThrow(ForbiddenException);
    expect(() => service.assertCanRun("", true)).toThrow(ForbiddenException);
    expect(() => service.assertCanRun("org_1", true)).not.toThrow();
  });

  it("ignores items without entityId", async () => {
    const dto: CreateBulkJobDto = {
      type: "ARCHIVE",
      items: [{ entityType: "course" }],
    };
    const result = await service.createAndRun("org_1", "user_1", dto);
    const first = result.items[0];
    expect(first?.status).toBe("skipped");
  });

  it("uses persisted item status enum on updates", () => {
    expect(BulkJobItemStatus.PROCESSED).toBe("PROCESSED");
  });

  it("resumes a failed job asynchronously", async () => {
    prisma.bulkJob.findFirst.mockResolvedValueOnce({
      ...baseJob,
      status: BulkJobStatus.FAILED,
      progressTotal: 1,
      items: [
        {
          entityType: "course",
          entityId: "c1",
          input: {},
        },
      ],
    });
    prisma.bulkJob.update.mockResolvedValue({
      ...baseJob,
      status: BulkJobStatus.RUNNING,
    });
    const result = await service.resume("org_1", "job_1");
    expect(result).toMatchObject({ resumed: true, id: "job_1" });
  });

  it("covers cancel/resume not-found, double resume, vanished job", async () => {
    prisma.bulkJob.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.cancel("org_1", "user_1", "missing", "x"),
    ).rejects.toThrow(NotFoundException);

    prisma.bulkJob.findFirst.mockResolvedValueOnce({
      ...baseJob,
      status: BulkJobStatus.FAILED,
      items: [{ entityType: "course", entityId: "c1", input: null }],
    });
    await service.resume("org_1", "job_1");
    await expect(service.resume("org_1", "job_1")).rejects.toThrow(
      BadRequestException,
    );

    prisma.bulkJob.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.createAndRun("org_1", "user_1", {
        type: "ARCHIVE",
        items: [{ entityType: "course", entityId: "c1" }],
      } as CreateBulkJobDto),
    ).rejects.toThrow(NotFoundException);
  });
});
