import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";

@Injectable()
export class FileAccessPolicyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureInstructorCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    if (
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("courses:update")
    ) {
      return;
    }

    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, userId, courseId },
    });

    if (!instructor) {
      throw new ForbiddenException("Insufficient course permissions");
    }
  }

  async ensureCanManageFile(
    organization: OrganizationContext,
    userId: string,
    fileId: string,
  ) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId: organization.id, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (
      file.ownerId !== userId &&
      !organization.isPlatformAdmin &&
      !organization.permissionKeys.includes("files:delete") &&
      !organization.permissionKeys.includes("files:create") &&
      !organization.permissionKeys.includes("content-library:manage")
    ) {
      throw new ForbiddenException("Insufficient file permissions");
    }

    return file;
  }

  async ensureCanReadFile(
    organization: OrganizationContext,
    userId: string,
    fileId: string,
    courseId?: string,
  ) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId: organization.id, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (
      file.visibility === "PUBLIC" ||
      file.accessLevel === "PUBLIC" ||
      file.ownerId === userId ||
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("files:read") ||
      organization.permissionKeys.includes("content-library:manage")
    ) {
      return file;
    }

    if (file.accessLevel === "ORGANIZATION_MEMBERS") {
      return file;
    }

    if (courseId && file.accessLevel === "ENROLLED_LEARNERS") {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          organizationId_courseId_userId: {
            organizationId: organization.id,
            courseId,
            userId,
          },
        },
      });
      if (
        enrollment?.status === "ACTIVE" ||
        enrollment?.status === "COMPLETED"
      ) {
        return file;
      }
    }

    throw new ForbiddenException("File access denied");
  }
}
