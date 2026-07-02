import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AiGateway } from './gateway/ai.gateway';
import { RagService } from './rag/rag.service';
import { AiQueueService } from './queue/ai-queue.service';
import { BadRequestException } from '@nestjs/common';

const mockPrismaService = {
  chatSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
  },
  aiUsage: {
    create: jest.fn(),
  },
  lesson: {
    findUnique: jest.fn(),
  },
};

const mockAiGateway = {
  chat: jest.fn().mockResolvedValue({ content: 'mock', usage: { totalTokens: 10 } }),
  embed: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2], usage: { totalTokens: 5 } }),
  embedBatch: jest.fn().mockResolvedValue([]),
};

const mockRagService = {
  retrieve: jest.fn().mockResolvedValue([]),
  buildPromptWithContext: jest.fn().mockReturnValue('You are a tutor. Context: ...'),
  ingestLesson: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
};

const mockAiQueueService = {
  enqueueIngest: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
  enqueueSummary: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
};

describe('AiService', () => {
  let service: AiService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiGateway, useValue: mockAiGateway },
        { provide: RagService, useValue: mockRagService },
        { provide: AiQueueService, useValue: mockAiQueueService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('askAi', () => {
    it('should create session and chat messages successfully', async () => {
      prisma.chatSession.create.mockResolvedValue({ id: 'sess-1' });
      prisma.chatMessage.create
        .mockResolvedValueOnce({ id: 'msg-u', role: 'USER', content: 'hello' })
        .mockResolvedValueOnce({ id: 'msg-a', role: 'ASSISTANT', content: 'mock' });

      const res = await service.askAi('u1', { message: 'hello' });

      expect(res.sessionId).toBe('sess-1');
      expect(prisma.chatSession.create).toHaveBeenCalled();
      expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
    });

    it('should use existing session if provided', async () => {
      prisma.chatMessage.create
        .mockResolvedValueOnce({ id: 'msg-u', role: 'USER' })
        .mockResolvedValueOnce({ id: 'msg-a', role: 'ASSISTANT' });

      const res = await service.askAi('u1', { message: 'hello', sessionId: 'sess-exist' });

      expect(res.sessionId).toBe('sess-exist');
      expect(prisma.chatSession.create).not.toHaveBeenCalled();
    });
  });

  describe('getChatHistory', () => {
    it('should throw BadRequestException if session not found or user mismatch', async () => {
      prisma.chatSession.findUnique.mockResolvedValue(null);
      await expect(service.getChatHistory('sess-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should return session history if valid', async () => {
      prisma.chatSession.findUnique.mockResolvedValue({ id: 'sess-1', userId: 'u1', messages: [] });
      const res = await service.getChatHistory('sess-1', 'u1');
      expect(res.id).toBe('sess-1');
    });
  });
});
