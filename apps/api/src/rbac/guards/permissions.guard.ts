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
import { RbacService } from "../rbac.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RbacService) private readonly rbacService: RbacService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.organization) {
      throw new ForbiddenException("Organization context is required");
    }

    if (
      !this.rbacService.hasPermissions(
        request.organization,
        requiredPermissions
      )
    ) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
