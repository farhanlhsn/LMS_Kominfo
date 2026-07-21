import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ListUsersQueryDto, UpdateUserDto } from "./dto/users.dto";
import type { UpdateUserStatusDto } from "./dto/users.dto";

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListUsersQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      memberships: { some: { organizationId } },
    };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { name: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          memberships: {
            where: { organizationId },
            select: {
              id: true,
              status: true,
              memberRoles: {
                select: { role: { select: { key: true, name: true } } },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        createdAt: u.createdAt,
        membership: u.memberships[0] ?? null,
        roles: u.memberships[0]?.memberRoles.map((mr) => mr.role) ?? [],
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async get(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, memberships: { some: { organizationId } } },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          where: { organizationId },
          select: {
            id: true,
            status: true,
            memberRoles: {
              select: { role: { select: { key: true, name: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, name: true, status: true },
    });
  }

  async updateStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: { id: true, email: true, name: true, status: true },
    });
  }
}
