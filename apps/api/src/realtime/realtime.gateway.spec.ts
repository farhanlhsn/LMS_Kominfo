import { describe, expect, it, vi } from "vitest";
import { RealtimeGateway } from "./realtime.gateway";

describe("RealtimeGateway", () => {
  it("handles subscribe unsubscribe emit and subscriberCount", async () => {
    const service = {
      publish: vi.fn().mockResolvedValue({
        id: "e1",
        channel: "ch",
        type: "t",
        payload: {},
      }),
    };
    const gateway = new RealtimeGateway(service as any);
    gateway.afterInit();
    gateway.handleConnection({ id: "c1" } as any);
    gateway.handleDisconnect({ id: "c1" } as any);

    const client = {
      id: "c1",
      join: vi.fn(),
      leave: vi.fn(),
    };
    expect(gateway.handleSubscribe(client as any, {} as any)).toEqual({
      error: "channel required",
    });
    expect(
      gateway.handleSubscribe(client as any, { channel: "room-1" }),
    ).toEqual({ ok: true, channel: "room-1" });
    expect(gateway.handleUnsubscribe(client as any, {} as any)).toEqual({
      error: "channel required",
    });
    expect(
      gateway.handleUnsubscribe(client as any, { channel: "room-1" }),
    ).toEqual({ ok: true });

    gateway.server = {
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      sockets: {
        adapter: {
          rooms: new Map([["room-1", new Set(["a", "b"])]]),
        },
      },
    } as any;

    await gateway.emit("org", "u1", "room-1", "course.updated", { x: 1 });
    expect(service.publish).toHaveBeenCalled();
    expect(gateway.subscriberCount("room-1")).toBe(2);
    expect(gateway.subscriberCount("missing")).toBe(0);
  });

  it("cors origin callback allows empty/dev and checks allowlist in production", () => {
    const options = Reflect.getMetadata(
      "websockets:gateway_options",
      RealtimeGateway,
    ) as {
      cors: {
        origin: (
          origin: string | undefined,
          cb: (err: Error | null, ok?: boolean) => void,
        ) => void;
      };
    };
    const originFn = options.cors.origin;
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    originFn(undefined, (e, ok) => {
      expect(e).toBeNull();
      expect(ok).toBe(true);
    });
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_APP_URL = "https://app.example";
    process.env.CORS_ALLOWED_ORIGINS = "https://a.com, https://b.com";
    originFn("https://app.example", (_e, ok) => expect(ok).toBe(true));
    originFn("https://evil.com", (_e, ok) => expect(ok).toBe(false));
    process.env.NODE_ENV = prev;
  });
});
