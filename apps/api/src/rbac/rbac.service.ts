import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { PERMISSIONS, SYSTEM_ROLES } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { AccessContextReference } from "./access-context.service";
import { ContextualRbacService } from "./contextual-rbac.service";

@Injectable()
export class RbacService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(ContextualRbacService)
    private readonly contextualRbac?: ContextualRbacService,
  ) {}

  async ensureOrganizationDefaults(organizationId: string) {
    const permissions = await this.prisma.permission.findMany();

    const allOrganizationPermissions = permissions
      .map((permission) => permission.key)
      .filter((key) => key !== PERMISSIONS.platformAdmin);

    const roles: Array<[string, string, string[]]> = [
      [SYSTEM_ROLES.orgAdmin, "Organization Admin", allOrganizationPermissions],
      [
        SYSTEM_ROLES.courseManager,
        "Course Manager",
        [
          PERMISSIONS.coursesRead,
          PERMISSIONS.coursesCreate,
          PERMISSIONS.coursesUpdate,
          PERMISSIONS.coursesPublish,
          PERMISSIONS.filesRead,
          PERMISSIONS.filesCreate,
          PERMISSIONS.filesDelete,
          PERMISSIONS.contentLibraryManage,
          PERMISSIONS.contentProcess,
          PERMISSIONS.quizManage,
          PERMISSIONS.quizGrade,
          PERMISSIONS.assignmentsManage,
          PERMISSIONS.assignmentsGrade,
          PERMISSIONS.certificatesManage,
          PERMISSIONS.certificatesIssue,
          PERMISSIONS.goalsManage,
          PERMISSIONS.analyticsView,
          PERMISSIONS.analyticsExport
        ]
      ],
      [
        SYSTEM_ROLES.instructor,
        "Instructor",
        [
          PERMISSIONS.coursesRead,
          PERMISSIONS.coursesCreate,
          PERMISSIONS.coursesUpdate,
          PERMISSIONS.coursesPublish,
          PERMISSIONS.filesRead,
          PERMISSIONS.filesCreate,
          PERMISSIONS.contentLibraryManage,
          PERMISSIONS.contentProcess,
          PERMISSIONS.quizManage,
          PERMISSIONS.quizGrade,
          PERMISSIONS.assignmentsManage,
          PERMISSIONS.assignmentsGrade,
          PERMISSIONS.certificatesIssue,
          PERMISSIONS.analyticsView
        ]
      ],
      [
        SYSTEM_ROLES.assistantInstructor,
        "Assistant Instructor",
        [
          PERMISSIONS.coursesRead,
          PERMISSIONS.coursesUpdate,
          PERMISSIONS.filesRead,
          PERMISSIONS.filesCreate,
          PERMISSIONS.contentLibraryManage,
          PERMISSIONS.quizManage,
          PERMISSIONS.assignmentsManage
        ]
      ],
      [
        SYSTEM_ROLES.reviewer,
        "Reviewer",
        [
          PERMISSIONS.coursesRead,
          PERMISSIONS.coursesPublish,
          PERMISSIONS.filesRead,
          PERMISSIONS.quizGrade,
          PERMISSIONS.assignmentsGrade
        ]
      ],
      [SYSTEM_ROLES.mentor, "Mentor", [PERMISSIONS.coursesRead]],
      [SYSTEM_ROLES.learner, "Learner", [PERMISSIONS.coursesRead]],
      [
        SYSTEM_ROLES.supportAdmin,
        "Support Admin",
        [PERMISSIONS.usersRead, PERMISSIONS.auditRead, PERMISSIONS.filesRead]
      ],
      [SYSTEM_ROLES.financeAdmin, "Finance Admin", [PERMISSIONS.auditRead]]
    ] as const;

    const roleRecords = await Promise.all(
      roles.map(async ([key, name, permissionKeys], sortOrder) => {
        const role = await this.prisma.role.upsert({
          where: {
            organizationId_key: {
              organizationId,
              key
            }
          },
          update: {
            name,
            isSystem: true,
            archetype: key,
            sortOrder,
            assignableContextTypes:
              key === SYSTEM_ROLES.learner
                ? ["ORGANIZATION", "COURSE_CATEGORY", "COURSE"]
                : [
                    "ORGANIZATION",
                    "COURSE_CATEGORY",
                    "COURSE",
                    "MODULE",
                    "ACTIVITY",
                  ],
            isActive: true,
            deletedAt: null,
          },
          create: {
            organizationId,
            key,
            name,
            isSystem: true,
            archetype: key,
            sortOrder,
            assignableContextTypes:
              key === SYSTEM_ROLES.learner
                ? ["ORGANIZATION", "COURSE_CATEGORY", "COURSE"]
                : [
                    "ORGANIZATION",
                    "COURSE_CATEGORY",
                    "COURSE",
                    "MODULE",
                    "ACTIVITY",
                  ],
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
        return role;
      })
    );

    const orgAdminRole = roleRecords.find(
      (role) => role.key === SYSTEM_ROLES.orgAdmin,
    );
    if (orgAdminRole) {
      await Promise.all(
        roleRecords.map((targetRole) =>
          this.prisma.roleDelegation.upsert({
            where: {
              organizationId_actorRoleId_targetRoleId: {
                organizationId,
                actorRoleId: orgAdminRole.id,
                targetRoleId: targetRole.id,
              },
            },
            update: {
              canView: true,
              canAssign: true,
              canOverride: true,
              canSwitch: true,
            },
            create: {
              organizationId,
              actorRoleId: orgAdminRole.id,
              targetRoleId: targetRole.id,
              canView: true,
              canAssign: true,
              canOverride: true,
              canSwitch: true,
            },
          }),
        ),
      );
    }
  }

  async getOrganizationContext(
    userId: string,
    organizationId: string,
    sessionId?: string,
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
          where: { role: { isActive: true } },
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

    let isPlatformAdmin =
      roleKeys.has(SYSTEM_ROLES.superAdmin) ||
      permissionKeys.has(PERMISSIONS.platformAdmin);
    const activeOrganizationRoleSwitch =
      this.contextualRbac && sessionId && isPlatformAdmin
        ? await this.prisma.roleSwitch.findFirst({
            where: {
              organizationId,
              userId,
              sessionId,
              context: {
                type: "ORGANIZATION",
                instanceId: organizationId,
              },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              role: { isActive: true },
            },
            select: { id: true },
          })
        : null;
    if (
      this.contextualRbac &&
      sessionId &&
      (!isPlatformAdmin || activeOrganizationRoleSwitch)
    ) {
      const snapshot = await this.contextualRbac.getOrganizationSnapshot({
        organizationId,
        userId,
        sessionId,
      });
      roleKeys.clear();
      permissionKeys.clear();
      snapshot.roleKeys.forEach((key) => roleKeys.add(key));
      snapshot.permissionKeys.forEach((key) => permissionKeys.add(key));
      isPlatformAdmin = snapshot.isPlatformAdmin;
    }

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
    // Empty list is not "allow all" — callers (PermissionsGuard) must deny.
    if (requiredPermissions.length === 0) {
      return false;
    }
    if (context.isPlatformAdmin) {
      return true;
    }

    return requiredPermissions.every((permission) =>
      context.permissionKeys.includes(permission)
    );
  }

  async hasPermissionsAtContext(input: {
    organization: OrganizationContext;
    userId: string;
    sessionId?: string;
    requiredPermissions: readonly string[];
    context?: AccessContextReference;
  }) {
    if (!this.contextualRbac) {
      return this.hasPermissions(
        input.organization,
        input.requiredPermissions,
      );
    }
    return this.contextualRbac.hasAllPermissions({
      organizationId: input.organization.id,
      userId: input.userId,
      sessionId: input.sessionId,
      permissionKeys: input.requiredPermissions,
      context: input.context,
    });
  }
}
