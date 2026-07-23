import { BadRequestException,NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { FilesController } from "./files.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["admin"], permissionKeys: ["files:read", "files:create", "files:delete", "files:update"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const files = {
    upload: vi.fn().mockResolvedValue({ id: "file-1", filename: "doc.pdf" }),
    list: vi.fn().mockResolvedValue({ data: [{ id: "file-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    get: vi.fn().mockResolvedValue({ id: "file-1" }),
    delete: vi.fn().mockResolvedValue({ id: "file-1", deletedAt: new Date() }),
    signedUrl: vi.fn().mockResolvedValue({ url: "https://signed", expiresInSeconds: 300 }),
    listFolders: vi.fn().mockResolvedValue([{ id: "f-1", name: "Root" }]),
    createFolder: vi.fn().mockResolvedValue({ id: "f-1", name: "New" }),
    updateFolder: vi.fn().mockResolvedValue({ id: "f-1", name: "Renamed" }),
    deleteFolder: vi.fn().mockResolvedValue({ id: "f-1", deletedAt: new Date() }),
    ...overrides,
  };
  return { controller: new FilesController(files as any), files };
}

const fakeFile = {
  fieldname: "file",
  originalname: "doc.pdf",
  encoding: "7bit",
  mimetype: "application/pdf",
  size: 1024,
  buffer: Buffer.from("data"),
} as Express.Multer.File;

describe("FilesController", () => {
  it("uploads a file for the current user", async () => {
    const { controller, files } = setup();
    const response = await controller.upload(org, user, fakeFile, { purpose: "DOCUMENT" } as any);
    expect(files.upload).toHaveBeenCalledWith(org, user, fakeFile, expect.objectContaining({ purpose: "DOCUMENT" }));
    expect(response).toEqual({ id: "file-1", filename: "doc.pdf" });
  });

  it("lists files using the query and forwards the org id", async () => {
    const { controller, files } = setup();
    const response = await controller.list(org, { page: 1, limit: 20 } as any);
    expect(files.list).toHaveBeenCalledWith("org-a", expect.objectContaining({ page: 1, limit: 20 }));
    expect(response).toEqual({ data: [{ id: "file-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it("retrieves a single file with the user id for access checks", async () => {
    const { controller, files } = setup();
    const response = await controller.get(org, user, "file-1");
    expect(files.get).toHaveBeenCalledWith(org, "u-1", "file-1");
    expect(response).toEqual({ id: "file-1" });
  });

  it("deletes a file by id", async () => {
    const { controller, files } = setup();
    const response = await controller.delete(org, user, "file-1");
    expect(files.delete).toHaveBeenCalledWith(org, "u-1", "file-1");
    expect(response).toEqual({ id: "file-1", deletedAt: expect.any(Date) });
  });

  it("generates a signed URL for a file", async () => {
    const { controller, files } = setup();
    const response = await controller.signedUrl(org, user, "file-1", { expiresInSeconds: 600 } as any);
    expect(files.signedUrl).toHaveBeenCalledWith(org, "u-1", "file-1", expect.objectContaining({ expiresInSeconds: 600 }));
    expect(response).toEqual({ url: "https://signed", expiresInSeconds: 300 });
  });

  it("lists folders within the active organization", async () => {
    const { controller, files } = setup();
    const response = await controller.folders(org);
    expect(files.listFolders).toHaveBeenCalledWith("org-a");
    expect(response).toEqual([{ id: "f-1", name: "Root" }]);
  });

  it("creates, updates, and deletes folders", async () => {
    const { controller, files } = setup();
    await controller.createFolder(org, user, { name: "New" } as any);
    expect(files.createFolder).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ name: "New" }));

    await controller.updateFolder(org, "f-1", { name: "Renamed" } as any);
    expect(files.updateFolder).toHaveBeenCalledWith("org-a", "f-1", expect.objectContaining({ name: "Renamed" }));

    await controller.deleteFolder(org, "f-1");
    expect(files.deleteFolder).toHaveBeenCalledWith("org-a", "f-1");
  });

  it("propagates a not found error from the service", async () => {
    const { controller } = setup({
      get: vi.fn().mockRejectedValue(new NotFoundException("File not found")),
    });
    await expect(controller.get(org, user, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("propagates a bad request error from the service", async () => {
    const { controller } = setup({
      upload: vi.fn().mockRejectedValue(new BadRequestException("File is required")),
    });
    await expect(controller.upload(org, user, undefined as any, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
