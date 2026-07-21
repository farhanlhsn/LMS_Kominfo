import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-request";
import { RbacService } from "../rbac.service";

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(@Inject(RbacService) private readonly rbacService: RbacService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException("Authentication is required");
    }

    const organizationId = this.resolveOrganizationId(request);

    if (!organizationId) {
      throw new UnauthorizedException("Organization context is required");
    }

    request.organization = await this.rbacService.getOrganizationContext(
      request.user.id,
      organizationId
    );

    return true;
  }

  private resolveOrganizationId(request: AuthenticatedRequest): string | null {
    const params = request.params as Record<string, string | undefined>;
    const headerValue = request.headers["x-organization-id"];
    const headerOrganizationId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    const activeOrganizationId = request.user.activeOrganizationId ?? null;
    const paramOrganizationId = params.organizationId ?? null;

    // Prefer explicit sources; reject mismatched multi-source claims.
    const explicit = [paramOrganizationId, headerOrganizationId].filter(
      (value): value is string => Boolean(value),
    );
    if (explicit.length > 1) {
      const [first, ...rest] = explicit;
      if (rest.some((value) => value !== first)) {
        throw new ForbiddenException("Conflicting organization context");
      }
    }

    if (paramOrganizationId) return paramOrganizationId;
    if (headerOrganizationId) return headerOrganizationId;
    return activeOrganizationId;
  }
}
