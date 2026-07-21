import { describe, expect, it, vi } from "vitest";
import {
  AdminLocaleController,
  LocaleController,
} from "./locale.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Locale controllers", () => {
  it("user locale endpoints", async () => {
    const service = {
      getUserPreference: vi.fn().mockResolvedValue({ locale: "en" }),
      updateUserPreference: vi.fn().mockResolvedValue({ locale: "id" }),
      resolveEffectiveLocale: vi.fn().mockResolvedValue({ locale: "en" }),
    };
    const controller = new LocaleController(service as any);
    await controller.preference(org, user);
    await controller.update(org, user, { locale: "id" } as any);
    await controller.resolve(org, user);
    expect(service.resolveEffectiveLocale).toHaveBeenCalled();
  });

  it("admin locale endpoints", async () => {
    const service = {
      getOrgPreference: vi.fn().mockResolvedValue({ locale: "en" }),
      updateOrgPreference: vi.fn().mockResolvedValue({ locale: "id" }),
    };
    const admin = new AdminLocaleController(service as any);
    await admin.get(org);
    await admin.update(org, user, { locale: "id" } as any);
    expect(service.updateOrgPreference).toHaveBeenCalled();
  });
});

