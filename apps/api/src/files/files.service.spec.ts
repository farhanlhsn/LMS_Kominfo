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
  const prisma = {
    file: {
      create: vi.fn(),
    },
    folder: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
    ...overrides,
  };
  const storage = {
    uploadFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn(),
    getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/file"),
    getPublicUrl: vi.fn().mockReturnValue("https://public.example/file"),
  };
  const accessPolicy = {
    ensureCanReadFile: vi.fn(),
    ensureCanManageFile: vi.fn(),
  };
  return {
    service: new FilesService(
      prisma as never,
      storage as never,
      accessPolicy as never,
    ),
    prisma,
    storage,
    accessPolicy,
  };
}

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
    const { service, storage, accessPolicy } = createService();
    accessPolicy.ensureCanReadFile.mockResolvedValue({
      id: "file_1",
      bucket: "bucket",
      key: "key",
      visibility: "PRIVATE",
    });

    await expect(
      service.signedUrl(organization, "user_1", "file_1", {
        expiresInSeconds: 600,
      }),
    ).resolves.toEqual({
      url: "https://signed.example/file",
      expiresInSeconds: 600,
    });
    expect(accessPolicy.ensureCanReadFile).toHaveBeenCalledWith(
      organization,
      "user_1",
      "file_1",
      undefined,
    );
    expect(storage.getSignedUrl).toHaveBeenCalledWith("bucket", "key", 600);
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
});
