import { beforeEach,describe,expect,it,vi } from "vitest";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { RealtimeController } from "./realtime.controller";

describe("RealtimeController", () => {
  let controller: RealtimeController;
  let service: {
    buildChannel: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    poll: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    ack: ReturnType<typeof vi.fn>;
    getTransports: ReturnType<typeof vi.fn>;
  };

  const org = {
    id: "org_1",
    slug: "acme",
    name: "Acme",
    memberId: "m_1",
    roleKeys: ["org_admin"],
    permissionKeys: ["platform:admin"],
    isPlatformAdmin: true,
  };
  const user = {
    id: "user_1",
    email: "u@example.com",
    name: "User",
    sessionId: "sess_1",
    activeOrganizationId: "org_1",
  };

  beforeEach(() => {
    service = {
      buildChannel: vi.fn().mockReturnValue("org:org_1:course:c1"),
      publish: vi.fn().mockResolvedValue({ id: "evt_1" }),
      poll: vi.fn().mockResolvedValue([{ id: "evt_1" }]),
      subscribe: vi.fn().mockResolvedValue({ id: "sub_1" }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      ack: vi.fn().mockResolvedValue({ acked: true }),
      getTransports: vi.fn().mockReturnValue({ preferred: "polling", available: ["polling"] }),
    };

    controller = new RealtimeController(
      service as never,
    );
  });

  it("exposes available transports", () => {
    expect(controller.getTransports()).toEqual({
      data: { preferred: "polling", available: ["polling"] },
    });
  });

  it("builds a scoped channel", () => {
    expect(controller.buildChannel("course", "c1", org as never)).toEqual({
      data: { channel: "org:org_1:course:c1" },
    });
  });

  it("polls events and returns a count meta", async () => {
    const result = await controller.poll({} as never, org as never);
    expect((result as { meta: { count: number } }).meta.count).toBe(1);
  });

  it("publishes an event as admin", async () => {
    const result = await controller.publish(
      { channel: "org:org_1:course:c1", type: "course.updated", payload: {} } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("evt_1");
  });

  it("subscribes a user to a channel", async () => {
    const result = await controller.subscribe(
      { channel: "org:org_1:course:c1" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("sub_1");
  });

  it("unsubscribes a user from a channel", async () => {
    const result = await controller.unsubscribe(
      { channel: "org:org_1:course:c1" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { unsubscribed: boolean } }).data.unsubscribed).toBe(true);
  });

  it("acks an event for a user", async () => {
    const result = await controller.ack(
      { channel: "org:org_1:course:c1", eventId: "evt_1" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { acked: boolean } }).data.acked).toBe(true);
  });

  it("uses guard references for controller wiring", () => {
    expect(PermissionsGuard).toBeDefined();
    expect(JwtAuthGuard).toBeDefined();
    expect(OrganizationContextGuard).toBeDefined();
  });
});
