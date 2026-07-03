import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService
  ) {}

  @Get(":organizationId/members")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.membershipsManage)
  listMembers(
    @Param("organizationId") _organizationId: string,
    @ActiveOrganization() organization: OrganizationContext
  ): Promise<unknown> {
    return this.organizationsService.listMembers(organization.id);
  }
}
