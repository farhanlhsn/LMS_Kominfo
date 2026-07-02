import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface SearchResults {
  courses: { id: string; title: string; slug: string; type: 'course' }[];
  lessons: { id: string; title: string; courseTitle: string; courseSlug: string; type: 'lesson' }[];
}

/**
 * Search service.
 *
 * Implementasi sederhana dengan ILIKE di Postgres. Untuk skala besar
 * sebaiknya pakai native full-text search (to_tsvector) + pg_trgm
 * dengan index. Untuk MVP cukup ILIKE — index akan ditambahkan di
 * Fase 4 saat ukuran data bertambah.
 *
 * Scope:
 *  - Student melihat course PUBLISHED di region mereka (atau semua jika super admin)
 *  - Search lesson dibatasi ke course yang visible ke user
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, opts: { regionId?: string; limit?: number; onlyPublished?: boolean } = {}): Promise<SearchResults> {
    const q = query.trim();
    if (q.length < 2) return { courses: [], lessons: [] };

    const limit = Math.min(opts.limit || 8, 20);

    // Courses
    const courses = await this.prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(opts.onlyPublished !== false ? { status: 'PUBLISHED' } : {}),
        ...(opts.regionId ? { regionId: opts.regionId } : {}),
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, slug: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Lessons — cari di title, content.markdown, dan transcript
    // Prisma belum support pencarian di field JSON dengan mode insensitive.
    // Untuk MVP, cukup cari di title.
    const lessons = await this.prisma.lesson.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        title: { contains: q, mode: 'insensitive' },
        module: {
          course: {
            deletedAt: null,
            ...(opts.onlyPublished !== false ? { status: 'PUBLISHED' } : {}),
            ...(opts.regionId ? { regionId: opts.regionId } : {}),
          },
        },
      },
      select: {
        id: true,
        title: true,
        module: {
          select: {
            course: { select: { title: true, slug: true } },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      courses: courses.map((c) => ({ id: c.id, title: c.title, slug: c.slug, type: 'course' as const })),
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        courseTitle: l.module.course.title,
        courseSlug: l.module.course.slug,
        type: 'lesson' as const,
      })),
    };
  }
}
