import { NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { GoalsController } from "./goals.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["learner"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "learner", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    list: vi.fn().mockResolvedValue([{ id: "g-1", title: "Finish course" }]),
    create: vi.fn().mockResolvedValue({ id: "g-1", title: "Finish course" }),
    update: vi.fn().mockResolvedValue({ id: "g-1", title: "Updated" }),
    delete: vi.fn().mockResolvedValue({ id: "g-1", status: "CANCELLED" }),
    complete: vi.fn().mockResolvedValue({ id: "g-1", status: "COMPLETED", completedAt: new Date() }),
    ...overrides,
  };
  return { controller: new GoalsController(service as any), service };
}

describe("GoalsController", () => {
  it("lists the learner's goals", async () => {
    const { controller, service } = setup();
    const response = await controller.list(org, user);
    expect(service.list).toHaveBeenCalledWith("org-a", "u-1");
    expect(response).toEqual([{ id: "g-1", title: "Finish course" }]);
  });

  it("creates a new goal for the learner", async () => {
    const { controller, service } = setup();
    const dto = { title: "Finish course", targetType: "COURSE_COMPLETION" } as any;
    const response = await controller.create(org, user, dto);
    expect(service.create).toHaveBeenCalledWith("org-a", "u-1", dto);
    expect(response).toEqual({ id: "g-1", title: "Finish course" });
  });

  it("updates a goal by id", async () => {
    const { controller, service } = setup();
    const dto = { title: "Updated" } as any;
    const response = await controller.update(org, user, "g-1", dto);
    expect(service.update).toHaveBeenCalledWith("org-a", "u-1", "g-1", dto);
    expect(response).toEqual({ id: "g-1", title: "Updated" });
  });

  it("cancels a goal via the delete endpoint", async () => {
    const { controller, service } = setup();
    const response = await controller.delete(org, user, "g-1");
    expect(service.delete).toHaveBeenCalledWith("org-a", "u-1", "g-1");
    expect(response).toEqual({ id: "g-1", status: "CANCELLED" });
  });

  it("marks a goal as completed", async () => {
    const { controller, service } = setup();
    const response = await controller.complete(org, user, "g-1");
    expect(service.complete).toHaveBeenCalledWith("org-a", "u-1", "g-1");
    expect(response).toEqual({ id: "g-1", status: "COMPLETED", completedAt: expect.any(Date) });
  });

  it("propagates not found exceptions from the service", async () => {
    const { controller } = setup({
      update: vi.fn().mockRejectedValue(new NotFoundException("Learning goal not found")),
    });
    await expect(controller.update(org, user, "missing", { title: "x" } as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
