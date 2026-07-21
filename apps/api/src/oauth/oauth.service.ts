import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
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
    const normalizedRedirectUri = this.normalizeRedirectUri(redirectUri);
    const state = this.generateState(provider, normalizedRedirectUri);
    // Real OIDC would build a vendor-specific URL. We mock it so the
    // frontend can complete the round trip.
    const authorizeUrl = `https://accounts.mock/${provider.toLowerCase()}/authorize?client_id=lms&state=${state}&redirect_uri=${encodeURIComponent(
      normalizedRedirectUri,
    )}`;
    return { authorizeUrl, state };
  }

  async callback(
    provider: ProviderKey,
    code: string,
    organizationId?: string,
    state?: string,
  ) {
    if (!code || code.length < 4) {
      throw new BadRequestException("Invalid OAuth code");
    }
    this.verifyState(provider, state);
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

  private normalizeRedirectUri(redirectUri?: string) {
    const fallback =
      process.env.PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    const resolved = redirectUri ?? fallback;

    let parsed: URL;
    try {
      parsed = new URL(resolved);
    } catch {
      throw new BadRequestException("Invalid redirect URI");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new BadRequestException("Redirect URI must use HTTP or HTTPS");
    }
    if (parsed.username || parsed.password) {
      throw new BadRequestException("Redirect URI must not include credentials");
    }

    const allowedOrigins = new Set(
      [
        process.env.PUBLIC_APP_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter((value): value is string => Boolean(value)),
    );
    if (!allowedOrigins.has(parsed.origin)) {
      throw new BadRequestException("Redirect URI origin is not allowlisted");
    }

    return parsed.toString();
  }

  private generateState(provider: ProviderKey, redirectUri: string) {
    const payload = Buffer.from(
      JSON.stringify({
        provider,
        redirectUri,
        issuedAt: Date.now(),
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", this.stateSecret())
      .update(payload)
      .digest("base64url");
    return `v1.${payload}.${signature}`;
  }

  private verifyState(provider: ProviderKey, state?: string) {
    if (!state) {
      throw new BadRequestException("Missing OAuth state");
    }
    const [version, payload, signature] = state.split(".");
    if (version !== "v1" || !payload || !signature) {
      throw new BadRequestException("Invalid OAuth state");
    }

    const expectedSignature = createHmac("sha256", this.stateSecret())
      .update(payload)
      .digest("base64url");
    if (
      expectedSignature.length !== signature.length ||
      !timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(expectedSignature, "utf8"),
      )
    ) {
      throw new BadRequestException("Invalid OAuth state");
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      provider?: ProviderKey;
      redirectUri?: string;
      issuedAt?: number;
    };
    if (decoded.provider !== provider) {
      throw new BadRequestException("OAuth state provider mismatch");
    }
    if (!decoded.redirectUri) {
      throw new BadRequestException("OAuth state is incomplete");
    }
    this.normalizeRedirectUri(decoded.redirectUri);
    if (
      typeof decoded.issuedAt !== "number" ||
      Date.now() - decoded.issuedAt > 10 * 60 * 1000
    ) {
      throw new BadRequestException("OAuth state has expired");
    }
  }

  private stateSecret() {
    const secret =
      process.env.OAUTH_STATE_SECRET ??
      process.env.JWT_REFRESH_SECRET ??
      process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("OAUTH_STATE_SECRET (or JWT secrets) required in production");
      }
      return "dev-oauth-state-secret";
    }
    return secret;
  }
}
