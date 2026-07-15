import { beforeEach, describe, expect, it, vi } from "vitest";

const connect = vi.fn();
const duplicate = vi.fn();
const createAdapter = vi.fn().mockReturnValue("redis-adapter");

vi.mock("ioredis", () => {
  return {
    default: class Redis {
      constructor() {
        this.connect = connect;
      }
      connect = connect;
      duplicate = duplicate;
    },
  };
});

vi.mock("@socket.io/redis-adapter", () => ({
  createAdapter: (...args: unknown[]) => createAdapter(...args),
}));

vi.mock("@nestjs/platform-socket.io", () => ({
  IoAdapter: class {
    constructor(public app: unknown) {}
    createIOServer() {
      return { adapter: vi.fn() };
    }
  },
}));

describe("RedisIoAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    connect.mockReset();
    duplicate.mockReset();
    createAdapter.mockReset();
    createAdapter.mockReturnValue("redis-adapter");
    connect.mockResolvedValue(undefined);
    duplicate.mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined) });
    delete process.env.REDIS_URL;
  });

  it("skips redis when URL missing", async () => {
    const { RedisIoAdapter } = await import("./redis-io.adapter");
    const adapter = new RedisIoAdapter({} as any);
    await adapter.connectToRedis();
    const server = adapter.createIOServer(3001);
    expect(server.adapter).not.toHaveBeenCalled();
  });

  it("wires redis adapter when connect succeeds", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { RedisIoAdapter } = await import("./redis-io.adapter");
    const adapter = new RedisIoAdapter({} as any);
    await adapter.connectToRedis();
    const server = adapter.createIOServer(3001);
    expect(createAdapter).toHaveBeenCalled();
    expect(server.adapter).toHaveBeenCalledWith("redis-adapter");
  });

  it("falls back when redis connect fails", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    connect.mockRejectedValue(new Error("down"));
    const { RedisIoAdapter } = await import("./redis-io.adapter");
    const adapter = new RedisIoAdapter({} as any);
    await adapter.connectToRedis();
    const server = adapter.createIOServer(3001);
    expect(server.adapter).not.toHaveBeenCalled();
  });
});
