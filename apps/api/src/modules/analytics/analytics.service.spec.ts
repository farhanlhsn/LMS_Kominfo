import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrismaService = {
  enrollment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  leaderboard: {
    findFirst: jest.fn(),
  },
  chatMessage: {
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  course: {
    count: jest.fn(),
  },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStudentStats', () => {
    it('should aggregate student statistics correctly', async () => {
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'e1',
          status: 'ACTIVE',
          progress: [{ completed: true }, { completed: false }],
        },
        {
          id: 'e2',
          status: 'COMPLETED',
          progress: [{ completed: true }],
        },
      ]);
      prisma.leaderboard.findFirst.mockResolvedValue({ totalXP: 120 });
      prisma.chatMessage.count.mockResolvedValue(5);

      const res = await service.getStudentStats('u1');

      expect(res.activeCourses).toBe(1);
      expect(res.completedCourses).toBe(1);
      expect(res.learningHours).toBe(0.5); // (2 completed * 15) / 60 = 0.5 hours
      expect(res.xp).toBe(120);
      expect(res.aiChatUsage).toBe(5);
    });
  });

  describe('getAdminStats', () => {
    it('should count platform aggregates', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.course.count.mockResolvedValue(5);
      prisma.enrollment.count.mockResolvedValue(8); // returns count for total enrollments first
      // wait, prisma.enrollment.count is called twice (total enrollments and completions)
      prisma.enrollment.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(4);

      const res = await service.getAdminStats('reg-1');

      expect(res.totalUsers).toBe(10);
      expect(res.totalCourses).toBe(5);
      expect(res.totalEnrollments).toBe(8);
      expect(res.completionRate).toBe(50); // 4 completions / 8 enrollments
    });
  });
});
