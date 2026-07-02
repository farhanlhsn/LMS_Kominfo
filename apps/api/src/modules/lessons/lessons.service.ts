import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByModule(moduleId: string) {
    await this.verifyModule(moduleId);
    return this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      include: { content: true },
    });
  }

  async findById(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { content: true, module: { select: { id: true, courseId: true, title: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async create(moduleId: string, dto: {
    title: string; order?: number; type?: string; duration?: number;
    isPreview?: boolean; markdown?: string; videoUrl?: string;
    youtubeUrl?: string; pdfUrl?: string; externalUrl?: string;
  }) {
    await this.verifyModule(moduleId);

    const maxOrder = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    const nextOrder = dto.order ?? ((maxOrder._max.order ?? -1) + 1);

    const lessonType = dto.type || 'TEXT';

    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId, title: dto.title, order: nextOrder,
        type: lessonType as any, duration: dto.duration || 0,
        isPreview: dto.isPreview || false,
        content: {
          create: {
            markdown: dto.markdown, videoUrl: dto.videoUrl,
            youtubeUrl: dto.youtubeUrl, pdfUrl: dto.pdfUrl,
            externalUrl: dto.externalUrl,
          },
        },
      },
      include: { content: true },
    });

    await this.recalcModuleDuration(moduleId);
    this.logger.log(`Lesson created: ${lesson.title} (${lesson.type})`);
    return lesson;
  }

  async update(id: string, dto: {
    title?: string; order?: number; duration?: number; isPreview?: boolean;
    isPublished?: boolean; markdown?: string; videoUrl?: string;
    youtubeUrl?: string; pdfUrl?: string; externalUrl?: string;
  }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Update lesson metadata
    const lessonData: Record<string, unknown> = {};
    if (dto.title !== undefined) lessonData['title'] = dto.title;
    if (dto.order !== undefined) lessonData['order'] = dto.order;
    if (dto.duration !== undefined) lessonData['duration'] = dto.duration;
    if (dto.isPreview !== undefined) lessonData['isPreview'] = dto.isPreview;
    if (dto.isPublished !== undefined) lessonData['isPublished'] = dto.isPublished;

    const updated = await this.prisma.lesson.update({
      where: { id },
      data: lessonData as any,
      include: { content: true },
    });

    // Update content if any content fields are provided
    const contentFields = ['markdown', 'videoUrl', 'youtubeUrl', 'pdfUrl', 'externalUrl'];
    const hasContent = contentFields.some(f => dto[f as keyof typeof dto] !== undefined);

    if (hasContent) {
      const contentData: Record<string, unknown> = {};
      for (const field of contentFields) {
        const val = dto[field as keyof typeof dto];
        if (val !== undefined) contentData[field] = val;
      }
      await this.prisma.lessonContent.upsert({
        where: { lessonId: id },
        create: { lessonId: id, ...contentData },
        update: contentData,
      });
    }

    await this.recalcModuleDuration(lesson.moduleId);
    return this.findById(id);
  }

  async remove(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lesson.delete({ where: { id } }); // Cascade deletes content
    await this.recalcModuleDuration(lesson.moduleId);

    this.logger.log(`Lesson deleted: ${lesson.title}`);
    return { success: true, message: 'Lesson deleted' };
  }

  async complete(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Find enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: { modules: { some: { lessons: { some: { id: lessonId } } } } },
        status: { not: 'DROPPED' },
      },
    });
    if (!enrollment) throw new NotFoundException('Not enrolled in this course');

    await this.prisma.progress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });

    return { success: true, message: 'Lesson completed' };
  }

  /**
   * Memperbarui posisi video (untuk resume playback).
   * Hanya menyimpan posisi — completion dicek terpisah saat user menandai selesai.
   */
  async trackVideo(lessonId: string, userId: string, positionSec: number, durationSec: number) {
    if (positionSec < 0 || durationSec < 0) {
      throw new BadRequestException('Position/duration tidak valid');
    }

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: { modules: { some: { lessons: { some: { id: lessonId } } } } },
        status: { not: 'DROPPED' },
      },
    });
    if (!enrollment) throw new NotFoundException('Not enrolled in this course');

    const watchedRatio = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;
    const completed = watchedRatio >= 0.9; // mark complete when 90% watched

    const progress = await this.prisma.progress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        videoPosition: positionSec,
        videoDuration: durationSec,
        watchedRatio,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        videoPosition: positionSec,
        videoDuration: durationSec,
        watchedRatio,
        ...(completed && { completed: true, completedAt: new Date() }),
      },
    });

    return { success: true, data: progress };
  }

  private async verifyModule(moduleId: string) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
  }

  private async recalcModuleDuration(moduleId: string) {
    const result = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _sum: { duration: true },
    });
    await this.prisma.module.update({
      where: { id: moduleId },
      data: { estimatedDuration: result._sum.duration || 0 },
    });
  }
}
