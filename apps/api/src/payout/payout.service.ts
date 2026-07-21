import {
  BadRequestException,
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
  CreatePayoutMethodDto,
  CreatePayoutPeriodDto,
  CreateRevenueShareRuleDto,
  PayPayoutDto,
  UpdateRevenueShareRuleDto,
} from "./dto/payout.dto";

@Injectable()
export class PayoutService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ============================================================
  // Revenue share rules
  // ============================================================

  async listRules(organizationId: string) {
    return this.prisma.revenueShareRule.findMany({
      where: { organizationId },
      orderBy: [{ scope: "asc" }, { percent: "desc" }],
      take: 100,
    });
  }

  async createRule(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreateRevenueShareRuleDto,
  ) {
    const rule = await this.prisma.revenueShareRule.create({
      data: {
        organizationId: organization.id,
        scope: dto.scope,
        targetId: dto.targetId,
        percent: dto.percent,
        active: dto.active ?? true,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, user.id, "payout.rule_created", rule.id);
    return rule;
  }

  async updateRule(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    id: string,
    dto: UpdateRevenueShareRuleDto,
  ) {
    const rule = await this.prisma.revenueShareRule.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!rule) throw new NotFoundException("Rule not found");
    const updated = await this.prisma.revenueShareRule.update({
      where: { id: rule.id },
      data: { percent: dto.percent, active: dto.active },
    });
    await this.audit(organization.id, user.id, "payout.rule_updated", rule.id);
    return updated;
  }

  // ============================================================
  // Payout methods
  // ============================================================

  async listMethods(organizationId: string) {
    return this.prisma.payoutMethod.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async createMethod(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreatePayoutMethodDto,
  ) {
    const method = await this.prisma.payoutMethod.create({
      data: {
        organizationId: organization.id,
        beneficiaryType: dto.beneficiaryType,
        beneficiaryId: dto.beneficiaryId,
        type: dto.type,
        details: (dto.details ?? {}) as Prisma.InputJsonObject,
      },
    });
    await this.audit(
      organization.id,
      user.id,
      "payout.method_created",
      method.id,
    );
    return method;
  }

  // ============================================================
  // Payout periods
  // ============================================================

  async listPeriods(organizationId: string) {
    return this.prisma.payoutPeriod.findMany({
      where: { organizationId },
      orderBy: { periodStart: "desc" },
      include: { _count: { select: { payouts: true } } },
      take: 50,
    });
  }

  async createPeriod(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreatePayoutPeriodDto,
  ) {
    this.validatePeriodDates(dto.periodStart, dto.periodEnd);
    const period = await this.prisma.payoutPeriod.create({
      data: {
        organizationId: organization.id,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        currency: dto.currency ?? "USD",
        status: "OPEN",
      },
    });
    await this.audit(
      organization.id,
      user.id,
      "payout.period_created",
      period.id,
    );
    return period;
  }

  async computePeriod(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    periodId: string,
  ) {
    const period = await this.getPeriodOrThrow(organization, periodId);
    if (period.status !== "OPEN") {
      throw new BadRequestException("Only OPEN periods can be computed");
    }
    const rules = await this.prisma.revenueShareRule.findMany({
      where: { organizationId: organization.id, active: true },
    });
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: organization.id,
        createdAt: { gte: period.periodStart, lte: period.periodEnd },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      include: { items: true },
    });
    const aggregates = new Map<
      string,
      { grossAmount: number; currency: string; beneficiaryType: string; beneficiaryId: string }
    >();
    let total = 0;
    for (const order of orders) {
      const orderTotal = this.computeOrderTotal(order);
      if (orderTotal <= 0) continue;
      total += orderTotal;
      const primaryRule = rules.find(
        (r) => r.scope === "INSTRUCTOR" || r.scope === "COURSE",
      );
      if (primaryRule) {
        const share = Math.round((orderTotal * primaryRule.percent) / 100);
        const platform = orderTotal - share;
        const key = `INSTRUCTOR:${order.userId ?? "unknown"}`;
        const existing = aggregates.get(key) ?? {
          grossAmount: 0,
          currency: order.currency,
          beneficiaryType: "INSTRUCTOR",
          beneficiaryId: order.userId ?? "unknown",
        };
        existing.grossAmount += share;
        aggregates.set(key, existing);
        const platformKey = "PLATFORM:platform";
        const existingPlatform = aggregates.get(platformKey) ?? {
          grossAmount: 0,
          currency: order.currency,
          beneficiaryType: "PLATFORM",
          beneficiaryId: "platform",
        };
        existingPlatform.grossAmount += platform;
        aggregates.set(platformKey, existingPlatform);
      } else {
        const platformKey = "PLATFORM:platform";
        const existingPlatform = aggregates.get(platformKey) ?? {
          grossAmount: 0,
          currency: order.currency,
          beneficiaryType: "PLATFORM",
          beneficiaryId: "platform",
        };
        existingPlatform.grossAmount += orderTotal;
        aggregates.set(platformKey, existingPlatform);
      }
    }
    const payouts: Prisma.PayoutCreateManyInput[] = [];
    aggregates.forEach((agg) => {
      const fee = Math.round(agg.grossAmount * 0.02);
      payouts.push({
        organizationId: organization.id,
        periodId: period.id,
        beneficiaryType: agg.beneficiaryType as
          | "INSTRUCTOR"
          | "ORG"
          | "PLATFORM",
        beneficiaryId: agg.beneficiaryId,
        grossAmount: agg.grossAmount,
        feeAmount: fee,
        netAmount: agg.grossAmount - fee,
        currency: agg.currency,
        status: "PENDING",
      });
    });
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payout.deleteMany({
        where: { periodId: period.id, status: "PENDING" },
      });
      if (payouts.length > 0) {
        await tx.payout.createMany({ data: payouts });
      }
      return tx.payoutPeriod.update({
        where: { id: period.id },
        data: { totalAmount: total },
      });
    });
    await this.audit(
      organization.id,
      user.id,
      "payout.period_computed",
      period.id,
      { orderCount: orders.length, payoutCount: payouts.length, total },
    );
    return result;
  }

  async lockPeriod(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    periodId: string,
  ) {
    const period = await this.getPeriodOrThrow(organization, periodId);
    if (period.status !== "OPEN") {
      throw new BadRequestException("Only OPEN periods can be locked");
    }
    const updated = await this.prisma.payoutPeriod.update({
      where: { id: period.id },
      data: { status: "LOCKED", lockedAt: new Date() },
    });
    await this.audit(organization.id, user.id, "payout.period_locked", period.id);
    return updated;
  }

  async payPeriod(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    periodId: string,
    dto: PayPayoutDto,
  ) {
    const period = await this.getPeriodOrThrow(organization, periodId);
    if (period.status !== "LOCKED") {
      throw new BadRequestException("Only LOCKED periods can be paid");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payoutPeriod.update({
        where: { id: period.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await tx.payout.updateMany({
        where: { periodId: period.id, status: "PENDING" },
        data: { status: "PAID", reference: dto.reference, paidAt: new Date() },
      });
      return updated;
    });
    await this.audit(organization.id, user.id, "payout.period_paid", period.id);
    return result;
  }

  async listMyPayouts(organizationId: string, userId: string) {
    return this.prisma.payout.findMany({
      where: {
        organizationId,
        beneficiaryType: "INSTRUCTOR",
        beneficiaryId: userId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { period: { select: { id: true, periodStart: true, periodEnd: true } } },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private computeOrderTotal(order: {
    total?: number | null;
    items: { price: number }[];
  }): number {
    if (typeof order.total === "number") return order.total;
    return order.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  }

  private async getPeriodOrThrow(
    organization: OrganizationContext,
    periodId: string,
  ) {
    const period = await this.prisma.payoutPeriod.findFirst({
      where: { id: periodId, organizationId: organization.id },
    });
    if (!period) throw new NotFoundException("Payout period not found");
    return period;
  }

  private validatePeriodDates(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid period dates");
    }
    if (startDate >= endDate) {
      throw new BadRequestException("periodStart must be before periodEnd");
    }
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Payout",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
