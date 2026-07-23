import { describe,expect,it,vi } from "vitest";
import { ActivityContentController } from "./activity-content.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: ["courses:update"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    updateActivityContent: vi.fn().mockResolvedValue({ id: "ac-1", body: { text: "hi" } }),
    attachFile: vi.fn().mockResolvedValue({ id: "ac-2", fileId: "f-1" }),
    attachLibraryItem: vi.fn().mockResolvedValue({ id: "ac-3", fileId: "f-2" }),
    reprocessContent: vi.fn().mockResolvedValue({ jobId: "job-1" }),
    getLearningContent: vi.fn().mockResolvedValue({ activity: { id: "act-1" }, content: null, fileAccess: null, plugin: null }),
    updateVideoProgress: vi.fn().mockResolvedValue({ id: "ap-1", status: "IN_PROGRESS" }),
    ...overrides,
  };
  return { controller: new ActivityContentController(service as any), service };
}

describe("ActivityContentController", () => {
  it("forwards updateContent to the service", async () => {
    const { controller, service } = setup();
    const response = await controller.updateContent(org, user, "act-1", { textContent: "hello" } as any);
    expect(service.updateActivityContent).toHaveBeenCalledWith(org, "u-1", "act-1", expect.objectContaining({ textContent: "hello" }));
    expect(response).toEqual({ id: "ac-1", body: { text: "hi" } });
  });

  it("forwards attachFile to the service", async () => {
    const { controller, service } = setup();
    const response = await controller.attachFile(org, user, "act-1", { fileId: "f-1" } as any);
    expect(service.attachFile).toHaveBeenCalledWith(org, "u-1", "act-1", expect.objectContaining({ fileId: "f-1" }));
    expect(response).toEqual({ id: "ac-2", fileId: "f-1" });
  });

  it("forwards attachLibraryItem to the service", async () => {
    const { controller, service } = setup();
    const response = await controller.attachLibraryItem(org, user, "act-1", { libraryItemId: "li-1" } as any);
    expect(service.attachLibraryItem).toHaveBeenCalledWith(org, "u-1", "act-1", expect.objectContaining({ libraryItemId: "li-1" }));
    expect(response).toEqual({ id: "ac-3", fileId: "f-2" });
  });

  it("forwards reprocess to the service", async () => {
    const { controller, service } = setup();
    const response = await controller.reprocess(org, user, "act-1", { reason: "manual" } as any);
    expect(service.reprocessContent).toHaveBeenCalledWith(org, "u-1", "act-1", expect.objectContaining({ reason: "manual" }));
    expect(response).toEqual({ jobId: "job-1" });
  });

  it("returns learning content for the learner", async () => {
    const { controller, service } = setup();
    const response = await controller.getLearningContent(org, user, "act-1");
    expect(service.getLearningContent).toHaveBeenCalledWith(org, "u-1", "act-1");
    expect(response).toEqual({ activity: { id: "act-1" }, content: null, fileAccess: null, plugin: null });
  });

  it("forwards updateVideoProgress to the service", async () => {
    const { controller, service } = setup();
    const response = await controller.updateVideoProgress(org, user, "act-1", { currentTimeSeconds: 10, durationSeconds: 100 } as any);
    expect(service.updateVideoProgress).toHaveBeenCalledWith(org, "u-1", "act-1", expect.objectContaining({ currentTimeSeconds: 10, durationSeconds: 100 }));
    expect(response).toEqual({ id: "ap-1", status: "IN_PROGRESS" });
  });

  it("propagates service errors", async () => {
    const { controller } = setup({
      updateActivityContent: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(controller.updateContent(org, user, "act-1", {} as any)).rejects.toThrow("boom");
  });
});
