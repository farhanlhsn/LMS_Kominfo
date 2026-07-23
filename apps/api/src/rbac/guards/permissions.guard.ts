import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-request";
import {
  REQUIRED_PERMISSIONS_KEY
} from "../decorators/permissions.decorator";
import {
  ACCESS_SCOPE_KEY,
  type AccessScopeMetadata,
} from "../decorators/access-scope.decorator";
import { RbacService } from "../rbac.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RbacService) private readonly rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.organization) {
      throw new ForbiddenException("Organization context is required");
    }
    if (!request.user) {
      throw new ForbiddenException("Authenticated user is required");
    }

    // Fail closed: PermissionsGuard requires explicit @Permissions(...).
    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const declaredScope = this.reflector.getAllAndOverride<AccessScopeMetadata>(
      ACCESS_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const scope = declaredScope ?? this.inferScope(request.params);
    const instanceId = scope
      ? scope.param
        ? String(request.params?.[scope.param] ?? "")
        : scope.bodyField
          ? String((request.body as Record<string, unknown>)?.[scope.bodyField] ?? "")
          : scope.type === "ORGANIZATION"
            ? request.organization.id
            : ""
      : request.organization.id;
    if (scope && !instanceId) {
      throw new ForbiddenException("Permission context is required");
    }

    const isOrganizationRoot =
      !scope ||
      (scope.type === "ORGANIZATION" &&
        instanceId === request.organization.id);
    const allowed = isOrganizationRoot
      ? this.rbacService.hasPermissions(
          request.organization,
          requiredPermissions,
        )
      : await this.rbacService.hasPermissionsAtContext({
          organization: request.organization,
          userId: request.user.id,
          sessionId: request.user.sessionId,
          requiredPermissions,
          context: { type: scope.type, instanceId },
        });
    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  private inferScope(
    params: unknown,
  ): AccessScopeMetadata | undefined {
    const routeParams = (params ?? {}) as Record<string, string | undefined>;
    const candidates: Array<[string, AccessScopeMetadata["type"]]> =
      [
        ["activityId", "ACTIVITY"],
        ["moduleId", "MODULE"],
        ["courseId", "COURSE"],
        ["pluginKey", "PLUGIN"],
        ["userId", "USER"],
      ];
    const match = candidates.find(([param]) => Boolean(routeParams[param]));
    return match ? { param: match[0], type: match[1] } : undefined;
  }
}
