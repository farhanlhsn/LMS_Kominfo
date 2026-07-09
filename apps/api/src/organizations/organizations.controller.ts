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
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  CreateOrganizationMemberDto,
  CreateOrganizationRoleDto,
  UpdateOrganizationMemberRolesDto,
  UpdateOrganizationMemberStatusDto,
  UpdateOrganizationRoleDto,
} from "./dto/organization-member.dto";
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

  @Post(":organizationId/members")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.membershipsManage)
  createMember(
    @Param("organizationId") _organizationId: string,
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationMemberDto
  ): Promise<unknown> {
    return this.organizationsService.createMember(organization.id, user.id, dto);
  }

  @Patch(":organizationId/members/:memberId/roles")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.membershipsManage)
  updateMemberRoles(
    @Param("organizationId") _organizationId: string,
    @Param("memberId") memberId: string,
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationMemberRolesDto
  ): Promise<unknown> {
    return this.organizationsService.updateMemberRoles(
      organization.id,
      user.id,
      memberId,
      dto
    );
  }

  @Patch(":organizationId/members/:memberId/status")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.membershipsManage)
  updateMemberStatus(
    @Param("organizationId") _organizationId: string,
    @Param("memberId") memberId: string,
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationMemberStatusDto
  ): Promise<unknown> {
    return this.organizationsService.updateMemberStatus(
      organization.id,
      user.id,
      memberId,
      dto
    );
  }

  @Get(":organizationId/roles")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  listRoles(
    @Param("organizationId") _organizationId: string,
    @ActiveOrganization() organization: OrganizationContext
  ): Promise<unknown> {
    return this.organizationsService.listRoles(organization.id);
  }

  @Post(":organizationId/roles")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  createRole(
    @Param("organizationId") _organizationId: string,
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationRoleDto
  ): Promise<unknown> {
    return this.organizationsService.createRole(organization.id, user.id, dto);
  }

  @Patch(":organizationId/roles/:roleId")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  updateRole(
    @Param("organizationId") _organizationId: string,
    @Param("roleId") roleId: string,
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationRoleDto
  ): Promise<unknown> {
    return this.organizationsService.updateRole(
      organization.id,
      user.id,
      roleId,
      dto
    );
  }

  @Get(":organizationId/permissions")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  listPermissions(
    @Param("organizationId") _organizationId: string
  ): Promise<unknown> {
    return this.organizationsService.listPermissions();
  }
}
