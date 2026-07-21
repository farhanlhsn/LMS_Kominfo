import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const getSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class Stub {
    constructor(public input: unknown) {}
  }
  return {
    S3Client: class {
      send = send;
    },
    PutObjectCommand: Stub,
    DeleteObjectCommand: Stub,
    GetObjectCommand: Stub,
    HeadObjectCommand: Stub,
    HeadBucketCommand: Stub,
    CreateBucketCommand: Stub,
    CopyObjectCommand: Stub,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}));

describe("MinioStorageProvider", () => {
  beforeEach(() => {
    send.mockReset();
    getSignedUrl.mockReset();
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_PUBLIC_ENDPOINT = "http://cdn.example";
    process.env.S3_REGION = "local";
    process.env.S3_ACCESS_KEY_ID = "minio";
    process.env.S3_SECRET_ACCESS_KEY = "minio_password";
  });

  async function load() {
    const mod = await import("./minio-storage.provider");
    return new mod.MinioStorageProvider();
  }

  it("uploads after ensuring bucket (head ok)", async () => {
    send.mockResolvedValue({});
    const provider = await load();
    await provider.uploadFile({
      bucket: "b1",
      key: "k1",
      body: Buffer.from("x"),
      mimeType: "text/plain",
    });
    // head + put
    expect(send).toHaveBeenCalled();
    // second upload skips head
    await provider.uploadFile({
      bucket: "b1",
      key: "k2",
      body: Buffer.from("y"),
      mimeType: "text/plain",
    });
  });

  it("creates bucket when head fails", async () => {
    send
      .mockRejectedValueOnce(new Error("missing"))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const provider = await load();
    await provider.uploadFile({
      bucket: "new-bucket",
      key: "k",
      body: Buffer.from("z"),
      mimeType: "text/plain",
    });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("delete, signed url, public url, metadata, getFile", async () => {
    send.mockResolvedValue({
      ContentLength: 3,
      ContentType: "text/plain",
      ETag: "e",
      LastModified: new Date("2020-01-01"),
      Metadata: { a: "1" },
      Body: {
        transformToByteArray: async () => new Uint8Array([1, 2, 3]),
      },
    });
    getSignedUrl.mockResolvedValue("https://signed");
    const provider = await load();
    await provider.deleteFile("b", "k");
    expect(await provider.getSignedUrl("b", "k", 60)).toBe("https://signed");
    expect(provider.getPublicUrl("b", "k")).toBe("http://cdn.example/b/k");
    expect(await provider.getMetadata("b", "k")).toMatchObject({
      contentLength: 3,
      contentType: "text/plain",
    });
    expect(await provider.getFile("b", "k")).toEqual(Buffer.from([1, 2, 3]));
  });

  it("getFile returns empty buffer without body", async () => {
    send.mockResolvedValue({ Body: undefined });
    const provider = await load();
    expect(await provider.getFile("b", "k")).toEqual(Buffer.alloc(0));
  });

  it("copy and move", async () => {
    send.mockResolvedValue({});
    const provider = await load();
    await provider.copyFile("a", "1", "b", "2");
    await provider.moveFile("a", "1", "b", "2");
    expect(send.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
