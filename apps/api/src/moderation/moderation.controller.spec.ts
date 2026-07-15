import { describe, expect, it, vi } from "vitest";
import {
  ModerationAdminController,
  ModerationController,
} from "./moderation.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Moderation controllers", () => {
  it("user report + admin list/update/actions", async () => {
    const service = {
      createReport: vi.fn().mockResolvedValue({ id: "r1" }),
      listReports: vi.fn().mockResolvedValue([]),
      updateReport: vi.fn().mockResolvedValue({ id: "r1" }),
      listActions: vi.fn().mockResolvedValue([]),
      createAction: vi.fn().mockResolvedValue({ id: "a1" }),
      listFlags: vi.fn().mockResolvedValue([]),
    };
    const userCtrl = new ModerationController(service as any);
    await userCtrl.report(org, user, { reason: "spam" } as any);

    const admin = new ModerationAdminController(service as any);
    await admin.listReports(org, {} as any);
    await admin.updateReport(org, user, "r1", { status: "RESOLVED" } as any);
    await admin.listActions(org);
    await admin.createAction(org, user, { type: "WARN" } as any);
    await admin.listFlags(org);
    expect(service.listFlags).toHaveBeenCalled();
  });
});
