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
    return this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  async listAllSessions(userId: string) {
    return this.prisma.refreshSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.refreshSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    if (session.id === user.sessionId) {
      throw new ForbiddenException("Use sign-out to revoke the current session");
    }
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return { id: session.id };
  }

  async revokeAll(user: AuthenticatedUser) {
    const result = await this.prisma.refreshSession.updateMany({
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
    const active = await this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (active.length >= MAX_SESSIONS_PER_USER) {
      const overflow = active.length - MAX_SESSIONS_PER_USER + 1;
      const oldest = active.slice(0, overflow);
      await this.prisma.refreshSession.updateMany({
        where: { id: { in: oldest.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      });
    }
    return this.prisma.refreshSession.create({
      data: {
        userId,
        refreshTokenHash: input.refreshTokenHash,
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
      },
    });
  }
}
