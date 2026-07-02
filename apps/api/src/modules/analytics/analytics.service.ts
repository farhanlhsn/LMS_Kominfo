import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStudentStats(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        progress: true,
        course: true,
      },
    });

    const activeCourses = enrollments.filter(e => e.status === 'ACTIVE').length;
    const completedCourses = enrollments.filter(e => e.status === 'COMPLETED').length;

    // Calculate learning hours: sum of duration of completed lessons in minutes -> hours
    let totalLearningMinutes = 0;
    enrollments.forEach(e => {
      e.progress.forEach(p => {
        if (p.completed) {
          // Assume average lesson duration is 15 mins if not tracked, or fetch from lesson
          totalLearningMinutes += 15; 
        }
      });
    });

    const learningHours = Math.round((totalLearningMinutes / 60) * 10) / 10;

    const leaderboard = await this.prisma.leaderboard.findFirst({
      where: { userId, courseId: null },
    });

    const aiChatUsage = await this.prisma.chatMessage.count({
      where: { session: { userId } },
    });

    return {
      activeCourses,
      completedCourses,
      learningHours,
      xp: leaderboard?.totalXP || 0,
      aiChatUsage,
    };
  }

  async getAdminStats(regionId?: string) {
    const whereRegion = regionId ? { regionId } : {};

    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalCompletions,
    ] = await Promise.all([
      this.prisma.user.count({ where: whereRegion }),
      this.prisma.course.count({ where: regionId ? { regionId } : {} }),
      this.prisma.enrollment.count({ where: regionId ? { user: { regionId } } : {} }),
      this.prisma.enrollment.count({ where: { status: 'COMPLETED', ...(regionId ? { user: { regionId } } : {}) } }),
    ]);

    const completionRate = totalEnrollments > 0 
      ? Math.round((totalCompletions / totalEnrollments) * 100) 
      : 0;

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      completionRate,
    };
  }
}
