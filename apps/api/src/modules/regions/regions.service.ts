import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';

const CACHE_KEY_ALL = 'regions:all';
const CACHE_KEY_BY_ID = (id: string) => `regions:${id}`;
const CACHE_TTL = 300; // 5 menit

@Injectable()
export class RegionsService {
  private readonly logger = new Logger(RegionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.wrap(CACHE_KEY_ALL, CACHE_TTL, async () => {
      return this.prisma.region.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { users: true, courses: true } },
        },
      });
    });
  }

  async findById(id: string) {
    return this.cache.wrap(CACHE_KEY_BY_ID(id), CACHE_TTL, async () => {
      const region = await this.prisma.region.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true, courses: true } },
        },
      });

      if (!region) throw new NotFoundException('Region not found');
      return region;
    });
  }

  async create(dto: { name: string; slug: string; themeColor?: string; logoUrl?: string; bannerUrl?: string; description?: string }) {
    const existing = await this.prisma.region.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Region slug already exists');

    const region = await this.prisma.region.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        themeColor: dto.themeColor || '#0047BA',
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        description: dto.description,
      },
    });

    this.logger.log(`Region created: ${region.name} (${region.slug})`);
    await this.cache.invalidatePrefix('regions:');
    return region;
  }

  async update(id: string, dto: { name?: string; themeColor?: string; logoUrl?: string; bannerUrl?: string; description?: string; isActive?: boolean }) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');

    const updated = await this.prisma.region.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.themeColor !== undefined && { themeColor: dto.themeColor }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Region updated: ${updated.name}`);
    await this.cache.invalidatePrefix('regions:');
    return updated;
  }

  async remove(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');

    // Check if region has active users or courses before deactivating
    const [userCount, courseCount] = await Promise.all([
      this.prisma.user.count({ where: { regionId: id, isActive: true } }),
      this.prisma.course.count({ where: { regionId: id, status: { not: 'ARCHIVED' } } }),
    ]);

    await this.prisma.region.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Region deactivated: ${region.name} (${userCount} users, ${courseCount} courses affected)`);
    await this.cache.invalidatePrefix('regions:');
    return { success: true, message: 'Region deactivated' };
  }
}
