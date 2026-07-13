import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";

const ALLOWED = new Set(["ACTIVE", "COMPLETED"]);

/** Shared enrollment gate used by learn / quiz / assignment / goals paths. */
export async function ensureEnrollment(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  courseId: string,
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      organizationId_courseId_userId: {
        organizationId,
        courseId,
        userId,
      },
    },
  });

  if (!enrollment || !ALLOWED.has(enrollment.status)) {
    throw new ForbiddenException("Course enrollment is required");
  }
  return enrollment;
}
