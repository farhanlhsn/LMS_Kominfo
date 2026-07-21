import { Inject, Logger, forwardRef } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { RealtimeEvent } from "@lms/db";
import { Server, Socket } from "socket.io";
import { RealtimeService } from "./realtime.service";

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Mirror API CORS loosely for websocket; empty origin = non-browser clients.
      if (!origin || process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      const allowed = new Set(
        [
          process.env.PUBLIC_APP_URL,
          process.env.NEXT_PUBLIC_APP_URL,
          ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ].filter(Boolean),
      );
      callback(null, allowed.has(origin));
    },
    credentials: true,
  },
  namespace: "/realtime",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => RealtimeService))
    private readonly service: RealtimeService,
  ) {}

  afterInit() {
    this.logger.log(`WebSocket gateway initialized on namespace /realtime`);
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (!data?.channel) return { error: "channel required" };
    void client.join(data.channel);
    this.logger.debug(`${client.id} joined room ${data.channel}`);
    return { ok: true, channel: data.channel };
  }

  @SubscribeMessage("unsubscribe")
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (!data?.channel) return { error: "channel required" };
    void client.leave(data.channel);
    return { ok: true };
  }

  async emit(
    organizationId: string,
    actorId: string | undefined,
    channel: string,
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<RealtimeEvent> {
    const event = await this.service.publish(organizationId, actorId, channel, type, payload);
    this.server?.to(channel).emit("event", event);
    return event;
  }

  // Deliver an already-persisted event to connected sockets without re-publishing.
  deliver(event: RealtimeEvent): void {
    this.server?.to(event.channel).emit("event", event);
  }

  subscriberCount(channel: string): number {
    return this.server?.sockets?.adapter?.rooms?.get(channel)?.size ?? 0;
  }
}
