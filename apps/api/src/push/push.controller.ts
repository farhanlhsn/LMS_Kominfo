import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PushService, type PushPayload, type PushSubscriptionInput } from "./push.service";

@Controller("push")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PushController {
  constructor(@Inject(PushService) private readonly push: PushService) {}

  @Get("vapid")
  vapid() {
    return { data: this.push.buildVapidInfo() };
  }

  @Get("subscriptions")
  async list(@Req() req: AuthenticatedRequest) {
    return { data: await this.push.getSubscriptions(req.user.id) };
  }

  @Post("subscribe")
  async subscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: PushSubscriptionInput & { userAgent?: string; expiresAt?: string },
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    const organizationId = req.organization?.id ?? req.user.activeOrganizationId ?? "default";
    const record = await this.push.subscribe(
      organizationId,
      req.user.id,
      { endpoint: body.endpoint, keys: body.keys },
      { userAgent: body.userAgent, expiresAt },
    );
    return { data: record };
  }

  @Delete("unsubscribe")
  async unsubscribe(@Req() req: AuthenticatedRequest, @Body() body: { endpoint: string }) {
    return { data: await this.push.unsubscribe(req.user.id, body.endpoint) };
  }

  @Post("send/:userId")
  async send(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
    @Body() payload: PushPayload,
  ) {
    const canManagePush =
      req.organization?.isPlatformAdmin ||
      req.organization?.permissionKeys.includes(PERMISSIONS.organizationsManage);
    if (userId !== req.user.id && !canManagePush) {
      throw new ForbiddenException("Insufficient permissions to send push notifications");
    }
    return { data: await this.push.sendToUser(req.organization!.id, userId, payload) };
  }
}
