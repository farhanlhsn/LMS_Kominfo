import type { PrismaService } from "../../prisma/prisma.service";

export type CourseProgressSnapshot = {
  progressPercent: number;
  completedRequired: number;
  requiredTotal: number;
};

/** Shared required-activity progress math (learn / quiz / assignment). */
export async function calculateCourseProgress(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  courseId: string,
): Promise<CourseProgressSnapshot> {
  const requiredActivities = await prisma.activity.findMany({
    where: {
      organizationId,
      courseId,
      isRequired: true,
      isPublished: true,
    },
    select: { id: true },
  });

  if (requiredActivities.length === 0) {
    return { progressPercent: 0, completedRequired: 0, requiredTotal: 0 };
  }

  const completedRequired = await prisma.activityProgress.count({
    where: {
      organizationId,
      userId,
      activityId: { in: requiredActivities.map((activity) => activity.id) },
      status: "COMPLETED",
    },
  });

  return {
    progressPercent: Math.round(
      (completedRequired / requiredActivities.length) * 100,
    ),
    completedRequired,
    requiredTotal: requiredActivities.length,
  };
}

/** Persist enrollment % from required activities. */
export async function recalculateEnrollment(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  courseId: string,
): Promise<CourseProgressSnapshot> {
  const progress = await calculateCourseProgress(
    prisma,
    organizationId,
    userId,
    courseId,
  );
  const completed =
    progress.progressPercent === 100 && progress.requiredTotal > 0;

  await prisma.enrollment.update({
    where: {
      organizationId_courseId_userId: {
        organizationId,
        courseId,
        userId,
      },
    },
    data: {
      status: completed ? "COMPLETED" : "ACTIVE",
      progressPercent: progress.progressPercent,
      completedAt: completed ? new Date() : null,
    },
  });

  return progress;
}
