import { Test, TestingModule } from '@nestjs/testing';
import { CourseModulesService } from './course-modules.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  course: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  module: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  lesson: {
    count: jest.fn(),
  },
};

describe('CourseModulesService', () => {
  let service: CourseModulesService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseModulesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CourseModulesService>(CourseModulesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if course not found', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(service.create('c1', { title: 'Mod 1' })).rejects.toThrow(NotFoundException);
    });

    it('should create module successfully and update course totals', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.module.aggregate.mockResolvedValue({ _max: { order: 0 } });
      prisma.module.create.mockResolvedValue({ id: 'm1', courseId: 'c1', title: 'Mod 1' });
      prisma.module.count.mockResolvedValue(1);
      prisma.lesson.count.mockResolvedValue(0);
      prisma.course.update.mockResolvedValue({ id: 'c1' });

      const res = await service.create('c1', { title: 'Mod 1' });
      expect(res.id).toBe('m1');
      expect(prisma.module.create).toHaveBeenCalled();
      expect(prisma.course.update).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if module missing', async () => {
      prisma.module.findUnique.mockResolvedValue(null);
      await expect(service.findById('m1')).rejects.toThrow(NotFoundException);
    });

    it('should return module details if found', async () => {
      prisma.module.findUnique.mockResolvedValue({ id: 'm1', title: 'Mod 1', lessons: [] });
      const res = await service.findById('m1');
      expect(res.title).toBe('Mod 1');
    });
  });
});
