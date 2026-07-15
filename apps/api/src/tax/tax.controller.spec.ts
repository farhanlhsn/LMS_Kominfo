import { describe, expect, it, vi } from "vitest";
import { AdminTaxController, TaxController } from "./tax.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Tax controllers", () => {
  it("public tax endpoints", async () => {
    const service = {
      listRegions: vi.fn().mockResolvedValue([]),
      calculate: vi.fn().mockResolvedValue({ tax: 0 }),
    };
    const controller = new TaxController(service as any);
    await controller.listRegions();
    await controller.calculate(org, user, { amount: 100 } as any);
    expect(service.calculate).toHaveBeenCalled();
  });

  it("admin tax endpoints", async () => {
    const service = {
      listRules: vi.fn().mockResolvedValue([]),
      createRule: vi.fn().mockResolvedValue({ id: "r1" }),
      updateRule: vi.fn().mockResolvedValue({ id: "r1" }),
      updateOrderCurrency: vi.fn().mockResolvedValue({ id: "o1" }),
    };
    const admin = new AdminTaxController(service as any);
    await admin.listRules(org);
    await admin.createRule(org, user, { region: "ID", rate: 0.11 } as any);
    await admin.updateRule(org, user, "r1", { rate: 0.12 } as any);
    await admin.updateOrderCurrency(org, user, "o1", {
      currency: "USD",
    } as any);
    expect(service.updateOrderCurrency).toHaveBeenCalled();
  });
});
