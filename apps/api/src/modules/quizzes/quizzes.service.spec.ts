import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  quiz: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  question: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  choice: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  quizAttempt: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  quizAnswer: {
    create: jest.fn(),
  },
  leaderboard: {
    upsert: jest.fn(),
  },
};

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startAttempt', () => {
    it('should throw NotFoundException if quiz is missing', async () => {
      prisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.startAttempt('q1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if max attempts reached', async () => {
      prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', maxAttempt: 3, questions: [] });
      prisma.quizAttempt.count.mockResolvedValue(3);

      await expect(service.startAttempt('q1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should start attempt successfully', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 'q1',
        title: 'Quiz 1',
        maxAttempt: 3,
        durationMinutes: 15,
        shuffleQuestion: false,
        questions: [{ id: 'qu1', question: 'Q1', choices: [] }],
      });
      prisma.quizAttempt.count.mockResolvedValue(1);
      prisma.quizAttempt.create.mockResolvedValue({ id: 'att-1' });

      const res = await service.startAttempt('q1', 'u1');
      expect(res.attemptId).toBe('att-1');
      expect(res.totalQuestions).toBe(1);
    });
  });

  describe('submitAttempt', () => {
    it('should throw NotFoundException if attempt is missing', async () => {
      prisma.quizAttempt.findUnique.mockResolvedValue(null);
      await expect(service.submitAttempt('att-1', 'u1', { answers: [] })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user mismatch', async () => {
      prisma.quizAttempt.findUnique.mockResolvedValue({ id: 'att-1', userId: 'other' });
      await expect(service.submitAttempt('att-1', 'u1', { answers: [] })).rejects.toThrow(ForbiddenException);
    });

    it('should submit attempt and calculate scores successfully', async () => {
      prisma.quizAttempt.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'u1',
        quizId: 'q1',
        submittedAt: null,
      });
      prisma.question.findUnique.mockResolvedValue({
        id: 'qu1',
        type: 'MULTIPLE_CHOICE',
        score: 10,
        choices: [
          { label: 'A', value: 'Option A', isCorrect: true },
          { label: 'B', value: 'Option B', isCorrect: false },
        ],
      });
      prisma.quiz.findUnique.mockResolvedValue({ passingScore: 70 });
      prisma.quizAnswer.create.mockResolvedValue({ id: 'ans-1' });
      prisma.quizAttempt.update.mockResolvedValue({ id: 'att-1' });

      const res = await service.submitAttempt('att-1', 'u1', {
        answers: [{ questionId: 'qu1', answer: 'A' }],
      });

      expect(res.score).toBe(100);
      expect(res.passed).toBe(true);
      expect(prisma.quizAttempt.update).toHaveBeenCalled();
    });
  });
});
