import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BullMQ = require('bullmq');
import IORedis, { Redis as RedisClient } from 'ioredis';

export type AiJobType = 'EMBED_LESSON' | 'EMBED_MATERIAL' | 'SUMMARY' | 'RECOMMENDATION' | 'CERTIFICATE';

export interface AiJobData {
  type: AiJobType;
  payload: Record<string, any>;
}

export interface AiJobResult {
  type: AiJobType;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Centralized BullMQ manager.
 *
 * - 1 Redis connection (shared)
 * - 1 Queue "ai-jobs" untuk semua tipe job
 * - 1 Worker yang dispatch ke handler berdasarkan type
 *
 * API:
 *   await aiQueue.addJob({ type: 'EMBED_LESSON', payload: { lessonId, materialId, mimeType } });
 */
@Injectable()
export class AiQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private connection: RedisClient | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private worker: any = null;
  private handlers = new Map<AiJobType, (payload: Record<string, any>) => Promise<Record<string, any>>>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Lazy initialization — tidak crash startup jika Redis belum ready.
   */
  private ensureInfra(): { queue: any; worker: any } {
    if (this.queue && this.worker) return { queue: this.queue, worker: this.worker };

    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    this.connection = new IORedis({
      host,
      port,
      password,
      maxRetriesPerRequest: null, // required by BullMQ
    });

    this.queue = new BullMQ.Queue('ai-jobs', { connection: this.connection });
    this.worker = new BullMQ.Worker('ai-jobs', this.processJob.bind(this), {
      connection: this.connection,
      concurrency: 2,
    });

    this.worker.on('completed', (job: { id: string; data: AiJobData }) =>
      this.logger.debug(`Job ${job.id} (${job.data.type}) completed`),
    );
    this.worker.on('failed', (job: { id: string; data: AiJobData } | undefined, err: Error) =>
      this.logger.error(`Job ${job?.id} (${job?.data?.type}) failed: ${err.message}`),
    );

    return { queue: this.queue, worker: this.worker };
  }

  registerHandler(type: AiJobType, handler: (payload: Record<string, any>) => Promise<Record<string, any>>): void {
    this.handlers.set(type, handler);
  }

  async addJob(type: AiJobType, payload: Record<string, any>, opts: { delayMs?: number } = {}): Promise<string> {
    const { queue } = this.ensureInfra();
    const job = await queue.add(
      type,
      { type, payload },
      {
        delay: opts.delayMs || 0,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.log(`Job ${job.id} (${type}) ditambahkan ke antrian`);
    return job.id || '';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processJob(job: { data: AiJobData }): Promise<AiJobResult> {
    const { type, payload } = job.data;
    const handler = this.handlers.get(type);
    if (!handler) {
      this.logger.warn(`No handler registered for job type ${type}, skipping`);
      return { type, success: false, error: `No handler for type ${type}` };
    }
    const data = await handler(payload);
    return { type, success: true, data };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
    if (this.connection) this.connection.disconnect();
  }
}
