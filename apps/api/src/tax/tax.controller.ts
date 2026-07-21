import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
  CalculateTaxDto,
  CreateTaxRuleDto,
  UpdateOrderCurrencyDto,
  UpdateTaxRuleDto,
} from "./dto/tax.dto";
import { TaxService } from "./tax.service";

@Controller("tax")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class TaxController {
  constructor(@Inject(TaxService) private readonly service: TaxService) {}

  @Get("regions")
  listRegions() {
    return this.service.listRegions();
  }

  @Post("calculate")
  calculate(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CalculateTaxDto,
  ) {
    return this.service.calculate(org, user, dto);
  }
}

@Controller("admin/tax")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminTaxController {
  constructor(@Inject(TaxService) private readonly service: TaxService) {}

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
    @Body() dto: CreateTaxRuleDto,
  ) {
    return this.service.createRule(org, user, dto);
  }

  @Patch("rules/:id")
  @Permissions(PERMISSIONS.organizationsManage)
  updateRule(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTaxRuleDto,
  ) {
    return this.service.updateRule(org, user, id, dto);
  }

  @Patch("orders/:id/currency")
  @Permissions(PERMISSIONS.organizationsManage)
  updateOrderCurrency(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOrderCurrencyDto,
  ) {
    return this.service.updateOrderCurrency(org, user, id, dto);
  }
}
