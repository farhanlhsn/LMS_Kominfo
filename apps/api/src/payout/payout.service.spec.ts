import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PayoutService } from "./payout.service";

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
    revenueShareRule: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "rule-1", ...data })),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "rule-1", ...data })),
    },
    payoutMethod: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "pm-1", ...data })),
    },
    payoutPeriod: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "pp-1", ...data, status: "OPEN" })),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "pp-1", ...data })),
    },
    payoutItem: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    payout: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    order: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation((fn: any) => fn(prisma)),
    ...overrides,
  } as any;
  return { service: new PayoutService(prisma), prisma };
}

describe("PayoutService.createRule", () => {
  it("creates a revenue share rule with audit log", async () => {
    const { service, prisma } = setup();
    const result = await service.createRule(org, user, {
      scope: "GLOBAL",
      percent: 30,
      active: true,
    } as any);
    expect(result.id).toBe("rule-1");
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});

describe("PayoutService.listRules", () => {
  it("returns rules scoped to organization", async () => {
    const { service, prisma } = setup({
      revenueShareRule: { findMany: vi.fn().mockResolvedValue([{ id: "rule-1", organizationId: "org-a" }]) },
    });
    const result = await service.listRules("org-a");
    expect(prisma.revenueShareRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a" } }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("PayoutService.lockPeriod", () => {
  it("throws when period not found", async () => {
    const { service } = setup();
    await expect(service.lockPeriod(org, user, "missing-id")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws when period is not in COMPUTED state", async () => {
    const { service } = setup({
      payoutPeriod: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: "pp-1", organizationId: "org-a", status: "LOCKED" }),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
    });
    await expect(service.lockPeriod(org, user, "pp-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("PayoutService.listMyPayouts", () => {
  it("returns payouts for the current user scoped to organization", async () => {
    const { service, prisma } = setup({
      payout: {
        findMany: vi.fn().mockResolvedValue([{ id: "pi-1", beneficiaryId: "u-1" }]),
      },
    });
    const result = await service.listMyPayouts("org-a", "u-1");
    expect(prisma.payout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a", beneficiaryId: "u-1" }),
      }),
    );
    expect(result).toHaveLength(1);
  });
});
