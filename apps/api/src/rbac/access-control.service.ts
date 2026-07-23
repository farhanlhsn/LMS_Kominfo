import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PERMISSIONS, SYSTEM_ROLES } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import { AccessContextService } from "./access-context.service";
import { ContextualRbacService } from "./contextual-rbac.service";
import type {
  AssignContextRoleDto,
  DeactivateRoleDto,
  SetCapabilityOverrideDto,
  SetRoleDelegationDto,
  SimulateAccessDto,
  SwitchRoleDto,
} from "./dto/access-control.dto";

type DelegationAction = "canAssign" | "canOverride" | "canSwitch";

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccessContextService)
    private readonly contexts: AccessContextService,
    @Inject(ContextualRbacService)
    private readonly contextualRbac: ContextualRbacService,
  ) {}

  listContexts(organizationId: string) {
    return this.contexts.listOptions(organizationId);
  }

  listAssignments(organizationId: string) {
    return this.prisma.contextRoleAssignment.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true, isActive: true } },
        context: {
          select: {
            id: true,
            key: true,
            type: true,
            instanceId: true,
            isActive: true,
            missingReason: true,
          },
        },
        assignedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listOverrides(organizationId: string) {
    return this.prisma.roleCapabilityOverride.findMany({
      where: { organizationId },
      include: {
        role: { select: { id: true, key: true, name: true, isActive: true } },
        permission: {
          select: {
            id: true,
            key: true,
            description: true,
            component: true,
            riskBitmask: true,
            isActive: true,
            sourcePluginKey: true,
          },
        },
        context: {
          select: {
            id: true,
            key: true,
            type: true,
            instanceId: true,
            isActive: true,
            missingReason: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  listDelegations(organizationId: string) {
    return this.prisma.roleDelegation.findMany({
      where: { organizationId },
      include: {
        actorRole: {
          select: { id: true, key: true, name: true, isActive: true },
        },
        targetRole: {
          select: { id: true, key: true, name: true, isActive: true },
        },
      },
      orderBy: [
        { actorRole: { sortOrder: "asc" } },
        { targetRole: { sortOrder: "asc" } },
      ],
    });
  }

  async assignRole(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: AssignContextRoleDto,
  ) {
    const [role, member, context] = await Promise.all([
      this.getAssignableRole(organizationId, dto.roleId),
      this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: dto.userId,
          },
        },
        select: { id: true, status: true },
      }),
      this.contexts.ensureContext(organizationId, {
        type: dto.contextType,
        instanceId: dto.contextInstanceId,
      }),
    ]);
    if (!member || member.status !== "ACTIVE") {
      throw new BadRequestException("Target user is not an active member");
    }
    this.assertRoleSupportsContext(role.assignableContextTypes, dto.contextType);
    await this.assertDelegated(
      organizationId,
      actor.id,
      role.id,
      "canAssign",
    );
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (startsAt && expiresAt && startsAt >= expiresAt) {
      throw new BadRequestException("expiresAt must be later than startsAt");
    }
    const sourceComponent = dto.sourceComponent?.trim() || "core";
    const sourceId = dto.sourceId?.trim() || "";
    const assignment = await this.prisma.contextRoleAssignment.upsert({
      where: {
        contextId_roleId_userId_sourceComponent_sourceId: {
          contextId: context.id,
          roleId: role.id,
          userId: dto.userId,
          sourceComponent,
          sourceId,
        },
      },
      update: {
        assignedById: actor.id,
        startsAt,
        expiresAt,
      },
      create: {
        organizationId,
        contextId: context.id,
        roleId: role.id,
        userId: dto.userId,
        assignedById: actor.id,
        sourceComponent,
        sourceId,
        startsAt,
        expiresAt,
      },
      include: {
        role: { select: { id: true, key: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
        context: true,
      },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.context_role_assigned",
      "ContextRoleAssignment",
      assignment.id,
      {
        targetUserId: dto.userId,
        roleId: role.id,
        contextKey: context.key,
        sourceComponent,
        sourceId,
      },
    );
    return assignment;
  }

  async removeAssignment(
    organizationId: string,
    actor: AuthenticatedUser,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.contextRoleAssignment.findFirst({
      where: { id: assignmentId, organizationId },
      include: { role: true, context: true },
    });
    if (!assignment) throw new NotFoundException("Role assignment not found");
    await this.assertDelegated(
      organizationId,
      actor.id,
      assignment.roleId,
      "canAssign",
    );
    await this.prisma.contextRoleAssignment.delete({
      where: { id: assignment.id },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.context_role_unassigned",
      "ContextRoleAssignment",
      assignment.id,
      {
        targetUserId: assignment.userId,
        roleId: assignment.roleId,
        contextKey: assignment.context.key,
      },
    );
    return { removed: true };
  }

  async setOverride(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: SetCapabilityOverrideDto,
  ) {
    const [role, permission, context] = await Promise.all([
      this.getAssignableRole(organizationId, dto.roleId),
      this.prisma.permission.findUnique({
        where: { key: dto.permissionKey },
      }),
      this.contexts.ensureContext(organizationId, {
        type: dto.contextType,
        instanceId: dto.contextInstanceId,
      }),
    ]);
    if (!permission) throw new NotFoundException("Capability not found");
    await this.assertDelegated(
      organizationId,
      actor.id,
      role.id,
      "canOverride",
    );
    if (permission.key === PERMISSIONS.platformAdmin) {
      throw new ForbiddenException(
        "Platform administration cannot be delegated in organization context",
      );
    }

    if (dto.effect !== "INHERIT") {
      const ancestorIds = this.contexts
        .ancestorIds(context)
        .filter((id) => id !== context.id);
      const ancestorProhibit =
        await this.prisma.roleCapabilityOverride.findFirst({
          where: {
            roleId: role.id,
            permissionId: permission.id,
            contextId: { in: ancestorIds },
            effect: "PROHIBIT",
          },
          select: { id: true },
        });
      if (ancestorProhibit) {
        throw new BadRequestException(
          "Ancestor PROHIBIT cannot be overridden in a descendant context",
        );
      }
    }

    if (dto.effect === "INHERIT") {
      await this.prisma.roleCapabilityOverride.deleteMany({
        where: {
          contextId: context.id,
          roleId: role.id,
          permissionId: permission.id,
        },
      });
      await this.audit(
        organizationId,
        actor.id,
        "rbac.capability_override_inherited",
        "RoleCapabilityOverride",
        `${context.id}:${role.id}:${permission.id}`,
        {
          roleId: role.id,
          permissionKey: permission.key,
          contextKey: context.key,
        },
      );
      return { inherited: true };
    }

    const override = await this.prisma.roleCapabilityOverride.upsert({
      where: {
        contextId_roleId_permissionId: {
          contextId: context.id,
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {
        effect: dto.effect,
        createdById: actor.id,
      },
      create: {
        organizationId,
        contextId: context.id,
        roleId: role.id,
        permissionId: permission.id,
        effect: dto.effect,
        createdById: actor.id,
      },
      include: { role: true, permission: true, context: true },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.capability_override_set",
      "RoleCapabilityOverride",
      override.id,
      {
        roleId: role.id,
        permissionKey: permission.key,
        contextKey: context.key,
        effect: dto.effect,
      },
    );
    return override;
  }

  async setDelegation(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: SetRoleDelegationDto,
  ) {
    const [actorRole, targetRole] = await Promise.all([
      this.getAssignableRole(organizationId, dto.actorRoleId),
      this.getAssignableRole(organizationId, dto.targetRoleId),
    ]);
    const delegation = await this.prisma.roleDelegation.upsert({
      where: {
        organizationId_actorRoleId_targetRoleId: {
          organizationId,
          actorRoleId: actorRole.id,
          targetRoleId: targetRole.id,
        },
      },
      update: {
        canView: dto.canView,
        canAssign: dto.canAssign,
        canOverride: dto.canOverride,
        canSwitch: dto.canSwitch,
      },
      create: {
        organizationId,
        actorRoleId: actorRole.id,
        targetRoleId: targetRole.id,
        canView: dto.canView,
        canAssign: dto.canAssign,
        canOverride: dto.canOverride,
        canSwitch: dto.canSwitch,
      },
      include: { actorRole: true, targetRole: true },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.role_delegation_set",
      "RoleDelegation",
      delegation.id,
      {
        actorRoleId: dto.actorRoleId,
        targetRoleId: dto.targetRoleId,
        canView: dto.canView,
        canAssign: dto.canAssign,
        canOverride: dto.canOverride,
        canSwitch: dto.canSwitch,
      },
    );
    return delegation;
  }

  simulate(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: SimulateAccessDto,
  ) {
    return this.contextualRbac.evaluateMany({
      organizationId,
      userId: dto.userId,
      sessionId: dto.userId === actor.id ? actor.sessionId : undefined,
      permissionKeys: dto.permissionKeys,
      context: {
        type: dto.contextType,
        instanceId: dto.contextInstanceId,
      },
      ignoreAdminBypass: dto.ignoreAdminBypass,
    });
  }

  async switchRole(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: SwitchRoleDto,
  ) {
    const [role, context] = await Promise.all([
      this.getAssignableRole(organizationId, dto.roleId),
      this.contexts.ensureContext(organizationId, {
        type: dto.contextType,
        instanceId: dto.contextInstanceId,
      }),
    ]);
    this.assertRoleSupportsContext(role.assignableContextTypes, dto.contextType);
    await this.assertDelegated(
      organizationId,
      actor.id,
      role.id,
      "canSwitch",
    );
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 4 * 60 * 60 * 1000);
    if (expiresAt <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }
    const roleSwitch = await this.prisma.roleSwitch.upsert({
      where: {
        sessionId_contextId: {
          sessionId: actor.sessionId,
          contextId: context.id,
        },
      },
      update: {
        roleId: role.id,
        expiresAt,
      },
      create: {
        organizationId,
        sessionId: actor.sessionId,
        userId: actor.id,
        contextId: context.id,
        roleId: role.id,
        expiresAt,
      },
      include: { role: true, context: true },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.role_switched",
      "RoleSwitch",
      roleSwitch.id,
      {
        roleId: role.id,
        contextKey: context.key,
        expiresAt: expiresAt.toISOString(),
      },
    );
    return roleSwitch;
  }

  activeSwitches(organizationId: string, actor: AuthenticatedUser) {
    return this.prisma.roleSwitch.findMany({
      where: {
        organizationId,
        userId: actor.id,
        sessionId: actor.sessionId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { role: true, context: true },
      orderBy: { context: { depth: "desc" } },
    });
  }

  async clearSwitches(organizationId: string, actor: AuthenticatedUser) {
    const result = await this.prisma.roleSwitch.deleteMany({
      where: {
        organizationId,
        userId: actor.id,
        sessionId: actor.sessionId,
      },
    });
    await this.audit(
      organizationId,
      actor.id,
      "rbac.role_switch_cleared",
      "UserSession",
      actor.sessionId,
      { count: result.count },
    );
    return { cleared: result.count };
  }

  async roleImpact(organizationId: string, roleId: string) {
    await this.getAssignableRole(organizationId, roleId);
    const [
      legacyAssignments,
      contextAssignments,
      overrides,
      delegationsAsActor,
      delegationsAsTarget,
      activeSwitches,
    ] = await Promise.all([
      this.prisma.memberRole.count({ where: { roleId } }),
      this.prisma.contextRoleAssignment.count({ where: { roleId } }),
      this.prisma.roleCapabilityOverride.count({ where: { roleId } }),
      this.prisma.roleDelegation.count({ where: { actorRoleId: roleId } }),
      this.prisma.roleDelegation.count({ where: { targetRoleId: roleId } }),
      this.prisma.roleSwitch.count({
        where: {
          roleId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);
    return {
      legacyAssignments,
      contextAssignments,
      overrides,
      delegationsAsActor,
      delegationsAsTarget,
      activeSwitches,
    };
  }

  async deactivateRole(
    organizationId: string,
    actor: AuthenticatedUser,
    roleId: string,
    dto: DeactivateRoleDto,
  ) {
    const role = await this.getAssignableRole(organizationId, roleId);
    if (role.isSystem) {
      throw new BadRequestException("System roles cannot be removed");
    }
    if (dto.confirmKey !== role.key) {
      throw new BadRequestException("confirmKey must match role key");
    }
    const impact = await this.roleImpact(organizationId, roleId);
    await this.prisma.$transaction([
      this.prisma.role.update({
        where: { id: role.id },
        data: { isActive: false, deletedAt: new Date() },
      }),
      this.prisma.roleSwitch.deleteMany({ where: { roleId: role.id } }),
    ]);
    await this.audit(
      organizationId,
      actor.id,
      "rbac.role_deactivated",
      "Role",
      role.id,
      { roleKey: role.key, impact },
    );
    return {
      deactivated: true,
      behavior:
        "Assignments and overrides retained for audit; inactive role grants no access.",
      impact,
    };
  }

  private async getAssignableRole(organizationId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId, isActive: true },
    });
    if (!role) throw new NotFoundException("Active organization role not found");
    return role;
  }

  private assertRoleSupportsContext(value: unknown, contextType: string) {
    const allowed = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    if (allowed.length > 0 && !allowed.includes(contextType)) {
      throw new BadRequestException(
        `Role cannot be assigned in ${contextType} context`,
      );
    }
  }

  private async assertDelegated(
    organizationId: string,
    actorUserId: string,
    targetRoleId: string,
    action: DelegationAction,
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: actorUserId },
      },
      include: {
        memberRoles: {
          where: { role: { isActive: true } },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
    if (!member || member.status !== "ACTIVE") {
      throw new ForbiddenException("Active organization membership required");
    }
    const actorRoles = member.memberRoles.map(({ role }) => role);
    const isPlatformAdmin = actorRoles.some(
      (role) =>
        role.key === SYSTEM_ROLES.superAdmin ||
        role.rolePermissions.some(
          ({ permission }) => permission.key === PERMISSIONS.platformAdmin,
        ),
    );
    if (isPlatformAdmin) return;
    const delegation = await this.prisma.roleDelegation.findFirst({
      where: {
        organizationId,
        actorRoleId: { in: actorRoles.map((role) => role.id) },
        targetRoleId,
        [action]: true,
      },
      select: { id: true },
    });
    if (!delegation) {
      throw new ForbiddenException(
        `Role delegation does not permit ${action.slice(3).toLowerCase()}`,
      );
    }
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
