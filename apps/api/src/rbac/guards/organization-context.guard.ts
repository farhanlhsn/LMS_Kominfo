import {
  CanActivate,
  ExecutionContext,
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

    return (
      params.organizationId ??
      headerOrganizationId ??
      request.user.activeOrganizationId ??
      null
    );
  }
}
