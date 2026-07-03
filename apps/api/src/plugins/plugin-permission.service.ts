import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { RbacService } from "../rbac/rbac.service";
import { PluginRegistry } from "./plugin-registry.service";

@Injectable()
export class PluginPermissionService {
  constructor(
    @Inject(RbacService) private readonly rbacService: RbacService,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
  ) {}

  async ensureEnabled(organizationId: string, pluginKey: string) {
    const enabled = await this.registry.isEnabledForOrganization(
      organizationId,
      pluginKey,
    );
    if (!enabled) {
      throw new ForbiddenException("Plugin is disabled for this organization");
    }
  }

  ensurePluginPermissions(
    organization: OrganizationContext,
    pluginKey: string,
    requestedPermissions: string[],
  ) {
    this.registry.getPlugin(pluginKey);
    if (!this.rbacService.hasPermissions(organization, requestedPermissions)) {
      throw new ForbiddenException("Insufficient plugin permissions");
    }
  }
}
