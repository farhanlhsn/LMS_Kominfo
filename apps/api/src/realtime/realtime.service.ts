import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { Prisma, RealtimeEvent } from "@lms/db";
import { randomUUID } from "crypto";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.constants";

export interface RealtimeTransportInfo {
  preferred: "polling" | "sse" | "websocket";
  available: Array<"polling" | "sse" | "websocket">;
}

const MAX_EVENTS_PER_POLL = 200;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const REDIS_BUS = "lms:realtime:events";

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly publisherRegistry = new Map<
    string,
    Set<(event: RealtimeEvent) => void>
  >();
  private subscriber: Redis | null = null;
  private readonly instanceId = randomUUID();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {
    void this.initRedisBus();
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        // ignore
      }
      this.subscriber = null;
    }
  }

  getTransports(): RealtimeTransportInfo {
    return {
      preferred: "polling",
      available: ["polling", "sse", "websocket"],
    };
  }

  buildChannel(
    organizationId: string,
    entity: string,
    entityId: string,
  ): string {
    if (!organizationId || !entity || !entityId) {
      throw new ForbiddenException("Cannot build channel without org/entity/id");
    }
    return `org:${organizationId}:${entity}:${entityId}`;
  }

  assertChannelScope(organizationId: string, channel: string): void {
    const prefix = `org:${organizationId}:`;
    if (!channel.startsWith(prefix)) {
      throw new ForbiddenException("Channel is not in organization scope");
    }
  }

  async publish(
    organizationId: string,
    actorId: string | undefined,
    channel: string,
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<RealtimeEvent> {
    this.assertChannelScope(organizationId, channel);

    const event = await this.prisma.realtimeEvent.create({
      data: {
        id: randomUUID(),
        organizationId,
        channel,
        type,
        payload: payload as Prisma.InputJsonValue,
        actorId: actorId ?? null,
      },
    });

    this.dispatchLocal(event);
    await this.publishRedis(event);

    return event;
  }

  async poll(
    organizationId: string,
    options: {
      channel?: string;
      since?: string;
      limit?: number;
      order?: "asc" | "desc";
    } = {},
  ): Promise<RealtimeEvent[]> {
    const where: Prisma.RealtimeEventWhereInput = { organizationId };
    if (options.channel) {
      this.assertChannelScope(organizationId, options.channel);
      where.channel = options.channel;
    }
    if (options.since) {
      const sinceDate = new Date(options.since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const take = Math.min(Math.max(options.limit ?? 50, 1), MAX_EVENTS_PER_POLL);
    const order = options.order ?? "asc";

    return this.prisma.realtimeEvent.findMany({
      where,
      take,
      orderBy: { createdAt: order },
    });
  }

  async subscribe(
    organizationId: string,
    userId: string,
    channel: string,
  ): Promise<{ id: string; channel: string; lastSeenAt: Date }> {
    this.assertChannelScope(organizationId, channel);

    const existing = await this.prisma.realtimeSubscription.findUnique({
      where: { userId_channel: { userId, channel } },
    });

    if (existing) {
      return this.prisma.realtimeSubscription.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), organizationId },
      });
    }

    return this.prisma.realtimeSubscription.create({
      data: {
        organizationId,
        userId,
        channel,
        lastSeenAt: new Date(),
      },
    });
  }

  async unsubscribe(
    organizationId: string,
    userId: string,
    channel: string,
  ): Promise<void> {
    this.assertChannelScope(organizationId, channel);
    await this.prisma.realtimeSubscription.deleteMany({
      where: { organizationId, userId, channel },
    });
  }

  async ack(
    organizationId: string,
    userId: string,
    channel: string,
    eventId: string,
  ): Promise<{ acked: boolean }> {
    this.assertChannelScope(organizationId, channel);
    const event = await this.prisma.realtimeEvent.findFirst({
      where: { id: eventId, organizationId, channel },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    await this.prisma.realtimeSubscription.updateMany({
      where: { userId, channel, organizationId },
      data: { lastSeenAt: new Date() },
    });
    return { acked: true };
  }

  async pruneExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const result = await this.prisma.realtimeEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  registerListener(
    channel: string,
    handler: (event: RealtimeEvent) => void,
  ): () => void {
    if (!this.publisherRegistry.has(channel)) {
      this.publisherRegistry.set(channel, new Set());
    }
    const set = this.publisherRegistry.get(channel)!;
    set.add(handler);
    return () => set.delete(handler);
  }

  private dispatchLocal(event: RealtimeEvent) {
    const subscribers = this.publisherRegistry.get(event.channel);
    if (!subscribers) return;
    for (const handler of subscribers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to avoid breaking publishing for other listeners
      }
    }
  }

  private async publishRedis(event: RealtimeEvent) {
    if (!this.redis) return;
    try {
      await this.redis.publish(
        REDIS_BUS,
        JSON.stringify({
          origin: this.instanceId,
          event: {
            ...event,
            createdAt:
              event.createdAt instanceof Date
                ? event.createdAt.toISOString()
                : event.createdAt,
          },
        }),
      );
    } catch {
      // multi-node fanout best-effort
    }
  }

  private async initRedisBus() {
    if (!this.redis) return;
    try {
      this.subscriber = this.redis.duplicate();
      if (this.subscriber.status === "wait") {
        await this.subscriber.connect().catch(() => undefined);
      }
      await this.subscriber.subscribe(REDIS_BUS);
      this.subscriber.on("message", (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as {
            origin?: string;
            event?: RealtimeEvent & { createdAt: string };
          };
          if (!parsed?.event || parsed.origin === this.instanceId) return;
          const event: RealtimeEvent = {
            ...parsed.event,
            createdAt: new Date(parsed.event.createdAt),
          };
          this.dispatchLocal(event);
        } catch {
          // ignore bad payloads
        }
      });
    } catch {
      this.subscriber = null;
    }
  }
}
