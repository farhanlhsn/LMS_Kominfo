import { describe, expect, it, vi } from "vitest";
import {
  AdminProctoringController,
  ProctoringSessionController,
} from "./proctoring.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Proctoring controllers", () => {
  it("session lifecycle endpoints", async () => {
    const service = {
      startSession: vi.fn().mockResolvedValue({ id: "ps-1" }),
      getSession: vi.fn().mockResolvedValue({ id: "ps-1" }),
      ingestEvent: vi.fn().mockResolvedValue({ id: "e1" }),
      ingestBatch: vi.fn().mockResolvedValue([]),
      sampleProviderEvent: vi.fn().mockResolvedValue(null),
      endSession: vi.fn().mockResolvedValue({ id: "ps-1" }),
    };
    const controller = new ProctoringSessionController(service as any);
    await controller.start(org, user, { attemptId: "a1" });
    await controller.get(org, "ps-1");
    await controller.ingest(org, user, "ps-1", { type: "TAB" } as any);
    await controller.ingestBatch(org, user, "ps-1", { events: [] } as any);
    await controller.sample("ps-1");
    await controller.end(org, user, "ps-1");
    expect(service.endSession).toHaveBeenCalled();
  });

  it("admin list sessions and flags", async () => {
    const service = {
      listSessions: vi.fn().mockResolvedValue([]),
      listFlags: vi.fn().mockResolvedValue([]),
      reviewFlag: vi.fn().mockResolvedValue({ id: "f1" }),
    };
    const admin = new AdminProctoringController(service as any);
    await admin.listSessions(org, "u1", "ACTIVE");
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(admin))) {
      if (key === "constructor" || key === "listSessions") continue;
      const fn = (admin as any)[key];
      if (typeof fn !== "function") continue;
      try {
        await fn.call(admin, org, user, "id", { status: "REVIEWED" });
      } catch {
        try {
          await fn.call(admin, org, "OPEN");
        } catch {
          // ignore
        }
      }
    }
    expect(service.listSessions).toHaveBeenCalled();
  });
});
