import { describe, expect, it, vi } from "vitest";
import { PushController } from "./push.controller";

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "learner",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};
const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: [],
  isPlatformAdmin: false,
};

function setup(overrides: Record<string, any> = {}) {
  const push = {
    subscribe: vi.fn().mockResolvedValue({ id: "sub-1" }),
    unsubscribe: vi.fn().mockResolvedValue({ unsubscribed: true }),
    getSubscriptions: vi.fn().mockResolvedValue([]),
    sendToUser: vi.fn().mockResolvedValue({ attempted: 0, delivered: 0, failed: 0, removed: 0 }),
    buildVapidInfo: vi.fn().mockReturnValue({ configured: false, publicKey: null, subject: "mailto:a@b.c" }),
    ...overrides,
  };
  return { controller: new PushController(push as any), push };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("PushController", () => {
  it("returns VAPID info", () => {
    const { controller, push } = setup();
    const response = controller.vapid();
    expect(push.buildVapidInfo).toHaveBeenCalled();
    expect(response).toEqual({ data: { configured: false, publicKey: null, subject: "mailto:a@b.c" } });
  });

  it("lists subscriptions for the current user", async () => {
    const { controller, push } = setup();
    const response = await controller.list(createRequest());
    expect(push.getSubscriptions).toHaveBeenCalledWith("u-1");
    expect(response).toEqual({ data: [] });
  });

  it("subscribes a user with the request body and wraps in { data }", async () => {
    const { controller, push } = setup();
    const body = {
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "p", auth: "a" },
      userAgent: "Mozilla/5.0",
    } as any;
    const response = await controller.subscribe(createRequest(), body);
    expect(push.subscribe).toHaveBeenCalledWith(
      "org-a",
      "u-1",
      { endpoint: "https://push.example.com/abc", keys: { p256dh: "p", auth: "a" } },
      { userAgent: "Mozilla/5.0", expiresAt: undefined },
    );
    expect(response).toEqual({ data: { id: "sub-1" } });
  });

  it("falls back to user activeOrganizationId when organization missing", async () => {
    const { controller, push } = setup();
    const body = {
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "p", auth: "a" },
    } as any;
    await controller.subscribe(createRequest(undefined), body);
    expect(push.subscribe).toHaveBeenCalledWith(
      "org-a",
      "u-1",
      expect.objectContaining({ endpoint: "https://push.example.com/abc" }),
      expect.any(Object),
    );
  });

  it("unsubscribes a user by endpoint and wraps in { data }", async () => {
    const { controller, push } = setup();
    const body = { endpoint: "https://push.example.com/abc" } as any;
    const response = await controller.unsubscribe(createRequest(), body);
    expect(push.unsubscribe).toHaveBeenCalledWith("u-1", "https://push.example.com/abc");
    expect(response).toEqual({ data: { unsubscribed: true } });
  });

  it("sends push to a specific user", async () => {
    const { controller, push } = setup();
    const response = await controller.send(createRequest(), "u-2", {
      title: "Hi",
      body: "Body",
    } as any);
    expect(push.sendToUser).toHaveBeenCalledWith("u-2", { title: "Hi", body: "Body" });
    expect(response).toEqual({ data: { attempted: 0, delivered: 0, failed: 0, removed: 0 } });
  });
});
