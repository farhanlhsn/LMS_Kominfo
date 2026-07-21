import { describe, expect, it, vi } from "vitest";
import { StorageService } from "./storage.service";
import type { StorageProvider } from "./storage-provider.interface";

function createProvider(): StorageProvider {
  return {
    uploadFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/file"),
    getPublicUrl: vi.fn().mockReturnValue("https://public.example/file"),
    getMetadata: vi.fn().mockResolvedValue({ size: 10 }),
    getFile: vi.fn().mockResolvedValue(Buffer.from("file")),
    copyFile: vi.fn().mockResolvedValue(undefined),
    moveFile: vi.fn().mockResolvedValue(undefined),
  };
}

describe("StorageService", () => {
  it("delegates signed URL creation to the configured provider", async () => {
    const provider = createProvider();
    const service = new StorageService(provider);

    await expect(service.getSignedUrl("bucket", "key", 300)).resolves.toBe(
      "https://signed.example/file",
    );
    expect(provider.getSignedUrl).toHaveBeenCalledWith("bucket", "key", 300);
  });

  it("delegates upload metadata without exposing provider details", async () => {
    const provider = createProvider();
    const service = new StorageService(provider);

    await service.uploadFile({
      bucket: "bucket",
      key: "key",
      body: Buffer.from("file"),
      mimeType: "text/plain",
      metadata: { organizationId: "org_1" },
    });

    expect(provider.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "bucket",
        key: "key",
        mimeType: "text/plain",
      }),
    );
  });

  it("delegates remaining storage operations", async () => {
    const provider = createProvider();
    const service = new StorageService(provider);
    await service.deleteFile("b", "k");
    expect(provider.deleteFile).toHaveBeenCalledWith("b", "k");
    expect(service.getPublicUrl("b", "k")).toBe("https://public.example/file");
    await expect(service.getMetadata("b", "k")).resolves.toEqual({ size: 10 });
    await expect(service.getFile("b", "k")).resolves.toEqual(Buffer.from("file"));
    await service.copyFile("a", "1", "b", "2");
    expect(provider.copyFile).toHaveBeenCalledWith("a", "1", "b", "2");
    await service.moveFile("a", "1", "b", "2");
    expect(provider.moveFile).toHaveBeenCalledWith("a", "1", "b", "2");
  });
});

