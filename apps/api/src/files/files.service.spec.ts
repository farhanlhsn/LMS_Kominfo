import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FilesService } from "./files.service";

const organization = {
  id: "org_1",
  slug: "demo",
  name: "Demo",
  memberId: "member_1",
  roleKeys: [],
  permissionKeys: ["files:read"],
  isPlatformAdmin: false,
};

function createService(overrides: Partial<Record<string, unknown>> = {}) {
  const prisma: any = {
    file: {
      create: vi.fn().mockResolvedValue({ id: "file_1" }),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({ id: "file_1", deletedAt: new Date() }),
    },
    folder: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "folder_1", name: "Docs" }),
      update: vi.fn().mockResolvedValue({ id: "folder_1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
    ...overrides,
  };
  const storage = {
    uploadFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFile: vi.fn().mockResolvedValue(Buffer.from("file-content")),
  };
  const accessPolicy = {
    ensureCanReadFile: vi.fn(),
    ensureCanManageFile: vi.fn(),
  };
  const redis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    del: vi.fn(),
  };
  return {
    service: new FilesService(
      prisma as never,
      storage as never,
      accessPolicy as never,
      redis as never,
    ),
    prisma,
    storage,
    accessPolicy,
    redis,
  };
}

const user = {
  id: "user_1",
  email: "user@example.com",
  name: "User",
  sessionId: "session_1",
  activeOrganizationId: organization.id,
} as any;

describe("FilesService", () => {
  it("rejects unsupported file types", () => {
    const { service } = createService();

    expect(() =>
      service.validateFile({
        originalname: "payload.exe",
        mimetype: "application/x-msdownload",
        size: 10,
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });

  it("generates signed URLs only after file access policy passes", async () => {
    const { service, accessPolicy } = createService();
    accessPolicy.ensureCanReadFile.mockResolvedValue({
      id: "file_1",
      organizationId: "org_1",
      bucket: "bucket",
      key: "key",
      visibility: "PRIVATE",
    });

    await expect(
      service.signedUrl(organization, "user_1", "file_1", {
        expiresInSeconds: 600,
      }),
    ).resolves.toEqual({
      url: expect.stringContaining("/api/v1/files/content/file_1"),
      expiresInSeconds: 600,
    });
    expect(accessPolicy.ensureCanReadFile).toHaveBeenCalledWith(
      organization,
      "user_1",
      "file_1",
      undefined,
    );
  });

  it("rejects upload into a folder from another organization", async () => {
    const { service } = createService({
      folder: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.upload(
        organization,
        {
          id: "user_1",
          email: "user@example.com",
          name: "User",
          sessionId: "session_1",
          activeOrganizationId: organization.id,
        } as any,
        {
          originalname: "lesson.pdf",
          mimetype: "application/pdf",
          size: 16,
          buffer: Buffer.from("content"),
        } as Express.Multer.File,
        { folderId: "folder-other-org" } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects folder creation under a parent from another organization", async () => {
    const { service } = createService({
      folder: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.createFolder(organization as any, "user_1", {
        name: "Child",
        parentId: "folder-other-org",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uploads a valid file and invalidates cache", async () => {
    const { service, storage, prisma, redis } = createService();
    await service.upload(organization as any, user, {
      originalname: "lesson.pdf",
      mimetype: "application/pdf",
      size: 16,
      buffer: Buffer.from("content"),
    } as Express.Multer.File, {} as any);
    expect(storage.uploadFile).toHaveBeenCalled();
    expect(prisma.file.create).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalled();
  });

  it("rejects missing file and oversized/octet stream", async () => {
    const { service } = createService();
    await expect(
      service.upload(organization as any, user, undefined, {} as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(() =>
      service.validateFile({
        originalname: "big.pdf",
        mimetype: "application/pdf",
        size: 60 * 1024 * 1024,
      } as Express.Multer.File),
    ).toThrow(/maximum size/);
    expect(() =>
      service.validateFile({
        originalname: "payload.exe",
        mimetype: "application/octet-stream",
        size: 10,
      } as Express.Multer.File),
    ).toThrow(/3D model/);
  });

  it("lists files and uses redis cache", async () => {
    const { service, redis, prisma } = createService();
    prisma.file.findMany.mockResolvedValue([{ id: "f1" }]);
    prisma.file.count.mockResolvedValue(1);
    const page = await service.list("org_1", { page: 1, limit: 20 } as any);
    expect((page as any).meta.total).toBe(1);
    expect(redis.set).toHaveBeenCalled();

    redis.get.mockResolvedValueOnce({
      data: [{ id: "cached" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const cached = await service.list("org_1", { page: 1 } as any);
    expect(cached.data[0]).toEqual({ id: "cached" });
  });

  it("delete, folders, managed file helpers, public signed url", async () => {
    const { service, accessPolicy, storage, prisma } = createService();
    accessPolicy.ensureCanManageFile.mockResolvedValue({
      id: "file_1",
      bucket: "b",
      key: "k",
    });
    await service.delete(organization as any, "user_1", "file_1");
    expect(storage.deleteFile).toHaveBeenCalled();

    accessPolicy.ensureCanReadFile.mockResolvedValue({
      id: "file_1",
      organizationId: "org_1",
      bucket: "b",
      key: "k",
      visibility: "PUBLIC",
    });
    const publicUrl = await service.signedUrl(
      organization as any,
      "user_1",
      "file_1",
      {} as any,
    );
    expect(publicUrl.url).toContain("/api/v1/files/public/file_1");

    prisma.folder.findFirst.mockResolvedValue({ id: "folder_1" });
    await service.createFolder(organization as any, "user_1", {
      name: "Docs",
    } as any);
    await service.updateFolder("org_1", "folder_1", { name: "Docs2" } as any);
    await service.deleteFolder("org_1", "folder_1");
    await service.listFolders("org_1");

    prisma.file.findFirst.mockResolvedValue({
      id: "cert_1",
      organizationId: "org_1",
      bucket: "b",
      key: "k",
    });
    await service.managedSignedUrl("org_1", "cert_1");
    await service.deleteManagedFile("org_1", "cert_1");
    prisma.file.findFirst.mockResolvedValue(null);
    await service.deleteManagedFile("org_1", "missing");
  });

  it("creates managed files and validates uploads", async () => {
    const { service, prisma, storage } = createService();
    prisma.file.create.mockResolvedValue({
      id: "managed_1",
      organizationId: "org_1",
      key: "k",
    });
    await service.createManagedFile({
      organizationId: "org_1",
      ownerId: "user_1",
      filename: "cert.pdf",
      body: Buffer.from("%PDF-1.4"),
      mimeType: "application/pdf",
      purpose: "CERTIFICATE",
    });
    expect(storage.uploadFile).toHaveBeenCalled();
    expect(() =>
      service.validateFile({
        mimetype: "application/x-msdownload",
        size: 10,
        originalname: "x.exe",
      } as any),
    ).toThrow(BadRequestException);
  });

  it("serves public files and validates signed private content URLs", async () => {
    const { service, prisma, storage } = createService();
    const file = {
      id: "file_1",
      organizationId: "org_1",
      bucket: "bucket",
      key: "key",
      mimeType: "application/pdf",
      originalFilename: "lesson.pdf",
      visibility: "PRIVATE",
    };
    prisma.file.findFirst.mockResolvedValue(file);

    const signed = await service.managedSignedUrl("org_1", "file_1", 300);
    const parsed = new URL(signed.url);
    const content = await service.signedContent(
      "file_1",
      parsed.searchParams.get("expires")!,
      parsed.searchParams.get("token")!,
    );
    expect(content.body.toString()).toBe("file-content");
    expect(storage.getFile).toHaveBeenCalledWith("bucket", "key");

    prisma.file.findFirst.mockResolvedValue({ ...file, visibility: "PUBLIC" });
    await expect(service.publicContent("file_1")).resolves.toMatchObject({
      mimeType: "application/pdf",
      filename: "lesson.pdf",
    });
  });

  it("covers managed invalid, search list, folder not-found, mime purpose", async () => {
    const { service, prisma, accessPolicy } = createService();
    await expect(
      service.createManagedFile({
        organizationId: "org_1",
        ownerId: "user_1",
        filename: "noext",
        body: Buffer.from("x"),
        mimeType: "application/pdf",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.file.findMany.mockResolvedValue([{ id: "f1" }]);
    prisma.file.count.mockResolvedValue(1);
    await service.list("org_1", { search: "pdf", page: 1, limit: 10 } as any);

    prisma.folder.findFirst.mockResolvedValue(null);
    await expect(
      service.updateFolder("org_1", "missing", { name: "x" } as any),
    ).rejects.toThrow(/Folder not found/);
    await expect(service.deleteFolder("org_1", "missing")).rejects.toThrow(
      /Folder not found/,
    );

    accessPolicy.ensureCanReadFile.mockResolvedValue({ id: "file_1" });
    await service.get(organization as any, "user_1", "file_1");

    await service.upload(
      organization as any,
      user,
      {
        originalname: "clip.mp4",
        mimetype: "video/mp4",
        size: 16,
        buffer: Buffer.from("vid"),
      } as Express.Multer.File,
      {} as any,
    );
    await service.upload(
      organization as any,
      user,
      {
        originalname: "note.txt",
        mimetype: "text/plain",
        size: 4,
        buffer: Buffer.from("note"),
      } as Express.Multer.File,
      {} as any,
    );
  });
});

