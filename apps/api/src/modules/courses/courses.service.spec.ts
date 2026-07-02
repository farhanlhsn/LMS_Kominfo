import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  course: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  enrollment: {
    findUnique: jest.fn(),
    create: jest.fn(),
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

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enroll', () => {
    it('should throw NotFoundException if course not found or not published', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.enroll('c1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already enrolled', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', status: 'PUBLISHED' });
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'e1' });

      await expect(service.enroll('c1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should enroll user successfully', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', status: 'PUBLISHED' });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({ id: 'e-new' });
      prisma.course.update.mockResolvedValue({ id: 'c1' });

      const res = await service.enroll('c1', 'u1');
      expect(res.success).toBe(true);
      expect(prisma.enrollment.create).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should throw NotFoundException if course missing', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(
        service.publish('c1', { userId: 'u1', role: 'REGIONAL_ADMIN', regionId: 'reg-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if regional admin tries to publish course from another region', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', regionId: 'other-region' });
      await expect(
        service.publish('c1', { userId: 'u1', role: 'REGIONAL_ADMIN', regionId: 'reg-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should publish course successfully', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', regionId: 'reg-1' });
      prisma.course.update.mockResolvedValue({ id: 'c1', status: 'PUBLISHED' });

      const res = await service.publish('c1', { userId: 'u1', role: 'REGIONAL_ADMIN', regionId: 'reg-1' });
      expect(res.status).toBe('PUBLISHED');
    });
  });
});
