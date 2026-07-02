import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrismaService = {
  enrollment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  progress: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProgress', () => {
    it('should throw NotFoundException if enrollment does not exist', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProgress('course-1', 'user-1', { lessonId: 'lesson-1', completed: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lesson does not belong to course', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-1',
        course: {
          totalLessons: 10,
          modules: [
            {
              lessons: [{ id: 'other-lesson' }],
            },
          ],
        },
      });

      await expect(
        service.updateProgress('course-1', 'user-1', { lessonId: 'lesson-1', completed: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new progress and NOT recalculate if completed is false', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-1',
        course: {
          totalLessons: 10,
          modules: [{ lessons: [{ id: 'lesson-1' }] }],
        },
      });
      prisma.progress.findUnique.mockResolvedValue(null);
      prisma.progress.create.mockResolvedValue({ id: 'prog-1', completed: false });

      await service.updateProgress('course-1', 'user-1', { lessonId: 'lesson-1', completed: false, videoPosition: 50 });

      expect(prisma.progress.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enrollmentId: 'enrollment-1',
          lessonId: 'lesson-1',
          completed: false,
          videoPosition: 50,
        }),
      });
      expect(prisma.enrollment.update).not.toHaveBeenCalled(); // No recalculation
    });

    it('should update progress and recalculate if completed becomes true', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-1',
        course: {
          totalLessons: 2,
          modules: [{ lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] }],
        },
      });
      prisma.progress.findUnique.mockResolvedValue({
        id: 'prog-1',
        completed: false,
      });
      prisma.progress.update.mockResolvedValue({ id: 'prog-1', completed: true });
      prisma.progress.count.mockResolvedValue(2); // 2 completed lessons

      await service.updateProgress('course-1', 'user-1', { lessonId: 'lesson-1', completed: true });

      expect(prisma.progress.update).toHaveBeenCalledWith({
        where: { id: 'prog-1' },
        data: expect.objectContaining({ completed: true }),
      });
      
      // Recalculation check
      expect(prisma.progress.count).toHaveBeenCalledWith({
        where: { enrollmentId: 'enrollment-1', completed: true },
      });
      expect(prisma.enrollment.update).toHaveBeenCalledWith({
        where: { id: 'enrollment-1' },
        data: expect.objectContaining({
          progressPercent: 100, // 2 / 2 * 100
          status: 'COMPLETED',
        }),
      });
    });
  });
});
