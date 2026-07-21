import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  CalculateTaxDto,
  CreateTaxRuleDto,
  UpdateOrderCurrencyDto,
  UpdateTaxRuleDto,
} from "./dto/tax.dto";
import { SUPPORTED_CURRENCIES, TAX_PROVIDER, TaxProvider } from "./tax.provider";

const DEFAULT_REGIONS = [
  { code: "US-CA", name: "California (US)", currency: "USD", taxPercent: 8.5 },
  { code: "US-NY", name: "New York (US)", currency: "USD", taxPercent: 8.875 },
  { code: "EU-DE", name: "Germany (EU)", currency: "EUR", taxPercent: 19 },
  { code: "EU-FR", name: "France (EU)", currency: "EUR", taxPercent: 20 },
  { code: "GB", name: "United Kingdom", currency: "GBP", taxPercent: 20 },
  { code: "ID", name: "Indonesia", currency: "IDR", taxPercent: 11 },
  { code: "SG", name: "Singapore", currency: "SGD", taxPercent: 8 },
  { code: "MY", name: "Malaysia", currency: "MYR", taxPercent: 6 },
  { code: "AU", name: "Australia", currency: "AUD", taxPercent: 10 },
  { code: "JP", name: "Japan", currency: "JPY", taxPercent: 10 },
  { code: "IN", name: "India", currency: "INR", taxPercent: 18 },
  { code: "BR", name: "Brazil", currency: "BRL", taxPercent: 17 },
] as const;

@Injectable()
export class TaxService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TAX_PROVIDER) private readonly provider: TaxProvider,
  ) {}

  async listRegions() {
    const existing = await this.prisma.taxRegion.findMany({
      orderBy: { code: "asc" },
    });
    if (existing.length > 0) return existing;
    await this.prisma.taxRegion.createMany({
      data: DEFAULT_REGIONS.map((r) => ({ ...r })),
    });
    return this.prisma.taxRegion.findMany({ orderBy: { code: "asc" } });
  }

  async listRules(organizationId: string) {
    return this.prisma.taxRule.findMany({
      where: { organizationId },
      include: { region: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createRule(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreateTaxRuleDto,
  ) {
    const region = await this.prisma.taxRegion.findUnique({
      where: { code: dto.regionCode },
    });
    if (!region) throw new NotFoundException("Tax region not found");
    const rule = await this.prisma.taxRule.create({
      data: {
        organizationId: organization.id,
        regionCode: dto.regionCode,
        rate: dto.rate,
        type: dto.type,
        inclusive: dto.inclusive ?? false,
        active: dto.active ?? true,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, user.id, "tax.rule_created", rule.id);
    return rule;
  }

  async updateRule(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    id: string,
    dto: UpdateTaxRuleDto,
  ) {
    const rule = await this.prisma.taxRule.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!rule) throw new NotFoundException("Tax rule not found");
    const updated = await this.prisma.taxRule.update({
      where: { id: rule.id },
      data: {
        rate: dto.rate,
        inclusive: dto.inclusive,
        active: dto.active,
      },
    });
    await this.audit(organization.id, user.id, "tax.rule_updated", rule.id);
    return updated;
  }

  async calculate(
    organization: OrganizationContext,
    user: AuthenticatedUser | null,
    dto: CalculateTaxDto,
  ) {
    if (!SUPPORTED_CURRENCIES.includes(dto.currency as never)) {
      throw new NotFoundException("Unsupported currency");
    }
    const region = await this.prisma.taxRegion.findUnique({
      where: { code: dto.regionCode },
    });
    if (!region) throw new NotFoundException("Tax region not found");
    const rules = await this.prisma.taxRule.findMany({
      where: {
        organizationId: organization.id,
        regionCode: dto.regionCode,
        active: true,
      },
    });
    const breakdown = this.provider.computeTax(
      dto.subtotal,
      rules.map((rule) => ({
        rate: rule.rate,
        inclusive: rule.inclusive,
        type: rule.type,
      })),
    );
    return { ...breakdown, currency: dto.currency, regionCode: dto.regionCode };
  }

  async updateOrderCurrency(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    orderId: string,
    dto: UpdateOrderCurrencyDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId: organization.id },
    });
    if (!order) throw new NotFoundException("Order not found");
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { currency: dto.currency },
    });
    await this.audit(
      organization.id,
      user.id,
      "tax.order_currency_updated",
      order.id,
    );
    return updated;
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
        entityType: "Tax",
        entityId,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
  }
}
