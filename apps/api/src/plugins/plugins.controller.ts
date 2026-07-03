import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PluginRegistry } from "./plugin-registry.service";

@Controller("plugins")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PluginsController {
  constructor(
    @Inject(PluginRegistry) private readonly pluginRegistry: PluginRegistry,
  ) {}

  @Get("activity-types")
  listActivityTypes(@ActiveOrganization() organization: OrganizationContext) {
    return {
      organizationId: organization.id,
      activityTypes: this.pluginRegistry.listActivityTypes(),
    };
  }
}
