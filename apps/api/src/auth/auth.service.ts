import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "node:crypto";
import { Prisma } from "@lms/db";
import { PERMISSIONS, SYSTEM_ROLES } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";
import { EmailService } from "../email/email.service";
import type {
  AccessTokenPayload,
  RefreshTokenPayload
} from "../rbac/types/jwt-payload";
import type { AuthenticatedUser } from "./types/authenticated-request";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";

interface RequestMetadata {
  [key: string]: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface PublicUser {
  id: string;
  email: string;
  name: string | null;
}

interface OrganizationSummary {
  id: string;
  slug: string;
  name: string;
}

interface AuthResponse {
  user: PublicUser;
  activeOrganization: OrganizationSummary | null;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RbacService) private readonly rbacService: RbacService,
    @Optional() @Inject(EmailService) private readonly emailService?: EmailService,
  ) {}

  async register(
    dto: RegisterDto,
    metadata: RequestMetadata
  ): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const organizationSlug =
      dto.organizationSlug?.trim().toLowerCase() ??
      this.slugify(dto.organizationName);

    const existingOrganization = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug }
    });

    if (existingOrganization) {
      throw new ConflictException("Organization slug is already in use");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash,
        status: "ACTIVE"
      }
    });

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.organizationName.trim(),
        slug: organizationSlug,
        status: "ACTIVE",
        loginPolicy: {
          create: {
            allowPasswordLogin: true,
            allowSocialLogin: false,
            allowSsoLogin: false,
            requireSsoForVerifiedDomains: false,
            jitProvisioningEnabled: false,
            inviteOnly: false,
            mfaRequired: false,
            sessionTtlMinutes: this.refreshTtlDays() * 24 * 60
          }
        }
      }
    });

    await this.rbacService.ensureOrganizationDefaults(organization.id);

    const orgAdminRole = await this.prisma.role.findUnique({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key: SYSTEM_ROLES.orgAdmin
        }
      }
    });

    if (!orgAdminRole) {
      throw new BadRequestException("Organization role defaults are missing");
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        memberRoles: {
          create: {
            roleId: orgAdminRole.id
          }
        }
      }
    });

    await this.prisma.userIdentity.create({
      data: {
        userId: user.id,
        providerType: "PASSWORD",
        providerSubject: email,
        providerEmail: email,
        providerEmailVerified: true,
        lastLoginAt: new Date()
      }
    });

    await this.audit({
      action: "auth.register_success",
      userId: user.id,
      organizationId: organization.id,
      entityType: "OrganizationMember",
      entityId: member.id,
      metadata
    });

    const tokens = await this.createSessionTokens(
      user.id,
      organization.id,
      metadata
    );

    return {
      user: this.publicUser(user),
      activeOrganization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name
      },
      tokens
    };
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!user || !user.passwordHash || user.status !== "ACTIVE") {
      await this.audit({
        action: "auth.login_failure",
        metadata: { ...metadata, email, reason: "invalid_credentials" },
        severity: "WARNING"
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.audit({
        action: "auth.login_failure",
        userId: user.id,
        metadata: { ...metadata, email, reason: "invalid_credentials" },
        severity: "WARNING"
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    const membership = dto.organizationId
      ? user.memberships.find(
          (candidate) => candidate.organizationId === dto.organizationId
        )
      : user.memberships.find(
          (candidate) =>
            candidate.status === "ACTIVE" &&
            candidate.organization.status === "ACTIVE"
        );

    if (!membership) {
      throw new ForbiddenException("Active organization membership is required");
    }

    if (
      membership.status !== "ACTIVE" ||
      membership.organization.status !== "ACTIVE"
    ) {
      throw new ForbiddenException("Organization membership is not active");
    }

    const loginPolicy = await this.prisma.organizationLoginPolicy.findUnique({
      where: { organizationId: membership.organizationId }
    });

    if (loginPolicy && !loginPolicy.allowPasswordLogin) {
      throw new ForbiddenException("Password login is disabled for this organization");
    }

    const existingPasswordIdentity = await this.prisma.userIdentity.findFirst({
      where: {
        providerType: "PASSWORD",
        organizationId: null,
        providerSubject: email
      }
    });

    if (existingPasswordIdentity) {
      await this.prisma.userIdentity.update({
        where: { id: existingPasswordIdentity.id },
        data: {
          userId: user.id,
          providerEmail: email,
          providerEmailVerified: true,
          lastLoginAt: new Date()
        }
      });
    } else {
      await this.prisma.userIdentity.create({
        data: {
          userId: user.id,
          providerType: "PASSWORD",
          providerSubject: email,
          providerEmail: email,
          providerEmailVerified: true,
          lastLoginAt: new Date()
        }
      });
    }

    const tokens = await this.createSessionTokens(
      user.id,
      membership.organizationId,
      metadata
    );

    await this.audit({
      action: "auth.login_success",
      userId: user.id,
      organizationId: membership.organizationId,
      metadata
    });

    return {
      user: this.publicUser(user),
      activeOrganization: {
        id: membership.organization.id,
        slug: membership.organization.slug,
        name: membership.organization.name
      },
      tokens
    };
  }

  async refresh(
    refreshToken: string,
    metadata: RequestMetadata
  ): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: true,
        activeOrganization: true
      }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Session is not active");
    }

    const refreshMatches = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!refreshMatches) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedReason: "refresh_token_reuse_detected"
        }
      });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.issueTokens(
      session.userId,
      session.id,
      session.activeOrganizationId
    );

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        tokenHash: await bcrypt.hash(tokens.refreshToken, 12),
        lastUsedAt: new Date(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });

    return {
      user: this.publicUser(session.user),
      activeOrganization: session.activeOrganization
        ? {
            id: session.activeOrganization.id,
            slug: session.activeOrganization.slug,
            name: session.activeOrganization.name
          }
        : null,
      tokens
    };
  }

  async me(user: AuthenticatedUser): Promise<{
    user: PublicUser;
    activeOrganization: Awaited<ReturnType<RbacService["getOrganizationContext"]>> | null;
    organizations: Array<OrganizationSummary & { membershipStatus: string }>;
  }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      throw new NotFoundException("User not found");
    }

    const organizations = await this.getOrganizations(user.id);
    const activeOrganization = user.activeOrganizationId
      ? await this.rbacService.getOrganizationContext(
          user.id,
          user.activeOrganizationId
        )
      : null;

    return {
      user: this.publicUser(dbUser),
      activeOrganization,
      organizations
    };
  }

  async getOrganizations(
    userId: string
  ): Promise<Array<OrganizationSummary & { membershipStatus: string }>> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: "ACTIVE",
        organization: {
          status: "ACTIVE"
        }
      },
      include: {
        organization: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      slug: membership.organization.slug,
      name: membership.organization.name,
      membershipStatus: membership.status
    }));
  }

  async switchOrganization(
    user: AuthenticatedUser,
    organizationId: string,
    metadata: RequestMetadata
  ): Promise<{
    activeOrganization: Awaited<ReturnType<RbacService["getOrganizationContext"]>>;
    tokens: {
      accessToken: string;
      expiresIn: number;
    };
  }> {
    const context = await this.rbacService.getOrganizationContext(
      user.id,
      organizationId
    );

    await this.prisma.userSession.update({
      where: { id: user.sessionId },
      data: {
        activeOrganizationId: organizationId,
        lastUsedAt: new Date()
      }
    });

    const accessToken = await this.signAccessToken(
      user.id,
      user.sessionId,
      organizationId
    );

    await this.audit({
      action: "auth.organization_switched",
      userId: user.id,
      organizationId,
      entityType: "Organization",
      entityId: organizationId,
      metadata
    });

    return {
      activeOrganization: context,
      tokens: {
        accessToken,
        expiresIn: this.accessTtlSeconds()
      }
    };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Always return success to avoid email enumeration
    if (!user || user.status !== "ACTIVE") return { sent: true };

    // Invalidate old tokens
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

    const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    await this.emailService?.sendPasswordReset(user.email, user.name, resetUrl);

    await this.audit({ action: "auth.forgot_password", userId: user.id, metadata: { email } });
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    // Revoke all active sessions
    await this.prisma.userSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "password_reset" },
    });

    await this.audit({ action: "auth.password_reset", userId: record.userId });
    return { reset: true };
  }

  async logout(
    user: AuthenticatedUser,
    metadata: RequestMetadata
  ): Promise<{ revoked: true }> {
    await this.prisma.userSession.update({
      where: { id: user.sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: "logout"
      }
    });

    await this.audit({
      action: "auth.logout",
      userId: user.id,
      organizationId: user.activeOrganizationId,
      metadata
    });

    return { revoked: true };
  }

  private async createSessionTokens(
    userId: string,
    activeOrganizationId: string | null,
    metadata: RequestMetadata
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const tokens = await this.issueTokens(userId, sessionId, activeOrganizationId);

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        activeOrganizationId,
        tokenHash: await bcrypt.hash(tokens.refreshToken, 12),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: this.refreshExpiresAt(),
        lastUsedAt: new Date()
      }
    });

    return tokens;
  }

  private async issueTokens(
    userId: string,
    sessionId: string,
    activeOrganizationId: string | null
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId, sessionId, activeOrganizationId),
      this.jwtService.signAsync(
        {
          sub: userId,
          sessionId,
          type: "refresh"
        } satisfies RefreshTokenPayload,
        {
          secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
          expiresIn: `${this.refreshTtlDays()}d`
        }
      )
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds()
    };
  }

  private async signAccessToken(
    userId: string,
    sessionId: string,
    activeOrganizationId: string | null
  ) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sessionId,
        activeOrganizationId,
        type: "access"
      } satisfies AccessTokenPayload,
      {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
        expiresIn: this.accessTtlSeconds()
      }
    );
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret"
        }
      );

      if (payload.type !== "refresh") {
        throw new UnauthorizedException("Invalid token type");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private publicUser(user: {
    id: string;
    email: string;
    name: string | null;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || `organization-${Date.now()}`;
  }

  private accessTtlSeconds() {
    return Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  }

  private refreshTtlDays() {
    return Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  }

  private refreshExpiresAt() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTtlDays());
    return expiresAt;
  }

  private async audit(input: {
    action: string;
    userId?: string;
    organizationId?: string | null;
    entityType?: string;
    entityId?: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    metadata?: Record<string, unknown>;
  }) {
    const metadata = (input.metadata ?? {}) as Prisma.InputJsonObject;

    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        severity: input.severity ?? "INFO",
        metadata
      }
    });
  }
}
