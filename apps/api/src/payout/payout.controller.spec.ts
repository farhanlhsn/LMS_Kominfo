import { describe, expect, it, vi } from "vitest";
import {
  AdminPayoutController,
  PayoutsController,
} from "./payout.controller";

const org = { id: "org-a" } as any;
const user = { id: "u1" } as any;

describe("Payout controllers", () => {
  it("admin endpoints delegate to service", async () => {
    const service = {
      listRules: vi.fn().mockResolvedValue([]),
      createRule: vi.fn().mockResolvedValue({ id: "r" }),
      updateRule: vi.fn().mockResolvedValue({ id: "r" }),
      listMethods: vi.fn().mockResolvedValue([]),
      createMethod: vi.fn().mockResolvedValue({ id: "m" }),
      listPeriods: vi.fn().mockResolvedValue([]),
      createPeriod: vi.fn().mockResolvedValue({ id: "p" }),
      computePeriod: vi.fn().mockResolvedValue({ id: "p" }),
      lockPeriod: vi.fn().mockResolvedValue({ id: "p" }),
      payPeriod: vi.fn().mockResolvedValue({ id: "p" }),
    };
    const admin = new AdminPayoutController(service as any);
    await admin.listRules(org);
    await admin.createRule(org, user, { scope: "GLOBAL", percent: 10 } as any);
    await admin.updateRule(org, user, "r1", { percent: 20 } as any);
    await admin.listMethods(org);
    await admin.createMethod(org, user, {
      beneficiaryType: "USER",
      beneficiaryId: "u1",
      type: "BANK",
    } as any);
    await admin.listPeriods(org);
    await admin.createPeriod(org, user, {
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    } as any);
    await admin.computePeriod(org, user, "p1");
    await admin.lockPeriod(org, user, "p1");
    await admin.payPeriod(org, user, "p1", {} as any);
    expect(service.payPeriod).toHaveBeenCalled();
  });

  it("learner me endpoint", async () => {
    const service = {
      listMyPayouts: vi.fn().mockResolvedValue([]),
    };
    const controller = new PayoutsController(service as any);
    await controller.listMine(org, user);
    expect(service.listMyPayouts).toHaveBeenCalledWith("org-a", "u1");
  });
});
