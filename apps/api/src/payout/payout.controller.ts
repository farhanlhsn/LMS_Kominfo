import { PERMISSIONS } from "@lms/shared";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
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
  CreatePayoutMethodDto,
  CreatePayoutPeriodDto,
  CreateRevenueShareRuleDto,
  PayPayoutDto,
  UpdateRevenueShareRuleDto,
} from "./dto/payout.dto";
import { PayoutService } from "./payout.service";

@Controller("admin/payouts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminPayoutController {
  constructor(@Inject(PayoutService) private readonly service: PayoutService) {}

  @Get("rules")
  @Permissions(PERMISSIONS.organizationsManage)
  listRules(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listRules(org.id);
  }

  @Post("rules")
  @Permissions(PERMISSIONS.organizationsManage)
  createRule(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRevenueShareRuleDto,
  ) {
    return this.service.createRule(org, user, dto);
  }

  @Patch("rules/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  updateRule(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRevenueShareRuleDto,
  ) {
    return this.service.updateRule(org, user, id, dto);
  }

  @Get("methods")
  @Permissions(PERMISSIONS.organizationsManage)
  listMethods(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listMethods(org.id);
  }

  @Post("methods")
  @Permissions(PERMISSIONS.organizationsManage)
  createMethod(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayoutMethodDto,
  ) {
    return this.service.createMethod(org, user, dto);
  }

  @Get("periods")
  @Permissions(PERMISSIONS.organizationsManage)
  listPeriods(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listPeriods(org.id);
  }

  @Post("periods")
  @Permissions(PERMISSIONS.organizationsManage)
  createPeriod(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayoutPeriodDto,
  ) {
    return this.service.createPeriod(org, user, dto);
  }

  @Post("periods/:id/compute")
  @Permissions(PERMISSIONS.organizationsManage)
  computePeriod(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.computePeriod(org, user, id);
  }

  @Post("periods/:id/lock")
  @Permissions(PERMISSIONS.organizationsManage)
  lockPeriod(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.lockPeriod(org, user, id);
  }

  @Post("periods/:id/pay")
  @Permissions(PERMISSIONS.organizationsManage)
  payPeriod(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PayPayoutDto,
  ) {
    return this.service.payPeriod(org, user, id, dto);
  }
}

@Controller("payouts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PayoutsController {
  constructor(@Inject(PayoutService) private readonly service: PayoutService) {}

  @Get("me")
  listMine(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listMyPayouts(org.id, user.id);
  }
}
