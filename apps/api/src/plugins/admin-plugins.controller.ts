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
import { UpdatePluginConfigDto } from "./dto/plugin-config.dto";
import { PluginConfigService } from "./plugin-config.service";

@Controller("admin/plugins")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
@Permissions(PERMISSIONS.pluginsConfigure)
export class AdminPluginsController {
  constructor(
    @Inject(PluginConfigService)
    private readonly pluginConfigService: PluginConfigService,
  ) {}

  @Get()
  list(@ActiveOrganization() organization: OrganizationContext) {
    return this.pluginConfigService.listPlugins(organization.id);
  }

  @Get(":pluginKey")
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("pluginKey") pluginKey: string,
  ) {
    return this.pluginConfigService.getPlugin(organization.id, pluginKey);
  }

  @Post(":pluginKey/enable")
  enable(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("pluginKey") pluginKey: string,
  ) {
    return this.pluginConfigService.enablePlugin(
      organization.id,
      user,
      pluginKey,
    );
  }

  @Post(":pluginKey/disable")
  disable(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("pluginKey") pluginKey: string,
  ) {
    return this.pluginConfigService.disablePlugin(
      organization.id,
      user,
      pluginKey,
    );
  }

  @Patch(":pluginKey/config")
  updateConfig(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("pluginKey") pluginKey: string,
    @Body() dto: UpdatePluginConfigDto,
  ) {
    return this.pluginConfigService.updateConfig(
      organization.id,
      user,
      pluginKey,
      dto.config,
    );
  }

  @Get(":pluginKey/logs")
  logs(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("pluginKey") pluginKey: string,
  ) {
    return this.pluginConfigService.logs(organization.id, pluginKey);
  }
}
