import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  regionId: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page: number; limit: number; search?: string; role?: string; regionId?: string; isActive?: string; sortBy: string; sortOrder: 'asc' | 'desc' }, currentUser: RequestUser) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where['role'] = query.role;
    }

    // Regional admin can only see users in their region
    if (currentUser.role === 'REGIONAL_ADMIN') {
      where['regionId'] = currentUser.regionId;
    } else if (query.regionId) {
      where['regionId'] = query.regionId;
    }

    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where as any,
        select: {
          id: true, name: true, email: true, avatarUrl: true, role: true,
          regionId: true, organization: true, isActive: true,
          lastLoginAt: true, createdAt: true, updatedAt: true,
          region: { select: { id: true, name: true, slug: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.user.count({ where: where as any }),
    ]);

    return {
      data: users,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findById(id: string, currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, avatarUrl: true, phoneNumber: true,
        role: true, regionId: true, organization: true, bio: true, isActive: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        region: { select: { id: true, name: true, slug: true, themeColor: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Regional admin can only view users in their region
    if (currentUser.role === 'REGIONAL_ADMIN' && user.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot access users from other regions');
    }

    return user;
  }

  /**
   * Update profil user saat ini (self-service).
   * Hanya field tertentu yang boleh diubah sendiri: name, phoneNumber, organization, bio, avatarUrl.
   * Email & role hanya bisa diubah admin.
   */
  async updateMe(userId: string, dto: { name?: string; phoneNumber?: string; organization?: string; bio?: string; avatarUrl?: string }) {
    const allowed = ['name', 'phoneNumber', 'organization', 'bio', 'avatarUrl'] as const;
    const data: Record<string, string> = {};
    for (const k of allowed) {
      if (dto[k] !== undefined) data[k] = dto[k]!;
    }
    if (Object.keys(data).length === 0) {
      return this.findById(userId, { userId, email: '', role: 'STUDENT', regionId: '' });
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, avatarUrl: true, phoneNumber: true,
        role: true, regionId: true, organization: true, bio: true, isActive: true,
        region: { select: { id: true, name: true, slug: true, themeColor: true } },
      },
    });
    this.logger.log(`User ${userId} updated their profile`);
    return updated;
  }

  /**
   * Ubah password user saat ini (self-service).
   * Verifikasi password lama dulu, lalu hash dan simpan.
   */
  async changeMyPassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new ForbiddenException('Password lama dan baru wajib diisi');
    }
    if (newPassword.length < 8) {
      throw new ForbiddenException('Password baru minimal 8 karakter');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ForbiddenException('Password lama salah');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    this.logger.log(`User ${userId} changed their password`);
    return { success: true };
  }

  async create(dto: { name: string; email: string; password: string; regionId: string; role?: string; organization?: string }, currentUser: RequestUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Regional admin can only create users in their region
    if (currentUser.role === 'REGIONAL_ADMIN' && dto.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot create users in other regions');
    }

    // Regional admin cannot create SUPER_ADMIN or other REGIONAL_ADMIN
    if (currentUser.role === 'REGIONAL_ADMIN' && (dto.role === 'SUPER_ADMIN' || dto.role === 'REGIONAL_ADMIN')) {
      throw new ForbiddenException('Cannot create admin-level users');
    }

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hash,
        role: dto.role || 'STUDENT',
        regionId: dto.regionId,
        organization: dto.organization,
      },
      select: {
        id: true, name: true, email: true, role: true, regionId: true,
        organization: true, isActive: true, createdAt: true,
      },
    });

    this.logger.log(`User created by ${currentUser.email}: ${user.email} (${user.role})`);

    return user;
  }

  async update(id: string, dto: { name?: string; role?: string; isActive?: boolean; organization?: string; bio?: string }, currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Regional admin: region check
    if (currentUser.role === 'REGIONAL_ADMIN') {
      if (user.regionId !== currentUser.regionId) {
        throw new ForbiddenException('Cannot modify users from other regions');
      }
      // Cannot promote to admin-level roles
      if (dto.role === 'SUPER_ADMIN' || dto.role === 'REGIONAL_ADMIN') {
        throw new ForbiddenException('Cannot assign admin-level roles');
      }
    }

    // Cannot demote the last super admin
    if (dto.role && user.role === 'SUPER_ADMIN' && dto.role !== 'SUPER_ADMIN') {
      const superAdminCount = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true, deletedAt: null } });
      if (superAdminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last Super Admin');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.organization !== undefined && { organization: dto.organization }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
      select: {
        id: true, name: true, email: true, role: true, regionId: true,
        organization: true, isActive: true, lastLoginAt: true, updatedAt: true,
      },
    });

    this.logger.log(`User updated by ${currentUser.email}: ${updated.email} (${updated.role})`);

    return updated;
  }

  async remove(id: string, currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (user.id === currentUser.userId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    // Regional admin: region check
    if (currentUser.role === 'REGIONAL_ADMIN' && user.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot delete users from other regions');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    this.logger.log(`User deactivated by ${currentUser.email}: ${user.email}`);

    return { success: true, message: 'User deactivated' };
  }

  async resetPassword(id: string, newPassword: string, currentUser: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.role === 'REGIONAL_ADMIN' && user.regionId !== currentUser.regionId) {
      throw new ForbiddenException('Cannot reset password for users from other regions');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });

    this.logger.log(`Password reset by ${currentUser.email} for user: ${user.email}`);

    return { success: true, message: 'Password reset successfully' };
  }
}
