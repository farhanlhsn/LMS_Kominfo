import { describe, expect, it, vi } from "vitest";
import { PopoutController } from "./popout.controller";

describe("PopoutController", () => {
  it("issue validate revoke", async () => {
    const service = {
      issueToken: vi.fn().mockResolvedValue({ token: "t1" }),
      validateToken: vi.fn().mockResolvedValue({ valid: true }),
      revokeToken: vi.fn().mockResolvedValue({ revoked: true }),
    };
    const controller = new PopoutController(service as any);
    const org = { id: "org-1" } as any;
    const user = { id: "u1" } as any;
    await controller.issue(org, user, { lessonId: "l1", ttlMs: 1000 } as any);
    await controller.validate("t1");
    await controller.revoke(org, user, "t1");
    expect(service.revokeToken).toHaveBeenCalledWith("org-1", "u1", "t1");
  });
});
