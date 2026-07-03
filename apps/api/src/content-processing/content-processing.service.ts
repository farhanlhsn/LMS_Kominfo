import { Injectable, Logger } from "@nestjs/common";
import type { RedisOptions } from "ioredis";
import { Queue } from "bullmq";

export type ContentJobName =
  | "CONTENT_CREATED"
  | "CONTENT_UPDATED"
  | "FILE_UPLOADED"
  | "AI_INDEXING_REQUESTED";

@Injectable()
export class ContentProcessingService {
  private readonly logger = new Logger(ContentProcessingService.name);
  private readonly queues = new Map<string, Queue>();

  async enqueue(name: ContentJobName, payload: Record<string, unknown>) {
    const queueName =
      name === "FILE_UPLOADED"
        ? "content-processing"
        : name === "AI_INDEXING_REQUESTED"
          ? "ai-indexing"
          : "content-processing";

    try {
      const queue = this.getQueue(queueName);
      await queue.add(name, payload, {
        removeOnComplete: 100,
        removeOnFail: 100,
      });
      return { queued: true, queue: queueName, job: name };
    } catch (error) {
      this.logger.warn(
        `Queue unavailable for ${name}; continuing without background processing.`,
      );
      this.logger.debug(error instanceof Error ? error.message : String(error));
      return { queued: false, queue: queueName, job: name };
    }
  }

  private getQueue(name: string) {
    const existing = this.queues.get(name);
    if (existing) {
      return existing;
    }

    const queue = new Queue(name, {
      connection: this.getConnectionOptions(),
    });
    this.queues.set(name, queue);
    return queue;
  }

  private getConnectionOptions(): RedisOptions {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      maxRetriesPerRequest: 1,
    };
  }
}
