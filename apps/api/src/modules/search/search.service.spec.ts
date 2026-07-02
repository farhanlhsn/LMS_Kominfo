import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrismaService = {
  course: {
    findMany: jest.fn(),
  },
  lesson: {
    findMany: jest.fn(),
  },
};

describe('SearchService', () => {
  let service: SearchService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search - validasi query', () => {
    it('harus return kosong untuk query kurang dari 2 karakter', async () => {
      const result = await service.search('a');
      expect(result).toEqual({ courses: [], lessons: [] });
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });

    it('harus return kosong untuk query kosong', async () => {
      const result = await service.search('   ');
      expect(result).toEqual({ courses: [], lessons: [] });
    });
  });

  describe('search - filtering', () => {
    it('harus filter by regionId jika diberikan', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.lesson.findMany.mockResolvedValue([]);

      await service.search('test', { regionId: 'reg-1' });

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ regionId: 'reg-1' }),
        }),
      );
    });

    it('harus filter onlyPublished secara default', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.lesson.findMany.mockResolvedValue([]);

      await service.search('test');

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('harus memungkinkan non-published course saat onlyPublished=false', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.lesson.findMany.mockResolvedValue([]);

      await service.search('test', { onlyPublished: false });

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('harus cap limit maksimum 20', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.lesson.findMany.mockResolvedValue([]);

      await service.search('test', { limit: 100 });

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  describe('search - formatting result', () => {
    it('harus map lesson dengan course info', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 'l1',
          title: 'Pengenalan AI',
          module: { course: { title: 'AI untuk Pemula', slug: 'ai-pemula' } },
        },
      ]);

      const result = await service.search('ai');

      expect(result.lessons).toEqual([
        {
          id: 'l1',
          title: 'Pengenalan AI',
          courseTitle: 'AI untuk Pemula',
          courseSlug: 'ai-pemula',
          type: 'lesson',
        },
      ]);
    });

    it('harus map course dengan type course', async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: 'c1', title: 'AI untuk Pemula', slug: 'ai-pemula' },
      ]);
      prisma.lesson.findMany.mockResolvedValue([]);

      const result = await service.search('ai');

      expect(result.courses).toEqual([
        { id: 'c1', title: 'AI untuk Pemula', slug: 'ai-pemula', type: 'course' },
      ]);
    });
  });
});
