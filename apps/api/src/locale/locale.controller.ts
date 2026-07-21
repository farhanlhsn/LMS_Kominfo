import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
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
import { UpdateLocalePreferenceDto, UpdateOrgLocalePreferenceDto } from "./dto/locale.dto";
import { LocaleService } from "./locale.service";

@Controller("locale")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LocaleController {
  constructor(@Inject(LocaleService) private readonly service: LocaleService) {}

  @Get("preferences")
  preference(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getUserPreference(org.id, user.id);
  }

  @Put("preferences")
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLocalePreferenceDto,
  ) {
    return this.service.updateUserPreference(org.id, user.id, dto);
  }

  @Get("resolve")
  resolve(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.resolveEffectiveLocale(org.id, user.id);
  }
}

@Controller("admin/locale")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminLocaleController {
  constructor(@Inject(LocaleService) private readonly service: LocaleService) {}

  @Get("preferences")
  @Permissions(PERMISSIONS.organizationsManage)
  get(@ActiveOrganization() org: OrganizationContext) {
    return this.service.getOrgPreference(org.id);
  }

  @Put("preferences")
  @Permissions(PERMISSIONS.organizationsManage)
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrgLocalePreferenceDto,
  ) {
    return this.service.updateOrgPreference(org, user.id, dto);
  }
}
