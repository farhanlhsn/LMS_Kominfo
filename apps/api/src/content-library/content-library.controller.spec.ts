import { describe,expect,it,vi } from "vitest";
import { ContentLibraryController } from "./content-library.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: ["content_library:manage"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "instructor", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const contentLibraryService = {
    list: vi.fn().mockResolvedValue([{ id: "li-1", title: "Item" }]),
    create: vi.fn().mockResolvedValue({ id: "li-1", title: "New" }),
    get: vi.fn().mockImplementation(async (_id: string, itemId: string) => ({ id: itemId, title: "Item" })),
    update: vi.fn().mockResolvedValue({ id: "li-1", title: "Updated" }),
    delete: vi.fn().mockResolvedValue({ id: "li-1", deletedAt: new Date() }),
    ...overrides,
  };
  return { controller: new ContentLibraryController(contentLibraryService as any), contentLibraryService };
}

describe("ContentLibraryController", () => {
  it("lists items with optional search and type filters", async () => {
    const { controller, contentLibraryService } = setup();
    const response = await controller.list(org, "needle", "pdf");
    expect(contentLibraryService.list).toHaveBeenCalledWith("org-a", { search: "needle", type: "pdf" });
    expect(response).toEqual([{ id: "li-1", title: "Item" }]);
  });

  it("creates an item and forwards the user id", async () => {
    const { controller, contentLibraryService } = setup();
    const response = await controller.create(org, user, { title: "New" } as any);
    expect(contentLibraryService.create).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ title: "New" }));
    expect(response).toEqual({ id: "li-1", title: "New" });
  });

  it("gets a single item by id", async () => {
    const { controller, contentLibraryService } = setup();
    const response = await controller.get(org, "li-1");
    expect(contentLibraryService.get).toHaveBeenCalledWith("org-a", "li-1");
    expect(response).toEqual({ id: "li-1", title: "Item" });
  });

  it("updates an item", async () => {
    const { controller, contentLibraryService } = setup();
    const response = await controller.update(org, "li-1", { title: "Updated" } as any);
    expect(contentLibraryService.update).toHaveBeenCalledWith("org-a", "li-1", expect.objectContaining({ title: "Updated" }));
    expect(response).toEqual({ id: "li-1", title: "Updated" });
  });

  it("soft deletes an item", async () => {
    const { controller, contentLibraryService } = setup();
    const response = await controller.delete(org, "li-1");
    expect(contentLibraryService.delete).toHaveBeenCalledWith("org-a", "li-1");
    expect(response).toEqual({ id: "li-1", deletedAt: expect.any(Date) });
  });

  it("propagates errors from the service", async () => {
    const { controller } = setup({
      get: vi.fn().mockRejectedValue(new Error("not found")),
    });
    await expect(controller.get(org, "missing")).rejects.toThrow("not found");
  });
});
