import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';

const CACHE_KEY_LEADERBOARD = (regionId: string, limit: number) => `leaderboard:${regionId}:${limit}`;
const CACHE_KEY_COURSE_LEADERBOARD = (courseId: string, limit: number) => `leaderboard:course:${courseId}:${limit}`;
const CACHE_TTL = 60; // 1 menit — leaderboard sering diakses tapi boleh agak stale

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Memberikan XP ke user pada leaderboard entry.
   *
   * Catatan: Leaderboard punya composite unique (userId, regionId, courseId) dengan
   * courseId nullable. Prisma native `upsert` tidak bisa dipakai langsung ketika
   * salah satu field unique bersifat nullable (NULL != NULL di unique constraint),
   * sehingga kita pakai pola "find → conditional create/update" dalam transaksi.
   */
  async awardXp(userId: string, courseId: string | null, xpAmount: number, regionId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { regionId: true } });
    const effectiveRegionId = regionId || user?.regionId;

    if (!effectiveRegionId) {
      this.logger.warn(`Cannot award XP: user ${userId} has no regionId`);
      return;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1) Cari existing entry berdasarkan (userId, regionId, courseId) — handle NULL courseId.
      const existing = await tx.leaderboard.findFirst({
        where: {
          userId,
          regionId: effectiveRegionId,
          courseId: courseId ?? null,
        },
      });

      if (existing) {
        return tx.leaderboard.update({
          where: { id: existing.id },
          data: {
            totalXP: { increment: xpAmount },
            totalScore: { increment: xpAmount },
          },
        });
      }

      // 2) Coba create; jika race condition menyebabkan duplicate, fetch & update.
      try {
        return await tx.leaderboard.create({
          data: {
            userId,
            regionId: effectiveRegionId,
            courseId: courseId ?? null,
            totalXP: xpAmount,
            totalScore: xpAmount,
          },
        });
      } catch (err) {
        // P2002 = unique constraint violation. Race-condition retry via fetch+update.
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') {
          const raced = await tx.leaderboard.findFirstOrThrow({
            where: { userId, regionId: effectiveRegionId, courseId: courseId ?? null },
          });
          return tx.leaderboard.update({
            where: { id: raced.id },
            data: {
              totalXP: { increment: xpAmount },
              totalScore: { increment: xpAmount },
            },
          });
        }
        throw err;
      }
    }).then(async (entry) => {
      this.logger.log(`Awarded ${xpAmount} XP to user ${userId} for course ${courseId ?? 'Global'}`);
      // Invalidate cache agar leaderboard fresh
      if (courseId) {
        await this.cache.invalidatePrefix(`leaderboard:course:${courseId}:`);
      } else {
        await this.cache.invalidatePrefix(`leaderboard:${effectiveRegionId}:`);
      }
      return entry;
    });
  }

  async getLeaderboard(regionId: string, limit: number = 10) {
    return this.cache.wrap(CACHE_KEY_LEADERBOARD(regionId, limit), CACHE_TTL, async () => {
      // Global regional leaderboard (courseId is null)
      return this.prisma.leaderboard.findMany({
        where: {
          regionId,
          courseId: null,
        },
        orderBy: {
          totalXP: 'desc',
        },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
    });
  }

  async getCourseLeaderboard(courseId: string, limit: number = 10) {
    return this.cache.wrap(CACHE_KEY_COURSE_LEADERBOARD(courseId, limit), CACHE_TTL, async () => {
      return this.prisma.leaderboard.findMany({
        where: {
          courseId,
        },
        orderBy: {
          totalXP: 'desc',
        },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
    });
  }

  async awardBadge(userId: string, badgeId: string) {
    const existing = await this.prisma.userBadge.findUnique({
      where: { badgeId_userId: { badgeId, userId } },
    });

    if (existing) return existing;

    const userBadge = await this.prisma.userBadge.create({
      data: { badgeId, userId },
      include: { badge: true },
    });

    // Also award XP from the badge
    if (userBadge.badge.xpReward > 0) {
      await this.awardXp(userId, null, userBadge.badge.xpReward);
    }

    this.logger.log(`Awarded badge ${badgeId} to user ${userId}`);
    return userBadge;
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }
}
