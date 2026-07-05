import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PushService } from "./push.service";

const originalFetch = globalThis.fetch;

function setup(overrides: Record<string, unknown> = {}) {
  const prisma: Record<string, any> = {
    pushSubscription: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async ({ create, update, where }: any) => ({
        id: "sub-1",
        userId: create?.userId ?? where?.userId_endpoint?.userId ?? "u1",
        endpoint: create?.endpoint ?? where?.userId_endpoint?.endpoint ?? "https://x",
        p256dh: "p",
        auth: "a",
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
        ...update,
      })),
      delete: vi.fn().mockResolvedValue({ id: "sub-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({ id: "sub-1" }),
    },
    ...overrides,
  };
  return { service: new PushService(prisma as never), prisma };
}

describe("PushService", () => {
  beforeEach(() => {
    process.env.PUSH_VAPID_PUBLIC_KEY = "public-key";
    process.env.PUSH_VAPID_PRIVATE_KEY = "private-key";
  });

  afterEach(() => {
    delete process.env.PUSH_VAPID_PUBLIC_KEY;
    delete process.env.PUSH_VAPID_PRIVATE_KEY;
    globalThis.fetch = originalFetch;
  });

  it("returns VAPID info when configured", () => {
    const { service } = setup();
    const info = service.buildVapidInfo();
    expect(info.configured).toBe(true);
    expect(info.publicKey).toBe("public-key");
  });

  it("returns unconfigured VAPID info when env missing", () => {
    delete process.env.PUSH_VAPID_PUBLIC_KEY;
    delete process.env.PUSH_VAPID_PRIVATE_KEY;
    const { service } = setup();
    const info = service.buildVapidInfo();
    expect(info.configured).toBe(false);
    expect(info.publicKey).toBe(null);
  });

  it("subscribes a user and returns a record", async () => {
    const { service, prisma } = setup();
    const result = await service.subscribe("org-1", "user-a", {
      endpoint: "https://push.example.com",
      keys: { p256dh: "pp", auth: "aa" },
    });
    expect(result.userId).toBe("user-a");
    expect(prisma.pushSubscription.upsert).toHaveBeenCalled();
  });

  it("rejects subscription with missing fields", async () => {
    const { service } = setup();
    await expect(
      service.subscribe("org-1", "user-a", { endpoint: "", keys: { p256dh: "", auth: "" } }),
    ).rejects.toThrow("Invalid push subscription payload");
  });

  it("unsubscribes a user", async () => {
    const { service, prisma } = setup();
    const result = await service.unsubscribe("user-a", "https://x");
    expect(result.unsubscribed).toBe(true);
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalled();
  });

  it("returns empty subscriptions list when none", async () => {
    const { service } = setup();
    expect(await service.getSubscriptions("user-a")).toEqual([]);
  });

  it("maps subscriptions to public shape", async () => {
    const { service } = setup({
      pushSubscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "s1",
            userId: "u1",
            endpoint: "https://x",
            p256dh: "p",
            auth: "a",
            userAgent: "Mozilla/5.0",
            expiresAt: null,
            createdAt: new Date(),
          },
        ]),
      },
    });
    const subs = await service.getSubscriptions("u1");
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ id: "s1", endpoint: "https://x", keys: { p256dh: "p", auth: "a" } });
  });

  it("sendToUser returns empty result when no subscriptions", async () => {
    const { service } = setup();
    const result = await service.sendToUser("u1", { title: "Hi" });
    expect(result).toEqual({ attempted: 0, delivered: 0, failed: 0, removed: 0 });
  });

  it("sendToUser marks expired subscriptions for removal", async () => {
    const { service, prisma } = setup({
      pushSubscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "expired",
            endpoint: "https://x",
            p256dh: "p",
            auth: "a",
            userAgent: null,
            expiresAt: new Date(Date.now() - 1000),
            metadata: {},
          },
        ]),
      },
    });
    // Override the default delete mock so the .delete call here is recorded.
    const deleteMock = vi.fn().mockResolvedValue({ id: "expired" });
    prisma.pushSubscription.delete = deleteMock as any;
    const result = await service.sendToUser("u1", { title: "Hi" });
    expect(result.removed).toBe(1);
    expect(deleteMock).toHaveBeenCalled();
  });

  it("sendToUser calls fetch and counts successful delivery", async () => {
    const { service } = setup({
      pushSubscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "live",
            endpoint: "https://push.example.com",
            p256dh: "p",
            auth: "a",
            userAgent: null,
            expiresAt: null,
            metadata: {},
          },
        ]),
        update: vi.fn().mockResolvedValue({ id: "live" }),
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({ status: 201 });
    globalThis.fetch = fetchMock as any;
    const result = await service.sendToUser("u1", { title: "Hi", body: "There" });
    expect(fetchMock).toHaveBeenCalledWith("https://push.example.com", expect.any(Object));
    expect(result.delivered).toBe(1);
  });

  it("sendToUser counts failure on non-2xx", async () => {
    const { service } = setup({
      pushSubscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "live",
            endpoint: "https://push.example.com",
            p256dh: "p",
            auth: "a",
            userAgent: null,
            expiresAt: null,
            metadata: {},
          },
        ]),
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 500 }) as any;
    const result = await service.sendToUser("u1", { title: "Hi" });
    expect(result.failed).toBe(1);
  });

  it("sendToOrganization aggregates across org subscriptions", async () => {
    const { service } = setup({
      pushSubscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "a",
            endpoint: "https://x",
            p256dh: "p",
            auth: "a",
            userAgent: null,
            expiresAt: null,
            metadata: {},
          },
          {
            id: "b",
            endpoint: "https://y",
            p256dh: "p",
            auth: "a",
            userAgent: null,
            expiresAt: null,
            metadata: {},
          },
        ]),
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 201 }) as any;
    const result = await service.sendToOrganization("org-1", { title: "Org push" });
    expect(result.attempted).toBe(2);
    expect(result.delivered).toBe(2);
  });
});
