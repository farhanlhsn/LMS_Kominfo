import { Injectable, Logger } from "@nestjs/common";
import type { RealtimeEvent } from "@lms/db";
import { RealtimeService } from "./realtime.service";

export type RealtimeSubscriberHandler = (event: RealtimeEvent) => void;

@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly subscribers = new Map<string, Set<RealtimeSubscriberHandler>>();

  constructor(private readonly service: RealtimeService) {}

  /**
   * Attach a listener to a channel. Internally uses the polling
   * fallback via RealtimeService polling; if a WebSocket / SSE transport
   * is later configured, the same handler contract still applies.
   */
  attach(channel: string, handler: RealtimeSubscriberHandler): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    const set = this.subscribers.get(channel)!;
    set.add(handler);
    this.logger.log(`Attached subscriber to ${channel} (total=${set.size})`);
    return () => {
      set.delete(handler);
      this.logger.log(`Detached subscriber from ${channel}`);
    };
  }

  /**
   * Synchronous publish used by service-level broadcasts. Persists the
   * event to the log so polling clients can also pick it up.
   */
  async emit(
    organizationId: string,
    actorId: string | undefined,
    channel: string,
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<RealtimeEvent> {
    const event = await this.service.publish(organizationId, actorId, channel, type, payload);
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      for (const handler of subscribers) {
        try {
          handler(event);
        } catch (err) {
          this.logger.error(
            `Subscriber handler failed for ${channel}: ${(err as Error).message}`,
          );
        }
      }
    }
    return event;
  }

  subscriberCount(channel: string): number {
    return this.subscribers.get(channel)?.size ?? 0;
  }
}
