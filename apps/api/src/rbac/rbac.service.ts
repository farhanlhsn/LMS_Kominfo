import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PERMISSIONS, SYSTEM_ROLES } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";

@Injectable()
export class RbacService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureOrganizationDefaults(organizationId: string) {
    const permissions = await this.prisma.permission.findMany();

    const roles: Array<[string, string, string[]]> = [
      [SYSTEM_ROLES.orgAdmin, "Organization Admin", permissions.map((permission) => permission.key)],
      [
        SYSTEM_ROLES.courseManager,
        "Course Manager",
        [
          PERMISSIONS.coursesRead,
          PERMISSIONS.coursesCreate,
          PERMISSIONS.coursesUpdate,
          PERMISSIONS.coursesPublish,
          PERMISSIONS.analyticsView,
          PERMISSIONS.analyticsExport
        ]
      ],
      [SYSTEM_ROLES.instructor, "Instructor", [PERMISSIONS.coursesRead, PERMISSIONS.coursesUpdate, PERMISSIONS.analyticsView]],
      [SYSTEM_ROLES.assistantInstructor, "Assistant Instructor", [PERMISSIONS.coursesRead]],
      [SYSTEM_ROLES.reviewer, "Reviewer", [PERMISSIONS.coursesRead, PERMISSIONS.coursesPublish]],
      [SYSTEM_ROLES.mentor, "Mentor", [PERMISSIONS.coursesRead]],
      [SYSTEM_ROLES.learner, "Learner", [PERMISSIONS.coursesRead, PERMISSIONS.analyticsView]],
      [SYSTEM_ROLES.supportAdmin, "Support Admin", [PERMISSIONS.usersRead, PERMISSIONS.auditRead]],
      [SYSTEM_ROLES.financeAdmin, "Finance Admin", [PERMISSIONS.auditRead]]
    ] as const;

    await Promise.all(
      roles.map(async ([key, name, permissionKeys]) => {
        const role = await this.prisma.role.upsert({
          where: {
            organizationId_key: {
              organizationId,
              key
            }
          },
          update: { name, isSystem: true },
          create: {
            organizationId,
            key,
            name,
            isSystem: true
          }
        });

        const rolePermissions = permissions.filter((permission) =>
          permissionKeys.includes(permission.key)
        );

        await Promise.all(
          rolePermissions.map((permission) =>
            this.prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permission.id
                }
              },
              update: {},
              create: {
                roleId: role.id,
                permissionId: permission.id
              }
            })
          )
        );
      })
    );
  }

  async getOrganizationContext(
    userId: string,
    organizationId: string
  ): Promise<OrganizationContext> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      },
      include: {
        organization: true,
        memberRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!member) {
      throw new NotFoundException("Organization membership not found");
    }

    if (member.status !== "ACTIVE" || member.organization.status !== "ACTIVE") {
      throw new ForbiddenException("Organization membership is not active");
    }

    const roleKeys = new Set<string>();
    const permissionKeys = new Set<string>();

    for (const memberRole of member.memberRoles) {
      roleKeys.add(memberRole.role.key);
      for (const rolePermission of memberRole.role.rolePermissions) {
        permissionKeys.add(rolePermission.permission.key);
      }
    }

    const isPlatformAdmin =
      roleKeys.has(SYSTEM_ROLES.superAdmin) ||
      permissionKeys.has(PERMISSIONS.platformAdmin);

    return {
      id: member.organization.id,
      slug: member.organization.slug,
      name: member.organization.name,
      memberId: member.id,
      roleKeys: [...roleKeys],
      permissionKeys: [...permissionKeys],
      isPlatformAdmin
    };
  }

  hasPermissions(
    context: OrganizationContext,
    requiredPermissions: readonly string[]
  ) {
    if (requiredPermissions.length === 0 || context.isPlatformAdmin) {
      return true;
    }

    return requiredPermissions.every((permission) =>
      context.permissionKeys.includes(permission)
    );
  }
}
