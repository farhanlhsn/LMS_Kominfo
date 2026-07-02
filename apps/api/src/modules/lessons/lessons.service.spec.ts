import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  lesson: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  enrollment: {
    findFirst: jest.fn(),
  },
  progress: {
    upsert: jest.fn(),
  },
  module: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('LessonsService', () => {
  let service: LessonsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('complete', () => {
    it('should throw NotFoundException if lesson missing', async () => {
      prisma.lesson.findUnique.mockResolvedValue(null);
      await expect(service.complete('l1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not enrolled in course', async () => {
      prisma.lesson.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.complete('l1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should complete lesson and upsert progress successfully', async () => {
      prisma.lesson.findUnique.mockResolvedValue({ id: 'l1' });
      prisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      prisma.progress.upsert.mockResolvedValue({ id: 'p1' });

      const res = await service.complete('l1', 'u1');
      expect(res.success).toBe(true);
      expect(prisma.progress.upsert).toHaveBeenCalled();
    });
  });
});
