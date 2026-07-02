import { Test, TestingModule } from '@nestjs/testing';
import { RegionsService } from './regions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrismaService = {
  region: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  course: {
    count: jest.fn(),
  },
};

const mockCacheService = {
  isAvailable: jest.fn().mockReturnValue(false),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePrefix: jest.fn().mockResolvedValue(0),
  wrap: jest.fn(async (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader()),
  ping: jest.fn().mockResolvedValue(false),
};

describe('RegionsService', () => {
  let service: RegionsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RegionsService>(RegionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of regions', async () => {
      prisma.region.findMany.mockResolvedValue([{ id: 'r1', name: 'Aceh' }]);
      const res = await service.findAll();
      expect(res.length).toBe(1);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if slug exists', async () => {
      prisma.region.findUnique.mockResolvedValue({ id: 'r1', slug: 'aceh' });
      await expect(service.create({ name: 'Aceh', slug: 'aceh' })).rejects.toThrow(ConflictException);
    });

    it('should create region successfully', async () => {
      prisma.region.findUnique.mockResolvedValue(null);
      prisma.region.create.mockResolvedValue({ id: 'r-new', name: 'Aceh', slug: 'aceh' });

      const res = await service.create({ name: 'Aceh', slug: 'aceh' });
      expect(res.id).toBe('r-new');
      expect(prisma.region.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if region missing', async () => {
      prisma.region.findUnique.mockResolvedValue(null);
      await expect(service.remove('r1')).rejects.toThrow(NotFoundException);
    });

    it('should deactivate region successfully', async () => {
      prisma.region.findUnique.mockResolvedValue({ id: 'r1', name: 'Aceh' });
      prisma.user.count.mockResolvedValue(0);
      prisma.course.count.mockResolvedValue(0);
      prisma.region.update.mockResolvedValue({ id: 'r1', isActive: false });

      const res = await service.remove('r1');
      expect(res.success).toBe(true);
      expect(prisma.region.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: { isActive: false },
        }),
      );
    });
  });
});
