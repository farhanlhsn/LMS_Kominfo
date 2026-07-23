import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { AccessControlService } from "./access-control.service";
import { ActiveOrganization } from "./decorators/active-organization.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Permissions } from "./decorators/permissions.decorator";
import {
  AssignContextRoleDto,
  DeactivateRoleDto,
  SetCapabilityOverrideDto,
  SetRoleDelegationDto,
  SimulateAccessDto,
  SwitchRoleDto,
} from "./dto/access-control.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionsGuard } from "./guards/permissions.guard";

@Controller("organizations/:organizationId/access-control")
export class AccessControlController {
  constructor(
    @Inject(AccessControlService)
    private readonly accessControl: AccessControlService,
  ) {}

  @Get("contexts")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesView)
  contexts(@ActiveOrganization() organization: OrganizationContext) {
    return this.accessControl.listContexts(organization.id);
  }

  @Get("assignments")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesView)
  assignments(@ActiveOrganization() organization: OrganizationContext) {
    return this.accessControl.listAssignments(organization.id);
  }

  @Post("assignments")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesAssign)
  assign(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: AssignContextRoleDto,
  ) {
    return this.accessControl.assignRole(organization.id, actor, dto);
  }

  @Delete("assignments/:assignmentId")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesAssign)
  unassign(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.accessControl.removeAssignment(
      organization.id,
      actor,
      assignmentId,
    );
  }

  @Get("overrides")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesView)
  overrides(@ActiveOrganization() organization: OrganizationContext) {
    return this.accessControl.listOverrides(organization.id);
  }

  @Put("overrides")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesOverride)
  setOverride(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SetCapabilityOverrideDto,
  ) {
    return this.accessControl.setOverride(organization.id, actor, dto);
  }

  @Get("delegations")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesView)
  delegations(@ActiveOrganization() organization: OrganizationContext) {
    return this.accessControl.listDelegations(organization.id);
  }

  @Put("delegations")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  setDelegation(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SetRoleDelegationDto,
  ) {
    return this.accessControl.setDelegation(organization.id, actor, dto);
  }

  @Post("simulate")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesView)
  simulate(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SimulateAccessDto,
  ) {
    return this.accessControl.simulate(organization.id, actor, dto);
  }

  @Get("role-switch")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard)
  activeSwitches(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accessControl.activeSwitches(organization.id, actor);
  }

  @Post("role-switch")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesSwitch)
  switchRole(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SwitchRoleDto,
  ) {
    return this.accessControl.switchRole(organization.id, actor, dto);
  }

  @Delete("role-switch")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard)
  clearSwitches(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.accessControl.clearSwitches(organization.id, actor);
  }

  @Get("roles/:roleId/impact")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  roleImpact(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("roleId") roleId: string,
  ) {
    return this.accessControl.roleImpact(organization.id, roleId);
  }

  @Delete("roles/:roleId")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.rolesManage)
  deactivateRole(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("roleId") roleId: string,
    @Body() dto: DeactivateRoleDto,
  ) {
    return this.accessControl.deactivateRole(
      organization.id,
      actor,
      roleId,
      dto,
    );
  }
}
