import { Logger } from "@nestjs/common";
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
  cors: { origin: "*", credentials: true },
  namespace: "/realtime",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly service: RealtimeService) {}

  afterInit(server: Server) {
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

  subscriberCount(channel: string): number {
    return this.server?.sockets?.adapter?.rooms?.get(channel)?.size ?? 0;
  }
}
