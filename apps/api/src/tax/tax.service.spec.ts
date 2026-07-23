import { describe,expect,it,vi } from "vitest";
import { TaxService } from "./tax.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: ["platform:admin"],
  isPlatformAdmin: true,
};
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "org_admin", isPlatformAdmin: true, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    taxRegion: {
      findMany: vi.fn().mockResolvedValue([{ id: "tr-1", code: "ID", name: "Indonesia", currency: "IDR", taxPercent: 11 }]),
      findUnique: vi.fn().mockResolvedValue({ id: "tr-1", code: "ID", name: "Indonesia", currency: "IDR", taxPercent: 11 }),
      createMany: vi.fn().mockResolvedValue({ count: 12 }),
    },
    taxRule: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "trule-1", ...data })),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "trule-1", ...data })),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue({
        id: "ord-1",
        organizationId: "org-a",
        currency: "IDR",
      }),
      update: vi.fn().mockResolvedValue({ id: "ord-1", currency: "USD" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...overrides,
  } as any;
  const provider = {
    computeTax: vi.fn().mockReturnValue({ taxAmount: 110, netAmount: 1000, grossAmount: 1110, lines: [] }),
  } as any;
  return { service: new TaxService(prisma, provider), prisma, provider };
}

describe("TaxService.listRegions", () => {
  it("returns existing regions without seeding", async () => {
    const { service, prisma } = setup();
    const result = await service.listRegions();
    expect(result).toHaveLength(1);
    expect(prisma.taxRegion.createMany).not.toHaveBeenCalled();
  });

  it("seeds default regions when table is empty", async () => {
    const { service, prisma } = setup({
      taxRegion: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: "tr-1", code: "ID" }]),
        createMany: vi.fn().mockResolvedValue({ count: 12 }),
      },
    });
    await service.listRegions();
    expect(prisma.taxRegion.createMany).toHaveBeenCalled();
  });
});

describe("TaxService.createRule", () => {
  it("creates a tax rule with audit log", async () => {
    const { service, prisma } = setup();
    const result = await service.createRule(org, user, {
      regionCode: "ID",
      rate: 11,
      type: "VAT",
      inclusive: false,
      active: true,
    } as any);
    expect(result.id).toBe("trule-1");
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

describe("TaxService.calculate", () => {
  it("delegates to provider and returns result", async () => {
    const { service, provider } = setup();
    const result = await service.calculate(org, user, {
      regionCode: "ID",
      subtotal: 1000,
      currency: "IDR",
      productType: "COURSE",
    } as any);
    expect(provider.computeTax).toHaveBeenCalled();
    expect(result.taxAmount).toBe(110);
  });
});

describe("TaxService.listRules", () => {
  it("returns rules scoped to organization", async () => {
    const { service, prisma } = setup({
      taxRule: {
        findMany: vi.fn().mockResolvedValue([{ id: "trule-1", organizationId: "org-a" }]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const result = await service.listRules("org-a");
    expect(result).toHaveLength(1);
    expect(prisma.taxRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a" } }),
    );
  });

  it("creates updates rules and order currency", async () => {
    const { service, prisma } = setup();
    await service.createRule(org, user as any, {
      regionCode: "ID",
      rate: 0.11,
      type: "VAT",
    } as any);
    prisma.taxRule.findFirst.mockResolvedValue({
      id: "trule-1",
      organizationId: "org-a",
    });
    await service.updateRule(org, user as any, "trule-1", {
      taxPercent: 12,
    } as any);
    prisma.order.findFirst = vi.fn().mockResolvedValue({
      id: "ord-1",
      organizationId: "org-a",
      currency: "IDR",
    });
    await service.updateOrderCurrency(org, user as any, "ord-1", {
      currency: "USD",
    } as any);
    expect(prisma.order.update).toHaveBeenCalled();
  });
});

