import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { normalizePageLimit, pageMeta } from "@lms/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { UpdateBrandingDto, CreateSsoProviderDto, UpdateSsoProviderDto, UpdateLoginPolicyDto, CreateDomainDto, CreateApiKeyDto, CreateWebhookDto, EnterpriseQueryDto } from "./dto/enterprise.dto";
import * as crypto from "crypto";

@Injectable()
export class EnterpriseService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  private keyPrefix() { return "lms_" + crypto.randomBytes(4).toString("hex"); }

  private encryptionKey() {
    const secret = process.env.ENTERPRISE_SECRET_KEY;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("ENTERPRISE_SECRET_KEY is required in production");
      }
      // ponytail: dev-only fallback; set ENTERPRISE_SECRET_KEY before prod
      return crypto.createHash("sha256").update("dev-enterprise-secret").digest();
    }
    return crypto.createHash("sha256").update(secret).digest();
  }

  private encryptSecret(secret: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
  }

  // ── Branding ─────────────────────────────────────────

  private defaultBranding(name: string, slug: string) {
    return {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: "#2563eb",
      secondaryColor: "#0f172a",
      accentColor: "#22c55e",
      borderRadius: "0.75rem",
      name,
      slug,
    };
  }

  async getBranding(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        borderRadius: true,
      },
    });
    if (!organization) throw new NotFoundException("Organization not found");
    return { ...this.defaultBranding(organization.name, organization.slug), ...organization };
  }

  async updateBranding(orgId: string, dto: UpdateBrandingDto) {
    const current = await this.getBranding(orgId);
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { ...dto },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        borderRadius: true,
      },
    });
    return { ...current, ...updated };
  }

  // ── SSO Providers ────────────────────────────────────

  async listProviders(org: OrganizationContext) {
    return this.prisma.ssoProvider.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        type: true,
        name: true,
        issuer: true,
        enabled: true,
        callbackUrl: true,
        _count: { select: { identities: true, domains: true } },
      },
    });
  }

  async createProvider(org: OrganizationContext, dto: CreateSsoProviderDto) {
    return this.prisma.ssoProvider.create({
      data: {
        organizationId: org.id,
        type: dto.type as any,
        name: dto.name,
        issuer: dto.issuer,
        entityId: dto.entityId,
        clientId: dto.clientId,
        clientSecretEncrypted: dto.clientSecret
          ? this.encryptSecret(dto.clientSecret)
          : null,
        metadataUrl: dto.metadataUrl,
        callbackUrl: dto.callbackUrl ?? "",
        enabled: dto.enabled ?? false,
      },
      select: {
        id: true,
        type: true,
        name: true,
        issuer: true,
        enabled: true,
        callbackUrl: true,
      },
    });
  }

  async updateProvider(org: OrganizationContext, id: string, dto: UpdateSsoProviderDto) {
    const p = await this.prisma.ssoProvider.findFirst({ where: { id, organizationId: org.id } });
    if (!p) throw new NotFoundException("SSO provider not found");
    const { clientSecret, ...rest } = dto;
    return this.prisma.ssoProvider.update({
      where: { id },
      data: {
        ...rest,
        ...(clientSecret !== undefined
          ? { clientSecretEncrypted: clientSecret ? this.encryptSecret(clientSecret) : null }
          : {}),
      } as any,
      select: {
        id: true,
        type: true,
        name: true,
        issuer: true,
        enabled: true,
        callbackUrl: true,
      },
    });
  }

  async deleteProvider(org: OrganizationContext, id: string) {
    const p = await this.prisma.ssoProvider.findFirst({ where: { id, organizationId: org.id } });
    if (!p) throw new NotFoundException("SSO provider not found");
    await this.prisma.ssoProvider.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Login Policy ─────────────────────────────────────

  async getLoginPolicy(orgId: string) {
    return this.prisma.organizationLoginPolicy.findUnique({ where: { organizationId: orgId } });
  }

  async updateLoginPolicy(orgId: string, dto: UpdateLoginPolicyDto) {
    return this.prisma.organizationLoginPolicy.upsert({
      where: { organizationId: orgId },
      update: dto as any,
      create: { organizationId: orgId, ...dto } as any,
    });
  }

  // ── Domains ─────────────────────────────────────────

  async listDomains(org: OrganizationContext) {
    return this.prisma.organizationDomain.findMany({ where: { organizationId: org.id }, include: { ssoProvider: { select: { id: true, name: true } } } });
  }

  async createDomain(org: OrganizationContext, dto: CreateDomainDto) {
    const existing = await this.prisma.organizationDomain.findUnique({ where: { organizationId_domain: { organizationId: org.id, domain: dto.domain } } });
    if (existing) throw new BadRequestException("Domain already registered");
    return this.prisma.organizationDomain.create({
      data: { organizationId: org.id, domain: dto.domain, ssoProviderId: dto.ssoProviderId, enforceSso: dto.enforceSso ?? false, autoJoinEnabled: dto.autoJoinEnabled ?? false },
    });
  }

  async deleteDomain(org: OrganizationContext, id: string) {
    const d = await this.prisma.organizationDomain.findFirst({ where: { id, organizationId: org.id } });
    if (!d) throw new NotFoundException("Domain not found");
    await this.prisma.organizationDomain.delete({ where: { id } });
    return { deleted: true };
  }

  async verifyDomain(org: OrganizationContext, id: string) {
    const d = await this.prisma.organizationDomain.findFirst({ where: { id, organizationId: org.id } });
    if (!d) throw new NotFoundException("Domain not found");
    return this.prisma.organizationDomain.update({ where: { id }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date() } });
  }

  // ── API Keys ─────────────────────────────────────────

  async createApiKey(org: OrganizationContext, userId: string, dto: CreateApiKeyDto) {
    const key = this.keyPrefix() + "_" + crypto.randomBytes(24).toString("hex");
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId: org.id,
        name: dto.name,
        keyPrefix: key.slice(0, 12),
        keyHash: hash,
        scopes: dto.scopes ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById: userId,
      },
    });
    return { ...apiKey, rawKey: key }; // Return raw key only on creation
  }

  async listApiKeys(org: OrganizationContext) {
    return this.prisma.apiKey.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, keyPrefix: true, scopes: true, status: true, expiresAt: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async revokeApiKey(org: OrganizationContext, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, organizationId: org.id } });
    if (!key) throw new NotFoundException("API key not found");
    return this.prisma.apiKey.update({ where: { id }, data: { status: "REVOKED" } });
  }

  // ── Webhooks ─────────────────────────────────────────

  async createWebhook(org: OrganizationContext, userId: string, dto: CreateWebhookDto) {
    const rawSecret = crypto.randomBytes(24).toString("hex");
    const record = await this.prisma.webhookEndpoint.create({
      data: {
        organizationId: org.id,
        name: dto.name,
        url: dto.url,
        secret: this.encryptSecret(rawSecret),
        events: dto.events as any,
        retryCount: dto.retryCount ?? 3,
        timeoutMs: dto.timeoutMs ?? 5000,
        description: dto.description,
        createdById: userId,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        url: true,
        events: true,
        status: true,
        retryCount: true,
        timeoutMs: true,
        description: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { ...record, rawSecret };
  }

  async listWebhooks(org: OrganizationContext) {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteWebhook(org: OrganizationContext, id: string) {
    const w = await this.prisma.webhookEndpoint.findFirst({ where: { id, organizationId: org.id } });
    if (!w) throw new NotFoundException("Webhook not found");
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { deleted: true };
  }

  async getWebhookDeliveries(org: OrganizationContext, endpointId: string, query: EnterpriseQueryDto) {
    const ep = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId: org.id } });
    if (!ep) throw new NotFoundException("Webhook endpoint not found");
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { endpointId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where: { endpointId } }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }
}
