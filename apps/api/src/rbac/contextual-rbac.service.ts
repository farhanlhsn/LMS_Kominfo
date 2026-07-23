import { Inject, Injectable } from "@nestjs/common";
import { PLUGIN_CATALOG_MANIFESTS, SYSTEM_ROLES } from "@lms/shared";
import type { AccessContextType, CapabilityEffect } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import {
  AccessContextService,
  type AccessContextReference,
} from "./access-context.service";

export interface CapabilityDecision {
  permissionKey: string;
  allowed: boolean;
  reason:
    | "ALLOWED"
    | "NOT_GRANTED"
    | "PROHIBITED"
    | "MISSING_CAPABILITY"
    | "INACTIVE_CAPABILITY"
    | "INVALID_CONTEXT"
    | "PLUGIN_DISABLED"
    | "PLUGIN_MISSING"
    | "INACTIVE_MEMBERSHIP"
    | "ADMIN_BYPASS";
  context: {
    id: string;
    key: string;
    type: AccessContextType;
    instanceId: string;
  };
  switchedRole: { id: string; key: string; name: string } | null;
  roles: Array<{
    id: string;
    key: string;
    name: string;
    assignedAt: string[];
    baseGrant: boolean;
    effectiveEffect: CapabilityEffect | "NONE";
    allowed: boolean;
  }>;
}

export interface RoleCapabilityState {
  id: string;
  key: string;
  name: string;
  assignedAt: string[];
  baseGrant: boolean;
  overrides: Array<{ effect: CapabilityEffect; depth: number }>;
}

export function resolveCapabilityStates(states: RoleCapabilityState[]) {
  let prohibited = false;
  let allowed = false;
  const roles: CapabilityDecision["roles"] = states.map((state) => {
    const roleProhibited = state.overrides.some(
      (override) => override.effect === "PROHIBIT",
    );
    prohibited ||= roleProhibited;
    const nearest = state.overrides
      .filter((override) => override.effect !== "INHERIT")
      .sort((left, right) => right.depth - left.depth)[0];
    const roleAllowed =
      !roleProhibited &&
      (nearest ? nearest.effect === "ALLOW" : state.baseGrant);
    allowed ||= roleAllowed;
    return {
      id: state.id,
      key: state.key,
      name: state.name,
      assignedAt: state.assignedAt,
      baseGrant: state.baseGrant,
      effectiveEffect: nearest?.effect ?? "NONE",
      allowed: roleAllowed,
    };
  });
  return {
    prohibited,
    allowed: prohibited ? false : allowed,
    roles,
  };
}

@Injectable()
export class ContextualRbacService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AccessContextService)
    private readonly contexts: AccessContextService,
  ) {}

  async hasAllPermissions(input: {
    organizationId: string;
    userId: string;
    sessionId?: string;
    permissionKeys: readonly string[];
    context?: AccessContextReference;
  }) {
    if (input.permissionKeys.length === 0) return false;
    const decisions = await this.evaluateMany(input);
    return decisions.every((decision) => decision.allowed);
  }

  async getOrganizationSnapshot(input: {
    organizationId: string;
    userId: string;
    sessionId?: string;
  }) {
    const context = await this.contexts.ensureOrganizationContext(
      input.organizationId,
    );
    const ancestorIds = this.contexts.ancestorIds(context);
    const ancestorContexts = await this.prisma.accessContext.findMany({
      where: { id: { in: ancestorIds } },
      select: { id: true, key: true, depth: true },
    });
    const depthByContextId = new Map(
      ancestorContexts.map((item) => [item.id, item.depth]),
    );
    const now = new Date();
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
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
      return { roleKeys: [], permissionKeys: [], isPlatformAdmin: false };
    }
    const assignments = await this.prisma.contextRoleAssignment.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        contextId: { in: ancestorIds },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
        role: { isActive: true },
      },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
        context: { select: { key: true } },
      },
    });
    const roleSwitch = input.sessionId
      ? await this.prisma.roleSwitch.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.userId,
            sessionId: input.sessionId,
            contextId: { in: ancestorIds },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            role: { isActive: true },
          },
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
            context: { select: { key: true, depth: true } },
          },
          orderBy: { context: { depth: "desc" } },
        })
      : null;

    const baselineRoles = member.memberRoles.map(({ role }) => role);
    const platformAdmin = baselineRoles.some(
      (role) =>
        role.key === SYSTEM_ROLES.superAdmin ||
        role.rolePermissions.some(
          ({ permission }) => permission.key === "platform:admin",
        ),
    );
    const roles = new Map<
      string,
      {
        role: (typeof baselineRoles)[number];
        assignedAt: Set<string>;
      }
    >();
    if (roleSwitch) {
      roles.set(roleSwitch.role.id, {
        role: roleSwitch.role,
        assignedAt: new Set([roleSwitch.context.key]),
      });
    } else {
      for (const role of baselineRoles) {
        roles.set(role.id, {
          role,
          assignedAt: new Set([`organization:${input.organizationId}`]),
        });
      }
      for (const assignment of assignments) {
        const existing = roles.get(assignment.role.id);
        if (existing) existing.assignedAt.add(assignment.context.key);
        else {
          roles.set(assignment.role.id, {
            role: assignment.role,
            assignedAt: new Set([assignment.context.key]),
          });
        }
      }
    }

    const roleIds = [...roles.keys()];
    const overrides =
      roleIds.length === 0
        ? []
        : await this.prisma.roleCapabilityOverride.findMany({
            where: {
              roleId: { in: roleIds },
              contextId: { in: ancestorIds },
            },
            include: { permission: true },
          });
    const permissionMap = new Map(
      [...roles.values()]
        .flatMap(({ role }) =>
          role.rolePermissions.map(({ permission }) => permission),
        )
        .concat(overrides.map(({ permission }) => permission))
        .map((permission) => [permission.id, permission]),
    );
    if (platformAdmin && !roleSwitch) {
      const allPermissions = await this.prisma.permission.findMany({
        where: { isActive: true },
      });
      for (const permission of allPermissions) {
        permissionMap.set(permission.id, permission);
      }
    }

    const permissionKeys: string[] = [];
    const pluginAvailability = new Map<
      string,
      "AVAILABLE" | "PLUGIN_DISABLED" | "PLUGIN_MISSING"
    >();
    for (const permission of permissionMap.values()) {
      if (!permission.isActive) continue;
      const contextTypes = this.stringArray(permission.contextTypes);
      if (
        contextTypes.length > 0 &&
        !contextTypes.includes("ORGANIZATION") &&
        !contextTypes.includes("SYSTEM")
      ) {
        continue;
      }
      if (permission.sourcePluginKey) {
        let availability = pluginAvailability.get(permission.sourcePluginKey);
        if (!availability) {
          availability = await this.pluginAvailability(
            input.organizationId,
            permission.sourcePluginKey,
          );
          pluginAvailability.set(permission.sourcePluginKey, availability);
        }
        if (availability !== "AVAILABLE") continue;
      }
      if (platformAdmin && !roleSwitch) {
        permissionKeys.push(permission.key);
        continue;
      }
      const states = [...roles.values()].map(({ role, assignedAt }) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        assignedAt: [...assignedAt],
        baseGrant: role.rolePermissions.some(
          (rolePermission) =>
            rolePermission.permissionId === permission.id,
        ),
        overrides: overrides
          .filter(
            (override) =>
              override.roleId === role.id &&
              override.permissionId === permission.id,
          )
          .map((override) => ({
            effect: override.effect,
            depth: depthByContextId.get(override.contextId) ?? -1,
          })),
      }));
      if (resolveCapabilityStates(states).allowed) {
        permissionKeys.push(permission.key);
      }
    }

    return {
      roleKeys: [...roles.values()].map(({ role }) => role.key),
      permissionKeys: [...new Set(permissionKeys)].sort(),
      isPlatformAdmin: platformAdmin && !roleSwitch,
    };
  }

  async evaluateMany(input: {
    organizationId: string;
    userId: string;
    sessionId?: string;
    permissionKeys: readonly string[];
    context?: AccessContextReference;
    ignoreAdminBypass?: boolean;
  }) {
    const uniqueKeys = [...new Set(input.permissionKeys)];
    return Promise.all(
      uniqueKeys.map((permissionKey) =>
        this.evaluate({
          ...input,
          permissionKey,
        }),
      ),
    );
  }

  async evaluate(input: {
    organizationId: string;
    userId: string;
    sessionId?: string;
    permissionKey: string;
    context?: AccessContextReference;
    ignoreAdminBypass?: boolean;
  }): Promise<CapabilityDecision> {
    const context = await this.contexts.ensureContext(
      input.organizationId,
      input.context ?? {
        type: "ORGANIZATION",
        instanceId: input.organizationId,
      },
    );
    const emptyDecision = (
      reason: CapabilityDecision["reason"],
    ): CapabilityDecision => ({
      permissionKey: input.permissionKey,
      allowed: false,
      reason,
      context: {
        id: context.id,
        key: context.key,
        type: context.type,
        instanceId: context.instanceId,
      },
      switchedRole: null,
      roles: [],
    });

    const permission = await this.prisma.permission.findUnique({
      where: { key: input.permissionKey },
    });
    if (!permission) return emptyDecision("MISSING_CAPABILITY");
    if (!permission.isActive) return emptyDecision("INACTIVE_CAPABILITY");

    const allowedContextTypes = this.stringArray(permission.contextTypes);
    if (
      allowedContextTypes.length > 0 &&
      !allowedContextTypes.includes(context.type)
    ) {
      return emptyDecision("INVALID_CONTEXT");
    }

    if (permission.sourcePluginKey) {
      const availability = await this.pluginAvailability(
        input.organizationId,
        permission.sourcePluginKey,
      );
      if (availability !== "AVAILABLE") {
        return emptyDecision(availability);
      }
    }

    const now = new Date();
    const ancestorIds = this.contexts.ancestorIds(context);
    const ancestorContexts = await this.prisma.accessContext.findMany({
      where: { id: { in: ancestorIds } },
      select: { id: true, key: true, depth: true },
    });
    const contextById = new Map(
      ancestorContexts.map((item) => [item.id, item]),
    );

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      include: {
        organization: { select: { status: true } },
        memberRoles: {
          where: { role: { isActive: true } },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    permission: {
                      key: { in: [input.permissionKey, "platform:admin"] },
                    },
                  },
                  select: {
                    permissionId: true,
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (
      !member ||
      member.status !== "ACTIVE" ||
      member.organization.status !== "ACTIVE"
    ) {
      return emptyDecision("INACTIVE_MEMBERSHIP");
    }

    const contextualAssignments =
      await this.prisma.contextRoleAssignment.findMany({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          contextId: { in: ancestorIds },
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
          role: { isActive: true },
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                where: {
                  permission: {
                    key: { in: [input.permissionKey, "platform:admin"] },
                  },
                },
                select: {
                  permissionId: true,
                  permission: { select: { key: true } },
                },
              },
            },
          },
          context: { select: { key: true } },
        },
      });

    const roleSwitch = input.sessionId
      ? await this.prisma.roleSwitch.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.userId,
            sessionId: input.sessionId,
            contextId: { in: ancestorIds },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            role: { isActive: true },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    permission: {
                      key: { in: [input.permissionKey, "platform:admin"] },
                    },
                  },
                  select: {
                    permissionId: true,
                    permission: { select: { key: true } },
                  },
                },
              },
            },
            context: { select: { depth: true } },
          },
          orderBy: { context: { depth: "desc" } },
        })
      : null;

    const baselineRoles = member.memberRoles.map(({ role }) => role);
    const isPlatformAdmin = baselineRoles.some(
      (role) =>
        role.key === SYSTEM_ROLES.superAdmin ||
        role.rolePermissions.some(
          (rolePermission) =>
            rolePermission.permission.key === "platform:admin",
        ),
    );

    if (isPlatformAdmin && !roleSwitch && !input.ignoreAdminBypass) {
      return {
        ...emptyDecision("ADMIN_BYPASS"),
        allowed: true,
      };
    }

    const activeRoles = new Map<
      string,
      {
        role: (typeof baselineRoles)[number];
        assignedAt: Set<string>;
      }
    >();
    const organizationContext = ancestorContexts.find(
      (item) => item.key === `organization:${input.organizationId}`,
    );

    if (roleSwitch) {
      activeRoles.set(roleSwitch.role.id, {
        role: roleSwitch.role,
        assignedAt: new Set([
          contextById.get(roleSwitch.contextId)?.key ??
            `context:${roleSwitch.contextId}`,
        ]),
      });
    } else {
      for (const role of baselineRoles) {
        activeRoles.set(role.id, {
          role,
          assignedAt: new Set([
            organizationContext?.key ?? `organization:${input.organizationId}`,
          ]),
        });
      }
      for (const assignment of contextualAssignments) {
        const existing = activeRoles.get(assignment.role.id);
        if (existing) {
          existing.assignedAt.add(assignment.context.key);
        } else {
          activeRoles.set(assignment.role.id, {
            role: assignment.role,
            assignedAt: new Set([assignment.context.key]),
          });
        }
      }
    }

    const roleIds = [...activeRoles.keys()];
    const overrides =
      roleIds.length === 0
        ? []
        : await this.prisma.roleCapabilityOverride.findMany({
            where: {
              roleId: { in: roleIds },
              permissionId: permission.id,
              contextId: { in: ancestorIds },
            },
          });

    const roleStates: RoleCapabilityState[] = [];
    for (const { role, assignedAt } of activeRoles.values()) {
      const roleOverrides = overrides.filter(
        (override) => override.roleId === role.id,
      );
      const baseGrant = role.rolePermissions.some(
        (rolePermission) => rolePermission.permissionId === permission.id,
      );
      roleStates.push({
        id: role.id,
        key: role.key,
        name: role.name,
        assignedAt: [...assignedAt],
        baseGrant,
        overrides: roleOverrides.map((override) => ({
          effect: override.effect,
          depth: contextById.get(override.contextId)?.depth ?? -1,
        })),
      });
    }
    const resolved = resolveCapabilityStates(roleStates);

    return {
      permissionKey: input.permissionKey,
      allowed: resolved.allowed,
      reason: resolved.prohibited
        ? "PROHIBITED"
        : resolved.allowed
          ? "ALLOWED"
          : "NOT_GRANTED",
      context: {
        id: context.id,
        key: context.key,
        type: context.type,
        instanceId: context.instanceId,
      },
      switchedRole: roleSwitch
        ? {
            id: roleSwitch.role.id,
            key: roleSwitch.role.key,
            name: roleSwitch.role.name,
          }
        : null,
      roles: resolved.roles,
    };
  }

  private stringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  private async pluginAvailability(
    organizationId: string,
    pluginKey: string,
  ): Promise<"AVAILABLE" | "PLUGIN_DISABLED" | "PLUGIN_MISSING"> {
    if (
      !PLUGIN_CATALOG_MANIFESTS.some((manifest) => manifest.key === pluginKey)
    ) {
      return "PLUGIN_MISSING";
    }
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
      include: {
        organizationPlugins: {
          where: { organizationId },
          select: { enabled: true },
        },
      },
    });
    if (!plugin) return "PLUGIN_MISSING";
    if (
      plugin.status !== "ACTIVE" ||
      !plugin.organizationPlugins[0]?.enabled
    ) {
      return "PLUGIN_DISABLED";
    }
    const installation = await this.prisma.pluginInstallation.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        listing: { pluginId: pluginKey },
      },
      select: { id: true },
    });
    return installation ? "AVAILABLE" : "PLUGIN_DISABLED";
  }
}
