import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { Prisma } from "@lms/db";
import { SYSTEM_ROLES } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateOrganizationMemberDto,
  CreateOrganizationRoleDto,
  UpdateOrganizationMemberRolesDto,
  UpdateOrganizationMemberStatusDto,
  UpdateOrganizationRoleDto,
} from "./dto/organization-member.dto";

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMembers(organizationId: string): Promise<
    Array<{
      id: string;
      status: string;
      user: {
        id: string;
        email: string;
        name: string | null;
      };
      roles: string[];
    }>
  > {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: true,
        memberRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return members.map((member) => ({
      id: member.id,
      status: member.status,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name
      },
      roles: member.memberRoles.map((memberRole) => memberRole.role.key)
    }));
  }

  async listRoles(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: {
          include: { permission: true },
          orderBy: { permission: { key: "asc" } },
        },
      },
      orderBy: [{ isSystem: "desc" }, { key: "asc" }],
    });
    return roles.map((role) => this.rolePayload(role));
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  async createMember(
    organizationId: string,
    actorUserId: string,
    dto: CreateOrganizationMemberDto,
  ) {
    const email = dto.email.trim().toLowerCase();
    const roleKeys = dto.roleKeys?.length ? dto.roleKeys : [SYSTEM_ROLES.learner];
    const roles = await this.getRolesByKeys(organizationId, roleKeys);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (!existingUser && !dto.password) {
      throw new BadRequestException("Password is required for a new user");
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email,
            name: dto.name?.trim() || null,
            passwordHash: await bcrypt.hash(dto.password!, 12),
            status: "ACTIVE",
            identities: {
              create: {
                providerType: "PASSWORD",
                providerSubject: email,
                providerEmail: email,
                providerEmailVerified: true,
              },
            },
          },
        }));

      const organizationMember = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
        update: {
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        create: {
          organizationId,
          userId: user.id,
          status: "ACTIVE",
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      });

      await tx.memberRole.deleteMany({
        where: { memberId: organizationMember.id },
      });
      await tx.memberRole.createMany({
        data: roles.map((role) => ({
          memberId: organizationMember.id,
          roleId: role.id,
        })),
      });

      return tx.organizationMember.findFirstOrThrow({
        where: { id: organizationMember.id, organizationId },
        include: {
          user: true,
          memberRoles: { include: { role: true } },
        },
      });
    });

    await this.audit(organizationId, actorUserId, "organization_member.upserted", member.id, {
      targetUserId: member.userId,
      roleKeys,
    });

    return this.memberPayload(member);
  }

  async updateMemberRoles(
    organizationId: string,
    actorUserId: string,
    memberId: string,
    dto: UpdateOrganizationMemberRolesDto,
  ) {
    const roles = await this.getRolesByKeys(organizationId, dto.roleKeys);
    const member = await this.getMember(organizationId, memberId);
    await this.ensureOrgAdminSafety(
      organizationId,
      memberId,
      member.memberRoles.map((memberRole) => memberRole.role.key),
      dto.roleKeys,
      member.status,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.memberRole.deleteMany({ where: { memberId } });
      await tx.memberRole.createMany({
        data: roles.map((role) => ({ memberId, roleId: role.id })),
      });
      return tx.organizationMember.findFirstOrThrow({
        where: { id: memberId, organizationId },
        include: { user: true, memberRoles: { include: { role: true } } },
      });
    });

    await this.audit(organizationId, actorUserId, "organization_member.roles_updated", memberId, {
      roleKeys: dto.roleKeys,
    });

    return this.memberPayload(updated);
  }

  async updateMemberStatus(
    organizationId: string,
    actorUserId: string,
    memberId: string,
    dto: UpdateOrganizationMemberStatusDto,
  ) {
    const member = await this.getMember(organizationId, memberId);
    const currentRoleKeys = member.memberRoles.map((memberRole) => memberRole.role.key);
    await this.ensureOrgAdminSafety(
      organizationId,
      memberId,
      currentRoleKeys,
      currentRoleKeys,
      dto.status,
    );

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        status: dto.status,
        joinedAt: dto.status === "ACTIVE" ? (member.joinedAt ?? new Date()) : member.joinedAt,
      },
      include: { user: true, memberRoles: { include: { role: true } } },
    });

    await this.audit(organizationId, actorUserId, "organization_member.status_updated", memberId, {
      status: dto.status,
    });

    return this.memberPayload(updated);
  }

  async createRole(
    organizationId: string,
    actorUserId: string,
    dto: CreateOrganizationRoleDto,
  ) {
    const key = dto.key.trim().toLowerCase();
    const existing = await this.prisma.role.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    if (existing) {
      throw new ConflictException("Role key is already in use");
    }
    const permissions = await this.getPermissionsByKeys(dto.permissionKeys ?? []);
    const role = await this.prisma.role.create({
      data: {
        organizationId,
        key,
        name: dto.name.trim(),
        description: dto.description,
        isSystem: false,
        rolePermissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
          orderBy: { permission: { key: "asc" } },
        },
      },
    });
    await this.audit(organizationId, actorUserId, "organization_role.created", role.id, {
      roleKey: role.key,
    });
    return this.rolePayload(role);
  }

  async updateRole(
    organizationId: string,
    actorUserId: string,
    roleId: string,
    dto: UpdateOrganizationRoleDto,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException("Role not found");
    if (role.isSystem && dto.permissionKeys) {
      throw new BadRequestException("System role permissions are managed by the platform defaults");
    }

    const permissions = dto.permissionKeys
      ? await this.getPermissionsByKeys(dto.permissionKeys)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissions.length) {
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId,
              permissionId: permission.id,
            })),
          });
        }
      }
      return tx.role.update({
        where: { id: roleId },
        data: {
          name: dto.name?.trim(),
          description: dto.description,
        },
        include: {
          rolePermissions: {
            include: { permission: true },
            orderBy: { permission: { key: "asc" } },
          },
        },
      });
    });

    await this.audit(organizationId, actorUserId, "organization_role.updated", roleId, {
      roleKey: updated.key,
      permissionKeys: dto.permissionKeys,
    });

    return this.rolePayload(updated);
  }

  private async getMember(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true, memberRoles: { include: { role: true } } },
    });
    if (!member) throw new NotFoundException("Organization member not found");
    return member;
  }

  private async getRolesByKeys(organizationId: string, roleKeys: string[]) {
    const uniqueKeys = [...new Set(roleKeys.map((key) => key.trim()).filter(Boolean))];
    if (!uniqueKeys.length) {
      throw new BadRequestException("At least one role is required");
    }
    const roles = await this.prisma.role.findMany({
      where: { organizationId, key: { in: uniqueKeys } },
    });
    const found = new Set(roles.map((role) => role.key));
    const missing = uniqueKeys.filter((key) => !found.has(key));
    if (missing.length) {
      throw new BadRequestException(`Unknown role(s): ${missing.join(", ")}`);
    }
    return roles;
  }

  private async getPermissionsByKeys(permissionKeys: string[]) {
    const uniqueKeys = [...new Set(permissionKeys.map((key) => key.trim()).filter(Boolean))];
    if (!uniqueKeys.length) return [];
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: uniqueKeys } },
    });
    const found = new Set(permissions.map((permission) => permission.key));
    const missing = uniqueKeys.filter((key) => !found.has(key));
    if (missing.length) {
      throw new BadRequestException(`Unknown permission(s): ${missing.join(", ")}`);
    }
    return permissions;
  }

  private async ensureOrgAdminSafety(
    organizationId: string,
    memberId: string,
    currentRoleKeys: string[],
    nextRoleKeys: string[],
    nextStatus: string,
  ) {
    const currentlyOrgAdmin = currentRoleKeys.includes(SYSTEM_ROLES.orgAdmin);
    const remainsActiveOrgAdmin =
      nextStatus === "ACTIVE" && nextRoleKeys.includes(SYSTEM_ROLES.orgAdmin);
    if (!currentlyOrgAdmin || remainsActiveOrgAdmin) return;

    const otherAdmins = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        id: { not: memberId },
        status: "ACTIVE",
        memberRoles: {
          some: { role: { key: SYSTEM_ROLES.orgAdmin, organizationId } },
        },
      },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException("At least one active organization admin is required");
    }
  }

  private memberPayload(member: {
    id: string;
    status: string;
    user: { id: string; email: string; name: string | null };
    memberRoles: Array<{ role: { key: string } }>;
  }) {
    return {
      id: member.id,
      status: member.status,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
      },
      roles: member.memberRoles.map((memberRole) => memberRole.role.key),
    };
  }

  private rolePayload(role: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    rolePermissions: Array<{ permission: { key: string; description: string | null } }>;
  }) {
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rolePermission) => ({
        key: rolePermission.permission.key,
        description: rolePermission.permission.description,
      })),
    };
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "OrganizationMember",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
