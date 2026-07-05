import { NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { MarketplaceService } from "./marketplace.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a", deletedAt: null, price: 100000, currency: "IDR" }), findMany: vi.fn().mockResolvedValue([{ id: "course-a", price: 100000, currency: "IDR" }]), update: vi.fn() },
    coupon: { findUnique: vi.fn().mockResolvedValue({ id: "coup-a", code: "DISKON10", discountPercent: 10, discountAmount: null, maxUses: 100, currentUses: 0, minAmount: 0, courseId: null, isActive: true, validFrom: null, validUntil: null }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), create: vi.fn().mockResolvedValue({ id: "coup-a" }) },
    order: { create: vi.fn().mockResolvedValue({ id: "ord-a", orderNumber: "ORD-TEST", subtotal: 100000, total: 90000 }), findFirst: vi.fn().mockResolvedValue({ id: "ord-a", organizationId: "org-a", userId: "user-a", status: "PENDING", items: [{ courseId: "course-a" }] }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), count: vi.fn().mockResolvedValue(1) },
    orderItem: { create: vi.fn() },
    payment: { findFirst: vi.fn().mockResolvedValue({ id: "pay-a", organizationId: "org-a", orderId: "ord-a", status: "PAID" }), update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    enrollment: { upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    subscriptionPlan: { create: vi.fn().mockResolvedValue({ id: "plan-a" }), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "plan-a", organizationId: "org-a", isActive: true }) },
    userSubscription: { upsert: vi.fn().mockResolvedValue({ id: "sub-a" }), findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };
  return { service: new MarketplaceService(prisma as never), prisma };
}

describe("MarketplaceService", () => {
  describe("setCoursePricing", () => {
    it("updates course pricing", async () => {
      const { service, prisma } = setup();
      await service.setCoursePricing(org, "course-a", { isPaid: true, price: 150000 });
      expect(prisma.course.update).toHaveBeenCalled();
    });

    it("rejects pricing for non-existent course", async () => {
      const { service, prisma } = setup({ course: { findFirst: vi.fn().mockResolvedValue(null) } });
      await expect(service.setCoursePricing(org, "course-x", { isPaid: true, price: 100 })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("createOrder", () => {
    it("creates order with discount from coupon", async () => {
      const { service, prisma } = setup();
      const result = await service.createOrder(org, "user-a", { courseIds: ["course-a"], couponCode: "DISKON10" });
      expect(prisma.order.create).toHaveBeenCalled();
    });

    it("rejects order with empty course list", async () => {
      const { service } = setup();
      await expect(service.createOrder(org, "user-a", { courseIds: [] })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("approvePayment", () => {
    it("approves payment and auto-enrolls user", async () => {
      const { service, prisma } = setup();
      await service.approvePayment(org, "admin-a", { paymentId: "pay-a" });
      expect(prisma.enrollment.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe("Subscription", () => {
    it("creates subscription plan", async () => {
      const { service, prisma } = setup();
      await service.createPlan(org, { name: "Monthly Pro", price: 50000 });
      expect(prisma.subscriptionPlan.create).toHaveBeenCalled();
    });

    it("subscribes user to a plan", async () => {
      const { service, prisma } = setup();
      await service.subscribe(org, "user-a", "plan-a");
      expect(prisma.userSubscription.upsert).toHaveBeenCalled();
    });
  });
});
