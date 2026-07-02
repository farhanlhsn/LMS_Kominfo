import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCourseProgress(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        progress: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this course');
    }

    return {
      enrollmentId: enrollment.id,
      progressPercent: enrollment.progressPercent,
      completedLessons: enrollment.progress.filter(p => p.completed).map(p => p.lessonId),
      progress: enrollment.progress,
    };
  }

  async updateProgress(courseId: string, userId: string, dto: UpdateProgressDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { include: { modules: { include: { lessons: true } } } } },
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this course');
    }

    // Verify lesson belongs to this course
    const isLessonInCourse = enrollment.course.modules.some(m => 
      m.lessons.some(l => l.id === dto.lessonId)
    );

    if (!isLessonInCourse) {
      throw new BadRequestException('Lesson does not belong to this course');
    }

    const existingProgress = await this.prisma.progress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: dto.lessonId } },
    });

    let progress;
    const isNowCompleted = dto.completed && (!existingProgress || !existingProgress.completed);

    if (existingProgress) {
      progress = await this.prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          completed: dto.completed !== undefined ? dto.completed : existingProgress.completed,
          videoPosition: dto.videoPosition !== undefined ? dto.videoPosition : existingProgress.videoPosition,
          completedAt: isNowCompleted ? new Date() : existingProgress.completedAt,
        },
      });
    } else {
      progress = await this.prisma.progress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: dto.lessonId,
          completed: dto.completed || false,
          videoPosition: dto.videoPosition || 0,
          completedAt: dto.completed ? new Date() : null,
        },
      });
    }

    if (isNowCompleted) {
      await this.recalculateCourseProgress(enrollment.id, enrollment.course.totalLessons);
    }

    return progress;
  }

  private async recalculateCourseProgress(enrollmentId: string, totalLessons: number) {
    if (totalLessons === 0) return;

    const completedCount = await this.prisma.progress.count({
      where: { enrollmentId, completed: true },
    });

    const percent = Math.round((completedCount / totalLessons) * 100);

    const isFinished = percent >= 100;

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent: percent,
        status: isFinished ? 'COMPLETED' : 'ACTIVE',
        completedAt: isFinished ? new Date() : null,
      },
    });

    this.logger.log(`Updated enrollment ${enrollmentId} progress to ${percent}%`);
  }
}
