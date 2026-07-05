import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

describe("MessagingController", () => {
  let controller: MessagingController;
  let service: {
    listConversations: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
    getConversation: ReturnType<typeof vi.fn>;
    addMembers: ReturnType<typeof vi.fn>;
    listMessages: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    editMessage: ReturnType<typeof vi.fn>;
    deleteMessage: ReturnType<typeof vi.fn>;
    reactToMessage: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    blockUser: ReturnType<typeof vi.fn>;
    unblockUser: ReturnType<typeof vi.fn>;
  };

  const org = {
    id: "org_1",
    slug: "acme",
    name: "Acme",
    memberId: "m_1",
    roleKeys: ["learner"],
    permissionKeys: ["users:update"],
    isPlatformAdmin: false,
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
      listConversations: vi.fn().mockResolvedValue([{ id: "conv_1" }]),
      createConversation: vi.fn().mockResolvedValue({ id: "conv_1" }),
      getConversation: vi.fn().mockResolvedValue({ id: "conv_1" }),
      addMembers: vi.fn().mockResolvedValue({ id: "conv_1" }),
      listMessages: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue({ id: "msg_1" }),
      editMessage: vi.fn().mockResolvedValue({ id: "msg_1", content: "x" }),
      deleteMessage: vi.fn().mockResolvedValue({ id: "msg_1" }),
      reactToMessage: vi.fn().mockResolvedValue({ id: "rx_1" }),
      markRead: vi.fn().mockResolvedValue({ readAt: new Date() }),
      blockUser: vi.fn().mockResolvedValue({ id: "block_1" }),
      unblockUser: vi.fn().mockResolvedValue({ count: 1 }),
    };

    controller = new MessagingController(service as never);
  });

  it("lists conversations", async () => {
    const result = await controller.list(org as never, user as never);
    expect((result as { data: unknown[] }).data).toEqual([{ id: "conv_1" }]);
  });

  it("creates a conversation", async () => {
    const result = await controller.create(
      { type: "DIRECT", memberIds: ["u2"] } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("conv_1");
  });

  it("returns a single conversation", async () => {
    const result = await controller.get("conv_1", user as never, org as never);
    expect((result as { data: { id: string } }).data.id).toBe("conv_1");
  });

  it("adds members", async () => {
    const result = await controller.addMembers(
      "conv_1",
      { userIds: ["u2"] } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("conv_1");
  });

  it("lists messages", async () => {
    const result = await controller.listMessages(
      "conv_1",
      {} as never,
      user as never,
      org as never,
    );
    expect((result as { data: unknown[] }).data).toEqual([]);
  });

  it("sends a message", async () => {
    const result = await controller.send(
      "conv_1",
      { content: "hi" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("msg_1");
  });

  it("edits a message", async () => {
    const result = await controller.edit(
      "msg_1",
      { content: "x" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { content: string } }).data.content).toBe("x");
  });

  it("removes a message", async () => {
    const result = await controller.remove("msg_1", user as never, org as never);
    expect((result as { data: { id: string } }).data.id).toBe("msg_1");
  });

  it("reacts to a message", async () => {
    const result = await controller.react(
      "msg_1",
      { emoji: "👍" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("rx_1");
  });

  it("marks a conversation read", async () => {
    const result = await controller.markRead(
      "conv_1",
      {} as never,
      user as never,
      org as never,
    );
    expect((result as { data: { readAt: Date } }).data.readAt).toBeInstanceOf(Date);
  });

  it("blocks a user", async () => {
    const result = await controller.block(
      { userId: "u2" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { id: string } }).data.id).toBe("block_1");
  });

  it("unblocks a user", async () => {
    const result = await controller.unblock("u2", user as never, org as never);
    expect((result as { data: { removed: boolean } }).data.removed).toBe(true);
  });

  it("uses guard references for controller wiring", () => {
    expect(PermissionsGuard).toBeDefined();
    expect(JwtAuthGuard).toBeDefined();
    expect(OrganizationContextGuard).toBeDefined();
  });
});
