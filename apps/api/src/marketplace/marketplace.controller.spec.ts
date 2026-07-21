import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MarketplaceController } from "./marketplace.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["admin"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const marketplace = {
    setCoursePricing: vi.fn().mockResolvedValue({ id: "c-1", isPaid: true, price: 99 }),
    createCoupon: vi.fn().mockResolvedValue({ id: "coupon-1", code: "SAVE10" }),
    listCoupons: vi.fn().mockResolvedValue([{ id: "coupon-1" }]),
    validateCoupon: vi.fn().mockResolvedValue({ id: "coupon-1", discountPercent: 10 }),
    createOrder: vi.fn().mockResolvedValue({ id: "order-1", total: 100 }),
    getOrder: vi.fn().mockResolvedValue({ id: "order-1", total: 100 }),
    getUserOrders: vi.fn().mockResolvedValue({ data: [{ id: "order-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    getAllOrders: vi.fn().mockResolvedValue({ data: [{ id: "order-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    confirmPayment: vi.fn().mockResolvedValue({ id: "pay-1", status: "PAID" }),
    approvePayment: vi.fn().mockResolvedValue({ id: "pay-1", status: "PAID" }),
    getPayments: vi.fn().mockResolvedValue({ data: [{ id: "pay-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    createPlan: vi.fn().mockResolvedValue({ id: "plan-1" }),
    listPlans: vi.fn().mockResolvedValue([{ id: "plan-1" }]),
    subscribe: vi.fn().mockResolvedValue({ id: "sub-1" }),
    getUserSubscription: vi.fn().mockResolvedValue([{ id: "sub-1" }]),
    ...overrides,
  };
  return { controller: new MarketplaceController(marketplace as any), marketplace };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("MarketplaceController", () => {
  it("sets pricing for a course", async () => {
    const { controller, marketplace } = setup();
    const result = await controller.setPricing(createRequest(), "c-1", { isPaid: true, price: 99 } as any);
    expect(marketplace.setCoursePricing).toHaveBeenCalledWith(org, "c-1", expect.objectContaining({ isPaid: true }));
    expect(result).toEqual({ data: { id: "c-1", isPaid: true, price: 99 } });
  });

  it("creates, lists, and validates coupons", async () => {
    const { controller, marketplace } = setup();
    const req = createRequest();

    const createResult = await controller.createCoupon(req, { code: "save10", discountPercent: 10 } as any);
    expect(marketplace.createCoupon).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ code: "save10" }));
    expect(createResult).toEqual({ data: { id: "coupon-1", code: "SAVE10" } });

    const listResult = await controller.listCoupons(req);
    expect(marketplace.listCoupons).toHaveBeenCalledWith(org);
    expect(listResult).toEqual({ data: [{ id: "coupon-1" }] });

    const validateResult = await controller.validateCoupon(req, { code: "SAVE10" } as any);
    expect(marketplace.validateCoupon).toHaveBeenCalledWith(org, "SAVE10", undefined);
    expect(validateResult).toEqual({ data: { id: "coupon-1", discountPercent: 10 } });
  });

  it("creates, retrieves, and lists orders for the user", async () => {
    const { controller, marketplace } = setup();
    const req = createRequest();

    const createResult = await controller.createOrder(req, { courseIds: ["c-1"] } as any);
    expect(marketplace.createOrder).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ courseIds: ["c-1"] }));
    expect(createResult).toEqual({ data: { id: "order-1", total: 100 } });

    const myOrders = await controller.myOrders(req, { page: 1 } as any);
    expect(marketplace.getUserOrders).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ page: 1 }));
    expect(myOrders).toEqual({ data: [{ id: "order-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });

    const single = await controller.getOrder(req, "order-1");
    expect(marketplace.getOrder).toHaveBeenCalledWith(org, "u-1", "order-1");
    expect(single).toEqual({ data: { id: "order-1", total: 100 } });
  });

  it("returns admin order listing (raw, not wrapped)", async () => {
    const { controller, marketplace } = setup();
    const req = createRequest();
    const result = await controller.allOrders(req, { page: 1 } as any);
    expect(marketplace.getAllOrders).toHaveBeenCalledWith(org, expect.objectContaining({ page: 1 }));
    expect(result).toEqual({ data: [{ id: "order-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it("confirms and approves payments and lists them", async () => {
    const { controller, marketplace } = setup();
    const req = createRequest();

    const confirmResult = await controller.confirmPayment(req, { paymentId: "pay-1" } as any);
    expect(marketplace.confirmPayment).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ paymentId: "pay-1" }));
    expect(confirmResult).toEqual({ data: { id: "pay-1", status: "PAID" } });

    const approveResult = await controller.approvePayment(req, { paymentId: "pay-1" } as any);
    expect(marketplace.approvePayment).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ paymentId: "pay-1" }));
    expect(approveResult).toEqual({ data: { id: "pay-1", status: "PAID" } });

    const allPayments = await controller.allPayments(req, { page: 1 } as any);
    expect(marketplace.getPayments).toHaveBeenCalledWith(org, expect.objectContaining({ page: 1 }));
    expect(allPayments).toEqual({ data: [{ id: "pay-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it("manages subscription plans and the user subscription", async () => {
    const { controller, marketplace } = setup();
    const req = createRequest();

    const created = await controller.createPlan(req, { name: "Pro", price: 10 } as any);
    expect(marketplace.createPlan).toHaveBeenCalledWith(org, expect.objectContaining({ name: "Pro" }));
    expect(created).toEqual({ data: { id: "plan-1" } });

    const list = await controller.listPlans(req);
    expect(marketplace.listPlans).toHaveBeenCalledWith(org);
    expect(list).toEqual({ data: [{ id: "plan-1" }] });

    const subscribed = await controller.subscribe(req, "plan-1");
    expect(marketplace.subscribe).toHaveBeenCalledWith(org, "u-1", "plan-1");
    expect(subscribed).toEqual({ data: { id: "sub-1" } });

    const mine = await controller.mySubscriptions(req);
    expect(marketplace.getUserSubscription).toHaveBeenCalledWith(org, "u-1");
    expect(mine).toEqual({ data: [{ id: "sub-1" }] });
  });

  it("propagates a not found error from the service", async () => {
    const { controller, marketplace } = setup({
      getOrder: vi.fn().mockRejectedValue(new NotFoundException("Order not found")),
    });
    await expect(controller.getOrder(createRequest(), "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("propagates a bad request error from the service", async () => {
    const { controller, marketplace } = setup({
      confirmPayment: vi.fn().mockRejectedValue(new BadRequestException("Payment is not pending")),
    });
    await expect(controller.confirmPayment(createRequest(), { paymentId: "pay-1" } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
