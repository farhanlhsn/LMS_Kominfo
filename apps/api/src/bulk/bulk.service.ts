import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { BulkJobItemStatus, BulkJobStatus, BulkJobType, Prisma } from "@lms/db";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { CreateBulkJobDto, BulkEntityTypeValue } from "./dto/bulk.dto";

const SMALL_BATCH_THRESHOLD = 25;
const DEFAULT_LARGE_BATCH_DELAY_MS = 50;

interface SimulatedEntity {
  id: string;
  status: "ok" | "skipped" | "failed";
  error?: string;
}

@Injectable()
export class BulkOperationService {
  private readonly logger = new Logger(BulkOperationService.name);
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async createAndRun(
    organizationId: string,
    createdById: string,
    dto: CreateBulkJobDto,
  ): Promise<{ job: Record<string, unknown>; items: SimulatedEntity[] }> {
    if (!dto.items?.length) {
      throw new BadRequestException("At least one item is required");
    }

    const job = await this.prisma.bulkJob.create({
      data: {
        id: randomUUID(),
        organizationId,
        type: dto.type as BulkJobType,
        status: BulkJobStatus.PENDING,
        input: { description: dto.description ?? null, itemCount: dto.items.length } as Prisma.InputJsonValue,
        result: {} as Prisma.InputJsonValue,
        progressTotal: dto.items.length,
        progressDone: 0,
        progressFailed: 0,
        createdById,
      },
    });

    // Persist items eagerly so callers can poll progress
    await this.prisma.bulkJobItem.createMany({
      data: dto.items.map((item) => ({
        id: randomUUID(),
        organizationId,
        jobId: job.id,
        entityType: item.entityType,
        entityId: item.entityId ?? null,
        status: BulkJobItemStatus.PENDING,
        input: (item.input ?? {}) as Prisma.InputJsonValue,
      })),
    });

    if (dto.items.length <= SMALL_BATCH_THRESHOLD) {
      const items = await this.runSynchronously(job.id, dto);
      return { job, items };
    }

    // Simulate async for large jobs
    this.runningJobs.add(job.id);
    setTimeout(() => {
      void this.runAsynchronously(job.id, dto).catch((err) => {
        this.logger.error(`Bulk job ${job.id} failed: ${(err as Error).message}`);
      });
    }, DEFAULT_LARGE_BATCH_DELAY_MS);

    return { job, items: [] };
  }

  list(organizationId: string, query: { type?: string; status?: string } = {}) {
    return this.prisma.bulkJob.findMany({
      where: {
        organizationId,
        type: query.type as BulkJobType | undefined,
        status: query.status as BulkJobStatus | undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: { take: 0 } },
    });
  }

  async findOne(organizationId: string, id: string) {
    const job = await this.prisma.bulkJob.findFirst({
      where: { id, organizationId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (!job) {
      throw new NotFoundException("Bulk job not found");
    }
    return job;
  }

  async cancel(organizationId: string, userId: string, id: string, reason: string) {
    const job = await this.prisma.bulkJob.findFirst({ where: { id, organizationId } });
    if (!job) {
      throw new NotFoundException("Bulk job not found");
    }
    if (
      job.status === BulkJobStatus.COMPLETED ||
      job.status === BulkJobStatus.FAILED ||
      job.status === BulkJobStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel job in status ${job.status}`);
    }
    this.runningJobs.delete(id);
    const updated = await this.prisma.bulkJob.update({
      where: { id },
      data: {
        status: BulkJobStatus.CANCELLED,
        completedAt: new Date(),
        errorMessage: reason,
        result: { cancelledBy: userId, reason } as Prisma.InputJsonValue,
      },
    });
    await this.realtime.publish(
      organizationId,
      userId,
      `org:${organizationId}:bulk:${id}`,
      "bulk.cancelled",
      { jobId: id, reason },
    );
    return updated;
  }

  async resume(organizationId: string, id: string) {
    if (this.runningJobs.has(id)) {
      throw new BadRequestException("Job already running");
    }
    const job = await this.findOne(organizationId, id);
    const dto: CreateBulkJobDto = {
      type: job.type,
      items: job.items.map((item) => ({
        entityType: item.entityType as BulkEntityTypeValue,
        entityId: item.entityId ?? undefined,
        input: (item.input as Record<string, unknown> | null) ?? undefined,
      })),
    };
    this.runningJobs.add(id);
    setTimeout(() => {
      void this.runAsynchronously(id, dto).catch((err) => {
        this.logger.error(`Resume failed for ${id}: ${(err as Error).message}`);
      });
    }, DEFAULT_LARGE_BATCH_DELAY_MS);
    return { resumed: true, id };
  }

  private async runSynchronously(jobId: string, dto: CreateBulkJobDto) {
    const simulated = dto.items.map((item) => this.simulateItem(item));
    await this.persistResults(jobId, simulated);
    return simulated;
  }

  private async runAsynchronously(jobId: string, dto: CreateBulkJobDto) {
    try {
      const simulated = await this.runSynchronously(jobId, dto);
      this.logger.log(`Async bulk job ${jobId} finished with ${simulated.length} items`);
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  private async persistResults(jobId: string, items: SimulatedEntity[]) {
    const now = new Date();
    const failed = items.filter((i) => i.status === "failed").length;
    const status =
      failed === 0
        ? BulkJobStatus.COMPLETED
        : failed === items.length
        ? BulkJobStatus.FAILED
        : BulkJobStatus.PARTIAL;

    const persisted = await this.prisma.bulkJob.findUnique({ where: { id: jobId } });
    if (!persisted) {
      throw new NotFoundException("Bulk job vanished during execution");
    }

    await this.prisma.$transaction([
      this.prisma.bulkJob.update({
        where: { id: jobId },
        data: {
          status,
          progressDone: items.length - failed,
          progressFailed: failed,
          startedAt: persisted.startedAt ?? now,
          completedAt: now,
          result: {
            ok: items.length - failed,
            failed,
            counts: this.tally(items),
          } as Prisma.InputJsonValue,
        },
      }),
      this.prisma.bulkJobItem.updateMany({
        where: { jobId, status: BulkJobItemStatus.PENDING },
        data: { status: BulkJobItemStatus.PROCESSED, processedAt: now },
      }),
    ]);

    await this.realtime.publish(
      persisted.organizationId,
      persisted.createdById,
      `org:${persisted.organizationId}:bulk:${jobId}`,
      `bulk.${status.toLowerCase()}`,
      { jobId, status, ok: items.length - failed, failed },
    );
  }

  private simulateItem(item: { entityId?: string; entityType: string }): SimulatedEntity {
    if (!item.entityId) {
      return { id: "", status: "skipped", error: "Missing entityId" };
    }
    if (item.entityId.startsWith("fail_")) {
      return { id: item.entityId, status: "failed", error: "Simulated failure" };
    }
    return { id: item.entityId, status: "ok" };
  }

  private tally(items: SimulatedEntity[]) {
    const counts: Record<string, number> = { ok: 0, skipped: 0, failed: 0 };
    for (const i of items) {
      counts[i.status] = (counts[i.status] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Used by other modules to confirm a user is allowed to run bulk jobs in
   * the active organization. Throws ForbiddenException otherwise.
   */
  assertCanRun(organizationId: string, isPlatformAdmin: boolean): void {
    if (!organizationId) {
      throw new ForbiddenException("Active organization is required");
    }
    if (!isPlatformAdmin) {
      throw new ForbiddenException("Platform admin role is required for bulk operations");
    }
  }
}
