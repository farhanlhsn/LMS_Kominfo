import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  region: {
    findMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key, defaultVal) => {
    if (key === 'BCRYPT_ROUNDS') return '10';
    return defaultVal;
  }),
  getOrThrow: jest.fn().mockImplementation((key) => {
    if (key === 'JWT_REFRESH_SECRET') return 'secret';
    throw new Error('Not found');
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'STUDENT',
        regionId: 'reg-1',
      });

      const res = await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        regionId: 'reg-1',
      });

      expect(res.user.id).toBe('user-1');
      expect(res.accessToken).toBe('mock-token');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      await expect(
        service.register({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          regionId: 'reg-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
        role: 'STUDENT',
        regionId: 'reg-1',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await service.login({ email: 'john@example.com', password: 'password123' });

      expect(res.user.id).toBe('user-1');
      expect(res.accessToken).toBe('mock-token');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'john@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is deactivated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: false,
      });
      await expect(
        service.login({ email: 'john@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getRegions', () => {
    it('should return list of active regions', async () => {
      prisma.region.findMany.mockResolvedValue([{ id: 'r1', name: 'Aceh', slug: 'aceh' }]);
      const res = await service.getRegions();
      expect(res.length).toBe(1);
      expect(prisma.region.findMany).toHaveBeenCalled();
    });
  });
});
