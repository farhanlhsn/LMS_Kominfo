import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { PluginPanelService } from "./plugin-panels.service";
import {
  RegisterPluginPanelDto,
  SavePanelLayoutDto,
} from "./dto/plugin-panels.dto";

@Controller("plugin-panels")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class PluginPanelController {
  constructor(
    @Inject(PluginPanelService) private readonly service: PluginPanelService,
  ) {}

  @Get("available")
  @Permissions(PERMISSIONS.pluginsConfigure)
  list(@ActiveOrganization() organization: OrganizationContext) {
    return this.service.listAvailable(organization.id);
  }

  @Post("register")
  @Permissions(PERMISSIONS.pluginsConfigure)
  register(
    @ActiveOrganization() organization: OrganizationContext,
    @Body() dto: RegisterPluginPanelDto,
  ) {
    return this.service.registerPanel(organization, dto);
  }
}

@Controller("me/panel-layouts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class UserPanelLayoutController {
  constructor(
    @Inject(PluginPanelService) private readonly service: PluginPanelService,
  ) {}

  @Get(":layoutKey")
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("layoutKey") layoutKey: string,
  ) {
    return this.service.getLayout(organization.id, user.id, layoutKey);
  }

  @Put(":layoutKey")
  save(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("layoutKey") layoutKey: string,
    @Body() dto: SavePanelLayoutDto,
  ) {
    return this.service.saveLayout(organization, user.id, layoutKey, dto);
  }
}
