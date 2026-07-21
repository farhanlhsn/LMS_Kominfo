import { describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    status: "ready",
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
    publish: vi.fn(),
    incr: vi.fn(),
    pexpire: vi.fn(),
    pttl: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("RedisService", () => {
  it("get returns parsed JSON or null", async () => {
    const client = makeClient({
      get: vi.fn().mockResolvedValue(JSON.stringify({ a: 1 })),
    });
    const service = new RedisService(client as any);
    expect(await service.get("k")).toEqual({ a: 1 });

    client.get.mockResolvedValue(null);
    expect(await service.get("k")).toBeNull();
  });

  it("get swallows errors", async () => {
    const client = makeClient({
      get: vi.fn().mockRejectedValue(new Error("down")),
    });
    const service = new RedisService(client as any);
    expect(await service.get("k")).toBeNull();
  });

  it("set with and without ttl", async () => {
    const client = makeClient();
    const service = new RedisService(client as any);
    await service.set("k", { x: 1 }, 30);
    expect(client.set).toHaveBeenCalledWith("k", JSON.stringify({ x: 1 }), "EX", 30);
    await service.set("k2", "v");
    expect(client.set).toHaveBeenCalledWith("k2", JSON.stringify("v"));
  });

  it("set swallows errors", async () => {
    const client = makeClient({
      set: vi.fn().mockRejectedValue(new Error("down")),
    });
    const service = new RedisService(client as any);
    await expect(service.set("k", 1)).resolves.toBeUndefined();
  });

  it("del and del errors", async () => {
    const client = makeClient();
    const service = new RedisService(client as any);
    await service.del("k");
    expect(client.del).toHaveBeenCalledWith("k");
    client.del.mockRejectedValueOnce(new Error("x"));
    await expect(service.del("k")).resolves.toBeUndefined();
  });

  it("delByPrefix scans and deletes", async () => {
    const client = makeClient({
      scan: vi
        .fn()
        .mockResolvedValueOnce(["1", ["a", "b"]])
        .mockResolvedValueOnce(["0", []]),
      del: vi.fn().mockResolvedValue(2),
    });
    const service = new RedisService(client as any);
    expect(await service.delByPrefix("pref:")).toBe(2);
  });

  it("delByPrefix connects from wait and skips when not ready", async () => {
    const waiting = makeClient({
      status: "wait",
      connect: vi.fn().mockResolvedValue(undefined),
      scan: vi.fn().mockResolvedValue(["0", []]),
    });
    // after connect still wait path then ready check fails
    waiting.status = "wait";
    Object.defineProperty(waiting, "status", {
      get: (() => {
        let n = 0;
        return () => {
          n += 1;
          if (n <= 1) return "wait";
          return "end";
        };
      })(),
    });
    const serviceWait = new RedisService(waiting as any);
    expect(await serviceWait.delByPrefix("x")).toBe(0);

    const bad = makeClient({
      status: "end",
      delByPrefix: undefined,
    });
    const serviceBad = new RedisService(bad as any);
    expect(await serviceBad.delByPrefix("x")).toBe(0);
  });

  it("delByPrefix swallows errors", async () => {
    const client = makeClient({
      scan: vi.fn().mockRejectedValue(new Error("scan fail")),
    });
    const service = new RedisService(client as any);
    expect(await service.delByPrefix("p")).toBe(0);
  });

  it("publish and getOrSet", async () => {
    const client = makeClient({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      publish: vi.fn(),
    });
    const service = new RedisService(client as any);
    await service.publish("ch", { ok: true });
    expect(client.publish).toHaveBeenCalledWith(
      "ch",
      JSON.stringify({ ok: true }),
    );
    client.publish.mockRejectedValueOnce(new Error("p"));
    await expect(service.publish("ch", 1)).resolves.toBeUndefined();

    const value = await service.getOrSet("cache", async () => 42, 10);
    expect(value).toBe(42);
    client.get.mockResolvedValueOnce(JSON.stringify(7));
    expect(await service.getOrSet("cache", async () => 99, 10)).toBe(7);
  });

  it("getClient returns underlying client", () => {
    const client = makeClient();
    const service = new RedisService(client as any);
    expect(service.getClient()).toBe(client);
  });

  it("incrWithTtl sets expiry on first hit", async () => {
    const client = makeClient({
      incr: vi.fn().mockResolvedValue(1),
      pexpire: vi.fn(),
      pttl: vi.fn().mockResolvedValue(5000),
    });
    const service = new RedisService(client as any);
    expect(await service.incrWithTtl("rl:1", 5000)).toEqual({
      count: 1,
      ttlMs: 5000,
    });
    expect(client.pexpire).toHaveBeenCalled();
  });

  it("incrWithTtl uses ttlMs when pttl missing", async () => {
    const client = makeClient({
      incr: vi.fn().mockResolvedValue(2),
      pttl: vi.fn().mockResolvedValue(-1),
    });
    const service = new RedisService(client as any);
    expect(await service.incrWithTtl("rl:1", 9000)).toEqual({
      count: 2,
      ttlMs: 9000,
    });
  });

  it("incrWithTtl returns null when unavailable or errors", async () => {
    const offline = makeClient({ status: "end" });
    expect(await new RedisService(offline as any).incrWithTtl("k", 1)).toBeNull();

    const failing = makeClient({
      incr: vi.fn().mockRejectedValue(new Error("x")),
    });
    expect(await new RedisService(failing as any).incrWithTtl("k", 1)).toBeNull();
  });
});
