import { normalizePageLimit,pageMeta } from "@lms/shared";
import { BadRequestException,Inject,Injectable,NotFoundException } from "@nestjs/common";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import type { ApprovePaymentDto,ConfirmPaymentDto,CreateCouponDto,CreateOrderDto,CreateSubscriptionPlanDto,MarketplaceQueryDto,SetCoursePricingDto } from "./dto/marketplace.dto";

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  // ── Course Pricing ──────────────────────────────────

  async setCoursePricing(org: OrganizationContext, courseId: string, dto: SetCoursePricingDto) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new NotFoundException("Course not found");
    if (dto.isPaid && (!dto.price || dto.price < 0)) throw new BadRequestException("Paid courses must have a valid price");
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.isPaid !== undefined ? { isPaid: dto.isPaid } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
      },
    });
  }

  // ── Coupons ─────────────────────────────────────────

  async createCoupon(org: OrganizationContext, userId: string, dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { organizationId_code: { organizationId: org.id, code: dto.code } } });
    if (existing) throw new BadRequestException("Coupon code already exists");
    return this.prisma.coupon.create({
      data: {
        organizationId: org.id,
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountPercent: dto.discountPercent ?? 0,
        discountAmount: dto.discountAmount ?? 0,
        maxUses: dto.maxUses,
        courseId: dto.courseId,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        createdById: userId,
      },
    });
  }

  async listCoupons(org: OrganizationContext) {
    return this.prisma.coupon.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async validateCoupon(org: OrganizationContext, code: string, courseIds?: string[]) {
    const coupon = await this.prisma.coupon.findUnique({ where: { organizationId_code: { organizationId: org.id, code: code.toUpperCase() } } });
    if (!coupon) throw new NotFoundException("Invalid coupon code");
    if (!coupon.isActive) throw new BadRequestException("Coupon is no longer active");
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) throw new BadRequestException("Coupon usage limit exceeded");
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) throw new BadRequestException("Coupon is not yet valid");
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) throw new BadRequestException("Coupon has expired");
    if (coupon.courseId && courseIds && !courseIds.includes(coupon.courseId)) throw new BadRequestException("Coupon does not apply to selected courses");
    return coupon;
  }

  // ── Orders ──────────────────────────────────────────

  async createOrder(org: OrganizationContext, userId: string, dto: CreateOrderDto) {
    if (!dto.courseIds.length) throw new BadRequestException("At least one course is required");
    const courses = await this.prisma.course.findMany({ where: { id: { in: dto.courseIds }, organizationId: org.id, deletedAt: null } });
    if (courses.length !== dto.courseIds.length) throw new BadRequestException("Some courses were not found");

    const subtotal = courses.reduce((sum, c) => sum + (c.price ?? 0), 0);
    let discountAmount = 0;

    if (dto.couponCode) {
      const coupon = await this.validateCoupon(org, dto.couponCode, dto.courseIds);
      if (coupon.discountPercent > 0) discountAmount = Math.round(subtotal * (coupon.discountPercent / 100));
      else if (coupon.discountAmount && subtotal >= (coupon.minAmount ?? 0)) discountAmount = coupon.discountAmount;
      await this.prisma.coupon.update({ where: { id: coupon.id }, data: { currentUses: { increment: 1 } } });
    }

    const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
    const total = Math.max(0, subtotal - discountAmount);

    const currency = courses[0]?.currency ?? "IDR";
    return this.prisma.order.create({
      data: {
        organizationId: org.id,
        userId,
        orderNumber,
        subtotal,
        discountAmount,
        total,
        couponId: dto.couponCode ? (await this.prisma.coupon.findUnique({ where: { organizationId_code: { organizationId: org.id, code: dto.couponCode.toUpperCase() } } }))?.id : undefined,
        notes: dto.notes,
        items: { create: courses.map((c) => ({ courseId: c.id, price: c.price ?? 0, currency: c.currency })) },
        payments: {
          create: {
            organizationId: org.id,
            amount: total,
            currency,
            status: "PENDING",
            provider: "MANUAL",
          },
        },
      },
      include: { items: { include: { course: { select: { id: true, title: true, slug: true } } } }, payments: true },
    });
  }

  async getOrder(org: OrganizationContext, userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId: org.id, userId },
      include: { items: { include: { course: { select: { id: true, title: true, slug: true } } } }, payments: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async getUserOrders(org: OrganizationContext, userId: string, query: MarketplaceQueryDto) {
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const where: Record<string, unknown> = { organizationId: org.id, userId };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: where as any,
        include: { items: { include: { course: { select: { id: true, title: true, slug: true } } } }, _count: { select: { payments: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: where as any }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  async getAllOrders(org: OrganizationContext, query: MarketplaceQueryDto) {
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const where: Record<string, unknown> = { organizationId: org.id };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true, email: true } }, items: { include: { course: { select: { id: true, title: true, slug: true } } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: where as any }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  // ── Payments ────────────────────────────────────────

  async confirmPayment(org: OrganizationContext, userId: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: dto.paymentId,
        organizationId: org.id,
        order: { userId },
      },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "PENDING") throw new BadRequestException("Payment is not pending");
    // User proof → AWAITING_REVIEW; admin approvePayment sets PAID + enrolls.
    return this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        bankName: dto.bankName,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        proofImageUrl: dto.proofImageUrl,
        notes: dto.notes,
        status: "AWAITING_REVIEW",
      },
    });
  }

  async approvePayment(org: OrganizationContext, adminId: string, dto: ApprovePaymentDto) {
    const payment = await this.prisma.payment.findFirst({ where: { id: dto.paymentId, organizationId: org.id } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "AWAITING_REVIEW" && payment.status !== "PAID") {
      throw new BadRequestException("Payment must be awaiting review");
    }

    const updated = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: "PAID",
        paidAt: payment.paidAt ?? new Date(),
        confirmedById: adminId,
        confirmedAt: new Date(),
        notes: dto.notes,
      },
    });

    // Auto-enroll user in all courses from the order
    const order = await this.prisma.order.findFirst({
      where: { id: payment.orderId, organizationId: org.id },
      include: { items: true },
    });
    if (order) {
      for (const item of order.items) {
        await this.prisma.enrollment.upsert({
          where: { organizationId_courseId_userId: { organizationId: org.id, courseId: item.courseId, userId: order.userId } },
          update: { status: "ACTIVE" },
          create: { organizationId: org.id, courseId: item.courseId, userId: order.userId, status: "ACTIVE" },
        });
      }
      await this.prisma.order.update({ where: { id: order.id }, data: { status: "COMPLETED", paidAt: new Date() } });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: { organizationId: org.id, userId: adminId, action: "payment.approved", entityType: "payment", entityId: payment.id, metadata: { orderId: payment.orderId } },
    });

    return updated;
  }

  async getPayments(org: OrganizationContext, query: MarketplaceQueryDto) {
    const { page, limit, skip } = normalizePageLimit(query.page, query.limit);
    const where: Record<string, unknown> = { organizationId: org.id };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: where as any,
        include: { order: { include: { user: { select: { id: true, name: true, email: true } } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: where as any }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  // ── Subscription Plans ──────────────────────────────

  async createPlan(org: OrganizationContext, dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        organizationId: org.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? "IDR",
        interval: dto.interval as any ?? "MONTHLY",
        intervalCount: dto.intervalCount ?? 1,
        courseAccess: dto.courseAccess ?? "ALL",
        maxEnrollments: dto.maxEnrollments,
      },
    });
  }

  async listPlans(org: OrganizationContext) {
    return this.prisma.subscriptionPlan.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { price: "asc" },
      take: 50,
    });
  }

  async subscribe(org: OrganizationContext, userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: planId, organizationId: org.id, isActive: true } });
    if (!plan) throw new NotFoundException("Subscription plan not found");
    return this.prisma.userSubscription.upsert({
      where: { organizationId_userId_planId: { organizationId: org.id, userId, planId } },
      update: { status: "ACTIVE" },
      create: { organizationId: org.id, userId, planId, status: "ACTIVE" },
    });
  }

  async getUserSubscription(org: OrganizationContext, userId: string) {
    return this.prisma.userSubscription.findMany({
      where: { organizationId: org.id, userId, status: "ACTIVE" },
      include: { plan: true },
    });
  }
}
