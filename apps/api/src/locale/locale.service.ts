import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  UpdateLocalePreferenceDto,
  UpdateOrgLocalePreferenceDto,
} from "./dto/locale.dto";

const DEFAULT_LOCALE = "en";
const DEFAULT_FALLBACK = ["en"];

@Injectable()
export class LocaleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserPreference(organizationId: string, userId: string) {
    const preference = await this.prisma.userLocalePreference.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (preference) return preference;
    const org = await this.getOrgPreference(organizationId);
    return {
      organizationId,
      userId,
      locale: org?.defaultLocale ?? DEFAULT_LOCALE,
      timezone: "UTC",
      fallbackChain: org?.fallbackChain ?? DEFAULT_FALLBACK,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateUserPreference(
    organizationId: string,
    userId: string,
    dto: UpdateLocalePreferenceDto,
  ) {
    const existing = await this.prisma.userLocalePreference.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    const fallbackChain = this.normalizeFallback(
      dto.fallbackChain ?? (existing?.fallbackChain as string[] | undefined),
    );
    return this.prisma.userLocalePreference.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: {
        locale: dto.locale ?? existing?.locale ?? DEFAULT_LOCALE,
        timezone: dto.timezone ?? existing?.timezone ?? "UTC",
        fallbackChain: fallbackChain as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        userId,
        locale: dto.locale ?? DEFAULT_LOCALE,
        timezone: dto.timezone ?? "UTC",
        fallbackChain: fallbackChain as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getOrgPreference(organizationId: string) {
    const preference = await this.prisma.orgLocalePreference.findUnique({
      where: { organizationId },
    });
    return preference;
  }

  async updateOrgPreference(
    organization: OrganizationContext,
    userId: string,
    dto: UpdateOrgLocalePreferenceDto,
  ) {
    const existing = await this.prisma.orgLocalePreference.findUnique({
      where: { organizationId: organization.id },
    });
    const supportedLocales = this.normalizeFallback(
      dto.supportedLocales ??
        (existing?.supportedLocales as string[] | undefined) ??
        DEFAULT_FALLBACK,
    );
    const fallbackChain = this.normalizeFallback(
      dto.fallbackChain ??
        (existing?.fallbackChain as string[] | undefined) ??
        DEFAULT_FALLBACK,
    );
    const updated = await this.prisma.orgLocalePreference.upsert({
      where: { organizationId: organization.id },
      update: {
        defaultLocale: dto.defaultLocale ?? existing?.defaultLocale ?? DEFAULT_LOCALE,
        supportedLocales: supportedLocales as unknown as Prisma.InputJsonValue,
        fallbackChain: fallbackChain as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId: organization.id,
        defaultLocale: dto.defaultLocale ?? DEFAULT_LOCALE,
        supportedLocales: supportedLocales as unknown as Prisma.InputJsonValue,
        fallbackChain: fallbackChain as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit(organization.id, userId, "org_locale.updated", updated.id);
    return updated;
  }

  /**
   * Resolve the effective locale for a user, given the org preference and the
   * user's own overrides. Falls back through the chain until a supported
   * locale is found.
   */
  async resolveEffectiveLocale(organizationId: string, userId: string) {
    const [userPref, orgPref] = await Promise.all([
      this.prisma.userLocalePreference.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      }),
      this.prisma.orgLocalePreference.findUnique({ where: { organizationId } }),
    ]);
    const supportedLocales = this.normalizeFallback(
      (orgPref?.supportedLocales as string[] | undefined) ?? DEFAULT_FALLBACK,
    );
    const fallback = this.normalizeFallback(
      (userPref?.fallbackChain as string[] | undefined) ??
        (orgPref?.fallbackChain as string[] | undefined) ??
        DEFAULT_FALLBACK,
    );
    const candidate = userPref?.locale ?? orgPref?.defaultLocale ?? DEFAULT_LOCALE;
    const chain = [candidate, ...fallback.filter((code) => code !== candidate)];
    const resolved = chain.find((code) => supportedLocales.includes(code)) ?? candidate;
    return {
      locale: resolved,
      supportedLocales,
      fallbackChain: chain,
      timezone: userPref?.timezone ?? "UTC",
    };
  }

  private normalizeFallback(list: string[] | undefined): string[] {
    if (!list || list.length === 0) return DEFAULT_FALLBACK;
    const deduped: string[] = [];
    for (const item of list) {
      if (typeof item === "string" && item.length > 0 && !deduped.includes(item)) {
        deduped.push(item);
      }
    }
    return deduped.length ? deduped : DEFAULT_FALLBACK;
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Locale",
        entityId,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
  }
}
