import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockCurrentUser = {
      userId: 'u1',
      email: 'admin@lms.go.id',
      role: 'REGIONAL_ADMIN',
      regionId: 'reg-1',
    };

    it('should find users scoped to regional admin region', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        mockCurrentUser,
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            regionId: 'reg-1',
          }),
        }),
      );
    });

    it('should find users without region scoping for super admin', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        { ...mockCurrentUser, role: 'SUPER_ADMIN' },
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            regionId: 'reg-1',
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if regional admin deletes user from another region', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', regionId: 'other-region' });
      
      await expect(
        service.remove('u2', { userId: 'u1', email: 'admin@lms.go.id', role: 'REGIONAL_ADMIN', regionId: 'reg-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', regionId: 'reg-1' });
      prisma.user.update.mockResolvedValue({ id: 'u2' });

      await service.remove('u2', { userId: 'u1', email: 'admin@lms.go.id', role: 'REGIONAL_ADMIN', regionId: 'reg-1' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u2' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
