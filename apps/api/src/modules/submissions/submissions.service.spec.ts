import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  assignment: {
    findUnique: jest.fn(),
  },
  material: {
    findUnique: jest.fn(),
  },
  submission: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitAssignment', () => {
    it('should throw NotFoundException if assignment missing', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);
      await expect(
        service.submitAssignment({ assignmentId: 'a1', materialId: 'm1' }, 'student-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if material does not belong to student', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.material.findUnique.mockResolvedValue({ uploadedBy: 'another-student' });
      
      await expect(
        service.submitAssignment({ assignmentId: 'a1', materialId: 'm1' }, 'student-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update existing submission if one exists', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.material.findUnique.mockResolvedValue({ uploadedBy: 'student-1' });
      prisma.submission.findFirst.mockResolvedValue({ id: 'sub-1' });
      prisma.submission.update.mockResolvedValue({ id: 'sub-1', materialId: 'm2' });

      const res = await service.submitAssignment({ assignmentId: 'a1', materialId: 'm2' }, 'student-1');

      expect(res).toEqual({ id: 'sub-1', materialId: 'm2' });
      expect(prisma.submission.update).toHaveBeenCalled();
      expect(prisma.submission.create).not.toHaveBeenCalled();
    });

    it('should create new submission', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
      prisma.material.findUnique.mockResolvedValue({ uploadedBy: 'student-1' });
      prisma.submission.findFirst.mockResolvedValue(null);
      prisma.submission.create.mockResolvedValue({ id: 'sub-new' });

      await service.submitAssignment({ assignmentId: 'a1', materialId: 'm1' }, 'student-1');

      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: {
          assignmentId: 'a1',
          studentId: 'student-1',
          materialId: 'm1',
        },
      });
    });
  });

  describe('gradeSubmission', () => {
    it('should throw ForbiddenException if instructor does not own course', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        assignment: {
          lesson: { module: { course: { instructorId: 'other-instructor' } } }
        }
      });

      await expect(
        service.gradeSubmission('sub-1', { score: 90 }, 'inst-1', 'INSTRUCTOR')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow grading if instructor owns course', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        assignment: {
          lesson: { module: { course: { instructorId: 'inst-1' } } }
        }
      });
      prisma.submission.update.mockResolvedValue({ id: 'sub-1', score: 90 });

      await service.gradeSubmission('sub-1', { score: 90, feedback: 'Good' }, 'inst-1', 'INSTRUCTOR');

      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ score: 90, feedback: 'Good' }),
      });
    });
  });
});
