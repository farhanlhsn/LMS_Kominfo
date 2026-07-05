import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";

type ProviderKey = "GOOGLE" | "MICROSOFT";

const MOCK_OAUTH_PROFILES: Record<
  ProviderKey,
  (code: string) => {
    providerUserId: string;
    email: string;
    name: string;
    raw: Record<string, unknown>;
  }
> = {
  GOOGLE: (code) => ({
    providerUserId: `google-${code}`,
    email: `google.${code}@example.com`,
    name: `Google User ${code}`,
    raw: { code, provider: "google", email_verified: true },
  }),
  MICROSOFT: (code) => ({
    providerUserId: `ms-${code}`,
    email: `ms.${code}@example.com`,
    name: `Microsoft User ${code}`,
    raw: { code, provider: "microsoft" },
  }),
};

@Injectable()
export class OAuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async start(
    provider: ProviderKey,
    redirectUri?: string,
  ): Promise<{ authorizeUrl: string; state: string }> {
    const state = this.generateState();
    // Real OIDC would build a vendor-specific URL. We mock it so the
    // frontend can complete the round trip.
    const authorizeUrl = `https://accounts.mock/${provider.toLowerCase()}/authorize?client_id=lms&state=${state}&redirect_uri=${encodeURIComponent(
      redirectUri ?? "http://localhost:3000/oauth/callback",
    )}`;
    return { authorizeUrl, state };
  }

  async callback(
    provider: ProviderKey,
    code: string,
    organizationId?: string,
  ) {
    if (!code || code.length < 4) {
      throw new BadRequestException("Invalid OAuth code");
    }
    const mock = MOCK_OAUTH_PROFILES[provider](code);
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: mock.providerUserId,
        },
      },
    });
    if (existing) {
      const account = await this.prisma.oAuthAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: `mock-access-${code}`,
          refreshToken: `mock-refresh-${code}`,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          organizationId: organizationId ?? existing.organizationId,
          rawProfile: mock.raw as Prisma.InputJsonValue,
        },
        include: { user: true },
      });
      return { account, user: account.user, linked: true };
    }
    return {
      profile: {
        provider,
        providerUserId: mock.providerUserId,
        email: mock.email,
        name: mock.name,
        raw: mock.raw,
      },
    };
  }

  async linkAccount(
    userId: string,
    organization: OrganizationContext | null,
    provider: ProviderKey,
    profile: {
      providerUserId: string;
      email?: string;
      raw: Record<string, unknown>;
    },
  ) {
    const account = await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      update: {
        userId,
        organizationId: organization?.id,
        email: profile.email,
        rawProfile: profile.raw as Prisma.InputJsonValue,
      },
      create: {
        userId,
        organizationId: organization?.id,
        provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        accessToken: `mock-access-${profile.providerUserId}`,
        refreshToken: `mock-refresh-${profile.providerUserId}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        rawProfile: profile.raw as Prisma.InputJsonValue,
      },
    });
    return account;
  }

  async listAccounts(userId: string) {
    return this.prisma.oAuthAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async unlinkAccount(userId: string, accountId: string) {
    const account = await this.prisma.oAuthAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException("OAuth account not found");
    }
    await this.prisma.oAuthAccount.delete({ where: { id: account.id } });
    return { id: account.id };
  }

  private generateState() {
    return Math.random().toString(36).slice(2, 14);
  }
}
