import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: { name: string; email: string; password: string; regionId: string; role?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '12'), 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: (dto.role as 'STUDENT' | 'INSTRUCTOR') || 'STUDENT',
        regionId: dto.regionId,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role, user.regionId);

    this.logger.log(`User registered: ${user.email} (${user.role})`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        regionId: user.regionId,
      },
      ...tokens,
    };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role, user.regionId);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        regionId: user.regionId,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token.
   *
   * Memverifikasi signature & expiry refresh token dengan JWT_REFRESH_SECRET,
   * lalu menerbitkan access token baru. Refresh token yang lama bisa tetap
   * digunakan (rotation penuh akan ditambahkan di Fase 3 dengan Redis blacklist).
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: { sub?: string; email?: string; role?: string; regionId?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch (err) {
      this.logger.warn(`Refresh token invalid: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Terbitkan access token baru (refresh token dirotasi untuk mencegah reuse).
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, regionId: user.regionId },
    );
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, regionId: user.regionId },
      {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { region: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      regionId: user.regionId,
      region: user.region,
      organization: user.organization,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  async getRegions() {
    return this.prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });
  }

  private generateTokens(userId: string, email: string, role: string, regionId: string) {
    const payload = { sub: userId, email, role, regionId };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
