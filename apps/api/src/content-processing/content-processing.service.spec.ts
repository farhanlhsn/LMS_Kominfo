import { beforeEach, describe, expect, it, vi } from "vitest";

const add = vi.fn();
const Queue = vi.fn().mockImplementation(() => ({ add }));

vi.mock("bullmq", () => ({ Queue }));

describe("ContentProcessingService", () => {
  beforeEach(() => {
    vi.resetModules();
    add.mockReset();
    Queue.mockClear();
    add.mockResolvedValue({});
    process.env.REDIS_URL = "redis://user:pass@localhost:6380";
  });

  it("enqueues jobs and reuses queues", async () => {
    const { ContentProcessingService } = await import(
      "./content-processing.service"
    );
    const service = new ContentProcessingService();
    await expect(
      service.enqueue("CONTENT_CREATED", { id: 1 }),
    ).resolves.toEqual(
      expect.objectContaining({ queued: true, queue: "content-processing" }),
    );
    await service.enqueue("FILE_UPLOADED", { id: 2 });
    await service.enqueue("AI_INDEXING_REQUESTED", { id: 3 });
    expect(Queue).toHaveBeenCalledTimes(2); // content-processing + ai-indexing
    await service.enqueue("CONTENT_UPDATED", { id: 4 });
    expect(Queue).toHaveBeenCalledTimes(2); // reuse content-processing
  });

  it("returns queued false when queue fails", async () => {
    add.mockRejectedValue(new Error("redis down"));
    const { ContentProcessingService } = await import(
      "./content-processing.service"
    );
    const service = new ContentProcessingService();
    await expect(
      service.enqueue("CONTENT_CREATED", {}),
    ).resolves.toEqual(
      expect.objectContaining({ queued: false }),
    );
  });

  it("parses redis url without credentials", async () => {
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    const { ContentProcessingService } = await import(
      "./content-processing.service"
    );
    const service = new ContentProcessingService();
    await service.enqueue("FILE_UPLOADED", { a: 1 });
    expect(Queue).toHaveBeenCalled();
  });
});

