import { describe, expect, it, vi } from "vitest";
import { CodeRunnerController } from "./code-runner.controller";

describe("CodeRunnerController", () => {
  it("execute judge list and get", async () => {
    const service = {
      execute: vi.fn().mockResolvedValue({ id: "e1" }),
      judge: vi.fn().mockResolvedValue({ status: "PASSED" }),
      listSubmissions: vi.fn().mockResolvedValue([]),
      getExecution: vi.fn().mockResolvedValue({ id: "e1" }),
    };
    const controller = new CodeRunnerController(service as any);
    const org = {
      id: "org-1",
      roleKeys: ["learner"],
    } as any;
    const staff = {
      id: "org-1",
      roleKeys: ["instructor"],
    } as any;
    const user = { id: "u1" } as any;

    await controller.execute(org, user, {
      language: "PYTHON",
      code: "print(1)",
    } as any);
    await controller.judge(org, user, {
      assignmentId: "a1",
      language: "PYTHON",
      code: "print(1)",
      testCases: [],
    } as any);
    await controller.listSubmissions(org, user, "a1", "other");
    expect(service.listSubmissions).toHaveBeenCalledWith("org-1", {
      assignmentId: "a1",
      userId: "u1",
    });
    await controller.listSubmissions(staff, user, "a1", "other");
    expect(service.listSubmissions).toHaveBeenLastCalledWith("org-1", {
      assignmentId: "a1",
      userId: "other",
    });
    await controller.getExecution(org, "e1");
    expect(service.getExecution).toHaveBeenCalledWith("org-1", "e1");
  });
});
