import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-request";
import { REQUIRED_PLUGIN_KEY } from "../decorators/requires-plugin.decorator";
import { PluginRegistry } from "../plugin-registry.service";

@Injectable()
export class PluginEntitlementGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
  ) {}

  async canActivate(context: ExecutionContext) {
    const pluginKey = this.reflector.getAllAndOverride<string>(
      REQUIRED_PLUGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!pluginKey) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.organization) {
      throw new ForbiddenException("Organization context is required");
    }

    const enabled = await this.registry.isEnabledForOrganization(
      request.organization.id,
      pluginKey,
    );
    if (!enabled) {
      throw new ForbiddenException(
        `Plugin ${pluginKey} is not installed or enabled`,
      );
    }
    return true;
  }
}
