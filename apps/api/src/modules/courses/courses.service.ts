import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';

const CACHE_KEY_COURSE = (id: string) => `course:${id}`;
const CACHE_KEY_SLUG = (slug: string) => `course:slug:${slug}`;
const CACHE_TTL = 120; // 2 menit (course detail di-cache singkat)

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(query: {
    page: number; limit: number; search?: string; category?: string;
    difficulty?: string; regionId?: string; status?: string;
    sortBy: string; sortOrder: 'asc' | 'desc';
  }, currentUser: { userId: string; role: string; regionId: string }) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.search) {
      where['OR'] = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where['category'] = query.category;
    if (query.difficulty) where['difficulty'] = query.difficulty;
    if (query.status) where['status'] = query.status;

    // Regional admin: only see their region's courses
    if (currentUser.role === 'REGIONAL_ADMIN') {
      where['regionId'] = currentUser.regionId;
    } else if (currentUser.role === 'INSTRUCTOR') {
      where['instructorId'] = currentUser.userId;
    } else if (query.regionId) {
      where['regionId'] = query.regionId;
    }

    // Students and public: only published
    if (currentUser.role === 'STUDENT' && !query.status) {
      where['status'] = 'PUBLISHED';
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: where as any,
        select: {
          id: true, title: true, slug: true, shortDescription: true, thumbnailUrl: true,
          difficulty: true, category: true, tags: true, estimatedDuration: true,
          totalModules: true, totalLessons: true, totalStudents: true, rating: true,
          status: true, publishedAt: true, createdAt: true, updatedAt: true,
          instructor: { select: { id: true, name: true, email: true, avatarUrl: true } },
          region: { select: { id: true, name: true, slug: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.course.count({ where: where as any }),
    ]);

    return {
      data: courses,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findById(id: string) {
    return this.cache.wrap(CACHE_KEY_COURSE(id), CACHE_TTL, async () => {
      const course = await this.prisma.course.findUnique({
        where: { id },
        include: {
          instructor: { select: { id: true, name: true, email: true, avatarUrl: true, bio: true } },
          region: { select: { id: true, name: true, slug: true, themeColor: true } },
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true, title: true, description: true, order: true, estimatedDuration: true, isPublished: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, order: true, type: true, duration: true, isPreview: true, isPublished: true },
              },
            },
          },
        },
      });
      if (!course || course.deletedAt) throw new NotFoundException('Course not found');
      return course;
    });
  }

  async findBySlug(slug: string) {
    return this.cache.wrap(CACHE_KEY_SLUG(slug), CACHE_TTL, async () => {
      return this.prisma.course.findUnique({
        where: { slug },
        include: {
          instructor: { select: { id: true, name: true, email: true, avatarUrl: true, bio: true } },
          region: { select: { id: true, name: true, slug: true, themeColor: true } },
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              estimatedDuration: true,
              isPublished: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  title: true,
                  order: true,
                  type: true,
                  duration: true,
                  isPreview: true,
                  isPublished: true,
                },
              },
            },
          },
          _count: { select: { modules: true, enrollments: true } },
        },
      });
    });
  }

  async create(dto: {
    title: string; slug: string; shortDescription: string; description: string;
    thumbnailUrl?: string; regionId: string; difficulty?: string;
    estimatedDuration?: number; language?: string; category: string; tags?: string[];
  }, instructorId: string) {
    const existing = await this.prisma.course.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Course slug already exists');

    const course = await this.prisma.course.create({
      data: {
        title: dto.title, slug: dto.slug, shortDescription: dto.shortDescription,
        description: dto.description, thumbnailUrl: dto.thumbnailUrl,
        instructorId, regionId: dto.regionId,
        difficulty: (dto.difficulty as any) || 'beginner',
        estimatedDuration: dto.estimatedDuration || 0,
        language: dto.language || 'id', category: dto.category,
        tags: dto.tags || [],
      },
      include: { region: { select: { id: true, name: true } } },
    });

    this.logger.log(`Course created: ${course.title}`);
    await this.cache.invalidatePrefix('course:');
    return course;
  }

  async update(id: string, dto: Record<string, unknown>, currentUser: { userId: string; role: string }) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course || course.deletedAt) throw new NotFoundException('Course not found');

    if (currentUser.role === 'INSTRUCTOR' && course.instructorId !== currentUser.userId) {
      throw new ForbiddenException('Cannot edit courses you do not own');
    }

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) data[key] = value;
    }

    const updated = await this.prisma.course.update({ where: { id }, data: data as any });
    this.logger.log(`Course updated: ${updated.title}`);
    await this.cache.invalidatePrefix('course:');
    return updated;
  }

  async publish(id: string, currentUser: { userId: string; role: string; regionId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (currentUser.role === 'REGIONAL_ADMIN' && course.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot publish courses from other regions');
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    this.logger.log(`Course published: ${updated.title}`);
    await this.cache.invalidatePrefix('course:');
    return updated;
  }

  async archive(id: string, currentUser: { userId: string; role: string; regionId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (currentUser.role === 'REGIONAL_ADMIN' && course.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot archive courses from other regions');
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    this.logger.log(`Course archived: ${updated.title}`);
    await this.cache.invalidatePrefix('course:');
    return updated;
  }

  async remove(id: string, currentUser: { userId: string; role: string; regionId: string }) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (currentUser.role === 'REGIONAL_ADMIN' && course.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot delete courses from other regions');
    }

    await this.prisma.course.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });

    this.logger.log(`Course deleted: ${course.title}`);
    await this.cache.invalidatePrefix('course:');
    return { success: true, message: 'Course deleted (archived)' };
  }

  async enroll(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundException('Course not available');

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) throw new ConflictException('Already enrolled');

    await this.prisma.enrollment.create({ data: { userId, courseId } });

    await this.prisma.course.update({
      where: { id: courseId },
      data: { totalStudents: { increment: 1 } },
    });

    return { success: true, message: 'Enrolled successfully' };
  }
}
