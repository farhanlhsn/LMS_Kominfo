import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  assignment: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  lesson: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  submission: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submit', () => {
    it('should throw NotFoundException if assignment missing', async () => {
      prisma.assignment.findUnique.mockResolvedValue(null);
      await expect(service.submit('a1', 'u1', 'm1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if past due date', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1', dueDate: new Date(Date.now() - 100000) });
      await expect(service.submit('a1', 'u1', 'm1')).rejects.toThrow(ForbiddenException);
    });

    it('should upsert submission successfully', async () => {
      prisma.assignment.findUnique.mockResolvedValue({ id: 'a1', dueDate: new Date(Date.now() + 100000) });
      prisma.submission.upsert.mockResolvedValue({ id: 'sub-1' });

      const res = await service.submit('a1', 'u1', 'm1');
      expect(res.id).toBe('sub-1');
      expect(prisma.submission.upsert).toHaveBeenCalled();
    });
  });

  describe('grade', () => {
    it('should throw NotFoundException if submission missing', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.grade('sub-1', { score: 90 }, 'inst-1')).rejects.toThrow(NotFoundException);
    });

    it('should grade submission successfully', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 'sub-1' });
      prisma.submission.update.mockResolvedValue({ id: 'sub-1', score: 90 });

      const res = await service.grade('sub-1', { score: 90, feedback: 'Great job' }, 'inst-1');
      expect(res.score).toBe(90);
    });
  });
});
