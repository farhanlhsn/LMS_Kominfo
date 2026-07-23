import type { RealtimeEvent } from "@lms/db";
import { ForbiddenException,NotFoundException } from "@nestjs/common";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { RealtimeService } from "./realtime.service";

describe("RealtimeService", () => {
  let service: RealtimeService;
  let prisma: {
    realtimeEvent: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    realtimeSubscription: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  const baseEvent: RealtimeEvent = {
    id: "evt_1",
    organizationId: "org_1",
    channel: "org:org_1:course:c1",
    type: "course.updated",
    payload: { foo: "bar" },
    actorId: "user_1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    prisma = {
      realtimeEvent: {
        create: vi.fn().mockResolvedValue(baseEvent),
        findMany: vi.fn().mockResolvedValue([baseEvent]),
        findFirst: vi.fn().mockResolvedValue({ id: baseEvent.id }),
        findUnique: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      realtimeSubscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "sub_1", channel: "x", lastSeenAt: new Date() }),
        update: vi.fn().mockResolvedValue({ id: "sub_1", channel: "x", lastSeenAt: new Date() }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new RealtimeService(prisma as never);
  });

  it("builds a channel using org scope", () => {
    const channel = service.buildChannel("org_1", "course", "c1");
    expect(channel).toBe("org:org_1:course:c1");
  });

  it("throws if channel is not in organization scope", () => {
    expect(() => service.assertChannelScope("org_1", "org:org_2:course:c1")).toThrow(
      ForbiddenException,
    );
  });

  it("publishes a realtime event with payload", async () => {
    const event = await service.publish(
      "org_1",
      "user_1",
      "org:org_1:course:c1",
      "course.updated",
      {
        foo: "bar",
      },
    );
    expect(event.id).toBe(baseEvent.id);
    expect(prisma.realtimeEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        channel: "org:org_1:course:c1",
        type: "course.updated",
        actorId: "user_1",
      }),
    });
  });

  it("fans out to local listeners on publish", async () => {
    const handler = vi.fn();
    service.registerListener("org:org_1:course:c1", handler);
    await service.publish("org_1", "user_1", "org:org_1:course:c1", "ping", {});
    expect(handler).toHaveBeenCalledWith(baseEvent);
  });

  it("returns events newer than since and orders by createdAt", async () => {
    const since = new Date("2025-12-31T00:00:00Z").toISOString();
    await service.poll("org_1", { since });
    expect(prisma.realtimeEvent.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        createdAt: { gt: expect.any(Date) },
      },
      take: 50,
      orderBy: { createdAt: "asc" },
    });
  });

  it("paginates poll via limit and channel", async () => {
    await service.poll("org_1", { channel: "org:org_1:course:c1", limit: 10, order: "desc" });
    expect(prisma.realtimeEvent.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        channel: "org:org_1:course:c1",
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
  });

  it("rejects out-of-scope channel poll", async () => {
    await expect(
      service.poll("org_1", { channel: "org:org_2:course:c1" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("creates subscription when none exists", async () => {
    const result = await service.subscribe("org_1", "user_1", "org:org_1:course:c1");
    expect(result.id).toBe("sub_1");
    expect(prisma.realtimeSubscription.create).toHaveBeenCalled();
  });

  it("updates existing subscription lastSeenAt", async () => {
    prisma.realtimeSubscription.findUnique.mockResolvedValueOnce({
      id: "sub_existing",
      channel: "org:org_1:course:c1",
      lastSeenAt: new Date(),
    });
    await service.subscribe("org_1", "user_1", "org:org_1:course:c1");
    expect(prisma.realtimeSubscription.update).toHaveBeenCalled();
  });

  it("acks an event by updating subscription lastSeenAt", async () => {
    const result = await service.ack("org_1", "user_1", "org:org_1:course:c1", baseEvent.id);
    expect(result.acked).toBe(true);
  });

  it("throws NotFound when acking unknown event", async () => {
    prisma.realtimeEvent.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.ack("org_1", "user_1", "org:org_1:course:c1", "missing"),
    ).rejects.toThrow(NotFoundException);
  });

  it("unsubscribes and removes subscription", async () => {
    await service.unsubscribe("org_1", "user_1", "org:org_1:course:c1");
    expect(prisma.realtimeSubscription.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1", userId: "user_1", channel: "org:org_1:course:c1" },
    });
  });

  it("prunes expired events", async () => {
    const count = await service.pruneExpired();
    expect(count).toBe(3);
  });

  it("polls with afterId cursor and unsubscribes listeners", async () => {
    prisma.realtimeEvent.findUnique.mockResolvedValueOnce({
      id: "evt_1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    await service.poll("org_1", { since: "evt_1", limit: 5 });
    expect(prisma.realtimeEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1" }),
        take: 5,
      }),
    );
    const handler = vi.fn();
    const unsubscribe = service.registerListener("org:org_1:course:c1", handler);
    unsubscribe();
    await service.publish("org_1", "user_1", "org:org_1:course:c1", "ping", {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("publishes over redis bus when redis is provided", async () => {
    const publish = vi.fn().mockResolvedValue(1);
    const on = vi.fn();
    const duplicate = vi.fn().mockReturnValue({
      status: "wait",
      subscribe: vi.fn().mockResolvedValue(undefined),
      on,
      connect: vi.fn().mockResolvedValue(undefined),
    });
    const redis = { publish, duplicate };
    const withRedis = new RealtimeService(prisma as never, redis as never);
    await withRedis.publish("org_1", "user_1", "org:org_1:course:c1", "ping", {
      x: 1,
    });
    expect(publish).toHaveBeenCalled();
    // simulate inbound redis message for another instance
    const messageHandler = on.mock.calls.find((c) => c[0] === "message")?.[1];
    if (messageHandler) {
      const handler = vi.fn();
      withRedis.registerListener("org:org_1:course:c1", handler);
      messageHandler(
        "lms:realtime:events",
        JSON.stringify({
          origin: "other-instance",
          event: {
            id: "e2",
            organizationId: "org_1",
            channel: "org:org_1:course:c1",
            type: "x",
            payload: {},
            actorId: "u",
            createdAt: new Date().toISOString(),
          },
        }),
      );
      expect(handler).toHaveBeenCalled();
      messageHandler("lms:realtime:events", "not-json");
      messageHandler(
        "lms:realtime:events",
        JSON.stringify({ origin: "other", event: null }),
      );
    }
  });

  it("ignores bad redis bus payloads", async () => {
    const publish = vi.fn().mockResolvedValue(1);
    const on = vi.fn();
    const duplicate = vi.fn().mockReturnValue({
      status: "ready",
      subscribe: vi.fn().mockResolvedValue(undefined),
      on,
      connect: vi.fn(),
    });
    const withRedis = new RealtimeService(
      prisma as never,
      { publish, duplicate } as never,
    );
    await Promise.resolve();
    const messageHandler = on.mock.calls.find((c) => c[0] === "message")?.[1];
    expect(messageHandler).toBeTypeOf("function");
    const handler = vi.fn();
    withRedis.registerListener("org:org_1:course:c1", handler);
    messageHandler("lms:realtime:events", "{");
    messageHandler(
      "lms:realtime:events",
      JSON.stringify({ origin: "other", event: null }),
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
