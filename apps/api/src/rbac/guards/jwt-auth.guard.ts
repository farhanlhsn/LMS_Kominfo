import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-request";
import { jwtAccessSecret } from "../../common/security/jwt-secrets";
import type { AccessTokenPayload } from "../types/jwt-payload";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: jwtAccessSecret()
      });
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }

    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE"
    ) {
      throw new UnauthorizedException("Session is not active");
    }

    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      sessionId: session.id,
      activeOrganizationId:
        payload.activeOrganizationId ?? session.activeOrganizationId
    };

    return true;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
  }
}
