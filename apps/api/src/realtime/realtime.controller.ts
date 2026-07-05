import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import {
  AckRealtimeDto,
  PollRealtimeDto,
  PublishRealtimeDto,
  SubscribeRealtimeDto,
} from "./dto/realtime.dto";
import { RealtimeService } from "./realtime.service";

@Controller("realtime")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class RealtimeController {
  constructor(
    @Inject(RealtimeService) private readonly service: RealtimeService,
  ) {}

  @Get("transports")
  getTransports() {
    return { data: this.service.getTransports() };
  }

  @Get("channels/org/:entity/:entityId")
  buildChannel(
    @Param("entity") entity: string,
    @Param("entityId") entityId: string,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return {
      data: {
        channel: this.service.buildChannel(org.id, entity, entityId),
      },
    };
  }

  @Get("poll")
  poll(
    @Query() query: PollRealtimeDto,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .poll(org.id, {
        channel: query.channel,
        since: query.since,
        limit: query.limit,
        order: query.order,
      })
      .then((events) => ({
        data: events,
        meta: { count: events.length, transport: "polling" as const },
      }));
  }

  @Post("publish")
  @Permissions(PERMISSIONS.platformAdmin)
  publish(
    @Body() body: PublishRealtimeDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .publish(org.id, user.id, body.channel, body.type, body.payload ?? {})
      .then((event) => ({ data: event }));
  }

  @Post("subscribe")
  subscribe(
    @Body() body: SubscribeRealtimeDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.subscribe(org.id, user.id, body.channel).then((data) => ({ data }));
  }

  @Delete("subscribe")
  unsubscribe(
    @Body() body: SubscribeRealtimeDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.unsubscribe(org.id, user.id, body.channel).then(() => ({
      data: { unsubscribed: true, channel: body.channel },
    }));
  }

  @Post("ack")
  ack(
    @Body() body: AckRealtimeDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .ack(org.id, user.id, body.channel, body.eventId)
      .then((data) => ({ data }));
  }
}
