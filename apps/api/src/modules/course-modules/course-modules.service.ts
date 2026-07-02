import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CourseModulesService {
  private readonly logger = new Logger(CourseModulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByCourse(courseId: string) {
    await this.verifyCourse(courseId);
    return this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { lessons: true } },
      },
    });
  }

  async findById(id: string) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, order: true, type: true,
            duration: true, isPreview: true, isPublished: true,
          },
        },
      },
    });
    if (!mod) throw new NotFoundException('Module not found');
    return mod;
  }

  async create(courseId: string, dto: { title: string; description?: string; order?: number; estimatedDuration?: number }) {
    await this.verifyCourse(courseId);

    const maxOrder = await this.prisma.module.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    const nextOrder = dto.order ?? ((maxOrder._max.order ?? -1) + 1);

    const mod = await this.prisma.module.create({
      data: {
        courseId, title: dto.title, description: dto.description,
        order: nextOrder, estimatedDuration: dto.estimatedDuration || 0,
      },
    });

    // Update course totals
    await this.recalcCourseTotals(courseId);

    this.logger.log(`Module created: ${mod.title}`);
    return mod;
  }

  async update(id: string, dto: { title?: string; description?: string; order?: number; estimatedDuration?: number; isPublished?: boolean }) {
    const mod = await this.prisma.module.findUnique({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data['title'] = dto.title;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.order !== undefined) data['order'] = dto.order;
    if (dto.estimatedDuration !== undefined) data['estimatedDuration'] = dto.estimatedDuration;
    if (dto.isPublished !== undefined) data['isPublished'] = dto.isPublished;

    const updated = await this.prisma.module.update({ where: { id }, data: data as any });

    await this.recalcCourseTotals(mod.courseId);

    return updated;
  }

  async remove(id: string) {
    const mod = await this.prisma.module.findUnique({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');

    await this.prisma.module.delete({ where: { id } });
    await this.recalcCourseTotals(mod.courseId);

    this.logger.log(`Module deleted: ${mod.title}`);
    return { success: true, message: 'Module deleted' };
  }

  private async verifyCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async recalcCourseTotals(courseId: string) {
    const [totalModules, totalLessons] = await Promise.all([
      this.prisma.module.count({ where: { courseId } }),
      this.prisma.lesson.count({ where: { module: { courseId } } }),
    ]);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { totalModules, totalLessons },
    });
  }
}
