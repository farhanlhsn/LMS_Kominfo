import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MIN_TTL_MS = 60 * 1000;
const MAX_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class PopoutService {
  // The Prisma client is cast to `any` to remain forward-compatible with the
  // regenerated prisma types for the new popout models.
  private readonly db: any;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.db = prisma as unknown as any;
  }

  async issueToken(
    organization: OrganizationContext,
    userId: string,
    lessonId: string,
    ttlMs?: number,
  ) {
    const ttl = this.normalizeTtl(ttlMs);
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + ttl);
    const session = await this.db.popoutSession.create({
      data: {
        organizationId: organization.id,
        lessonId,
        userId,
        token: this.hashToken(token),
        expiresAt,
      },
    });
    return {
      token,
      expiresAt: session.expiresAt,
      lessonId: session.lessonId,
    };
  }

  async validateToken(token: string) {
    const hash = this.hashToken(token);
    const session = await this.db.popoutSession.findUnique({
      where: { token: hash },
    });
    if (!session) {
      throw new NotFoundException("Popout token not found");
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Popout token expired");
    }
    await this.db.popoutSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
    return {
      lessonId: session.lessonId,
      organizationId: session.organizationId,
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
  }

  async revokeToken(organizationId: string, userId: string, token: string) {
    const hash = this.hashToken(token);
    const session = await this.db.popoutSession.findUnique({
      where: { token: hash },
    });
    if (!session) {
      throw new NotFoundException("Popout token not found");
    }
    if (session.organizationId !== organizationId || session.userId !== userId) {
      throw new BadRequestException("Token does not belong to the current user");
    }
    await this.db.popoutSession.delete({ where: { id: session.id } });
    return { revoked: true, id: session.id };
  }

  private normalizeTtl(ttlMs?: number): number {
    if (!ttlMs) return DEFAULT_TTL_MS;
    return Math.min(Math.max(ttlMs, MIN_TTL_MS), MAX_TTL_MS);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
