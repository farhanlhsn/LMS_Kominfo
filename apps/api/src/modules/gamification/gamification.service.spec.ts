import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  leaderboard: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userBadge: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock $transaction: jika dipanggil dengan callback, panggil callback dengan mock prisma sebagai tx
mockPrismaService.$transaction.mockImplementation((fn: any) => fn(mockPrismaService));

const mockCacheService = {
  isAvailable: jest.fn().mockReturnValue(false),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePrefix: jest.fn().mockResolvedValue(0),
  wrap: jest.fn(async (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader()),
  ping: jest.fn().mockResolvedValue(false),
};

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardXp', () => {
    it('should create a new leaderboard entry if none exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ regionId: 'region-1' });
      prisma.leaderboard.findUnique.mockResolvedValue(null);
      prisma.leaderboard.findFirst.mockResolvedValue(null);
      prisma.leaderboard.create.mockResolvedValue({ id: 'lb-1', totalXP: 100 });

      await service.awardXp('user-1', null, 100);

      expect(prisma.leaderboard.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          regionId: 'region-1',
          totalXP: 100,
        }),
      });
    });

    it('should update an existing leaderboard entry', async () => {
      prisma.user.findUnique.mockResolvedValue({ regionId: 'region-1' });
      prisma.leaderboard.findUnique.mockResolvedValue(null); // Simulated Prisma quirk bypass
      prisma.leaderboard.findFirst.mockResolvedValue({ id: 'lb-1', totalXP: 50 });
      prisma.leaderboard.update.mockResolvedValue({ id: 'lb-1', totalXP: 150 });

      await service.awardXp('user-1', 'course-1', 100);

      expect(prisma.leaderboard.update).toHaveBeenCalledWith({
        where: { id: 'lb-1' },
        data: expect.objectContaining({
          totalXP: { increment: 100 },
        }),
      });
    });
  });

  describe('awardBadge', () => {
    it('should do nothing if badge already awarded', async () => {
      prisma.userBadge.findUnique.mockResolvedValue({ id: 'ub-1' });
      
      const result = await service.awardBadge('user-1', 'badge-1');
      
      expect(result).toEqual({ id: 'ub-1' });
      expect(prisma.userBadge.create).not.toHaveBeenCalled();
    });

    it('should create user badge and award XP', async () => {
      prisma.userBadge.findUnique.mockResolvedValue(null);
      prisma.userBadge.create.mockResolvedValue({
        id: 'ub-1',
        badge: { xpReward: 50 },
      });
      
      // Spy on awardXp
      const awardXpSpy = jest.spyOn(service, 'awardXp').mockResolvedValue(null as any);

      await service.awardBadge('user-1', 'badge-1');

      expect(prisma.userBadge.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', badgeId: 'badge-1' },
        include: { badge: true },
      });
      expect(awardXpSpy).toHaveBeenCalledWith('user-1', null, 50);
    });
  });
});
