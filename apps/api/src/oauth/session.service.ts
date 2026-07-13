import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";

const MAX_SESSIONS_PER_USER = 5;

@Injectable()
export class SessionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      take: 50,
    });
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      deviceInfo: null,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
    }));
  }

  async listAllSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    if (session.id === user.sessionId) {
      throw new ForbiddenException("Use sign-out to revoke the current session");
    }
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return { id: session.id };
  }

  async revokeAll(user: AuthenticatedUser) {
    const result = await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null, NOT: { id: user.sessionId } },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }

  async recordSession(
    userId: string,
    input: {
      refreshTokenHash: string;
      deviceInfo?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresAt: Date;
    },
  ) {
    const active = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (active.length >= MAX_SESSIONS_PER_USER) {
      const overflow = active.length - MAX_SESSIONS_PER_USER + 1;
      const oldest = active.slice(0, overflow);
      await this.prisma.userSession.updateMany({
        where: { id: { in: oldest.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      });
    }
    return this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: input.refreshTokenHash,
        activeOrganizationId: null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
      },
    });
  }
}
