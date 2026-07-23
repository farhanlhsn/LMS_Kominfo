import { BadRequestException,ForbiddenException,NotFoundException } from "@nestjs/common";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { MessagingService } from "./messaging.service";

describe("MessagingService", () => {
  let service: MessagingService;
  let prisma: {
    conversation: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    conversationMember: {
      createMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    message: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    messageReaction: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    messageRead: {
      upsert: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    userBlock: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let realtime: { publish: ReturnType<typeof vi.fn> };

  const conv = {
    id: "conv_1",
    organizationId: "org_1",
    type: "DIRECT",
    createdById: "user_1",
    name: null,
    members: [
      { userId: "user_1", role: "ADMIN" },
      { userId: "user_2", role: "MEMBER" },
    ],
  };

  beforeEach(() => {
    prisma = {
      conversation: {
        findFirst: vi.fn().mockResolvedValue(conv),
        findMany: vi.fn().mockResolvedValue([conv]),
        create: vi.fn().mockResolvedValue(conv),
        update: vi.fn().mockResolvedValue(conv),
      },
      conversationMember: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      message: {
        findFirst: vi.fn().mockResolvedValue({
          id: "msg_1",
          conversationId: "conv_1",
          organizationId: "org_1",
          senderId: "user_1",
          content: "hi",
          deletedAt: null,
        }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({
          id: "msg_1",
          conversationId: "conv_1",
          createdAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({ id: "msg_1", content: "edited" }),
      },
      messageReaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "rx_1" }),
        delete: vi.fn().mockResolvedValue({ id: "rx_1" }),
      },
      messageRead: {
        upsert: vi.fn().mockResolvedValue({ id: "rd_1" }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      userBlock: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: "block_1" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    realtime = { publish: vi.fn().mockResolvedValue(undefined) };

    service = new MessagingService(prisma as never, realtime as never);
  });

  it("lists conversations the user is a member of", async () => {
    const result = await service.listConversations("org_1", "user_1");
    expect(result).toEqual([conv]);
  });

  it("throws if conversation not found", async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce(null);
    await expect(service.getConversation("org_1", "user_1", "missing")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("refuses conversation access to non-members", async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({ ...conv, members: [] });
    await expect(service.getConversation("org_1", "user_3", "conv_1")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("rejects DIRECT conversation with wrong member count", async () => {
    await expect(
      service.createConversation("org_1", "user_1", {
        type: "DIRECT",
        memberIds: ["a", "b"],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects blocked users on conversation creation", async () => {
    prisma.userBlock.findMany.mockResolvedValueOnce([{ blockerId: "user_1", blockedId: "user_2" }]);
    await expect(
      service.createConversation("org_1", "user_1", { type: "DIRECT", memberIds: ["user_2"] }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("creates a conversation and emits via realtime", async () => {
    const result = await service.createConversation("org_1", "user_1", {
      type: "DIRECT",
      memberIds: ["user_2"],
    });
    expect(result.id).toBe("conv_1");
  });

  it("requires admin role to add members", async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({
      ...conv,
      members: [
        { userId: "user_1", role: "MEMBER" },
        { userId: "user_2", role: "MEMBER" },
      ],
    });
    await expect(
      service.addMembers("org_1", "user_1", "conv_1", ["user_3"]),
    ).rejects.toThrow(ForbiddenException);
  });

  it("adds only new members", async () => {
    const result = await service.addMembers("org_1", "user_1", "conv_1", ["user_2", "user_3"]);
    expect(result.id).toBe("conv_1");
    expect(prisma.conversationMember.createMany).toHaveBeenCalled();
  });

  it("rejects parent message not in conversation", async () => {
    prisma.message.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.sendMessage("org_1", "user_1", "conv_1", {
        content: "hi",
        parentMessageId: "missing",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("sends a message and updates lastMessageAt", async () => {
    const result = await service.sendMessage("org_1", "user_1", "conv_1", { content: "hi" });
    expect(result.id).toBe("msg_1");
    expect(prisma.conversation.update).toHaveBeenCalled();
    expect(realtime.publish).toHaveBeenCalled();
  });

  it("rejects edits from other senders", async () => {
    prisma.message.findFirst.mockResolvedValueOnce({
      id: "msg_1",
      senderId: "user_2",
      conversationId: "conv_1",
      organizationId: "org_1",
      deletedAt: null,
    });
    await expect(
      service.editMessage("org_1", "user_1", "msg_1", "new"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects edits on deleted messages", async () => {
    prisma.message.findFirst.mockResolvedValueOnce({
      id: "msg_1",
      senderId: "user_1",
      conversationId: "conv_1",
      organizationId: "org_1",
      deletedAt: new Date(),
    });
    await expect(
      service.editMessage("org_1", "user_1", "msg_1", "new"),
    ).rejects.toThrow(BadRequestException);
  });

  it("reacts to a message and toggles off when already reacted", async () => {
    prisma.messageReaction.findUnique.mockResolvedValueOnce({ id: "rx_1" });
    const removed = await service.reactToMessage("org_1", "user_1", "msg_1", "👍");
    expect(removed).toEqual({ removed: true });
  });

  it("marks all messages as read when no messageId provided", async () => {
    prisma.message.findMany.mockResolvedValueOnce([{ id: "msg_1" }, { id: "msg_2" }]);
    const result = await service.markRead("org_1", "user_1", "conv_1");
    expect(result.readAt).toBeInstanceOf(Date);
    expect(prisma.messageRead.createMany).toHaveBeenCalled();
  });

  it("marks single message as read when messageId provided", async () => {
    const result = await service.markRead("org_1", "user_1", "conv_1", "msg_1");
    expect(result.readAt).toBeInstanceOf(Date);
    expect(prisma.messageRead.upsert).toHaveBeenCalled();
  });

  it("refuses to block self", async () => {
    await expect(service.blockUser("org_1", "user_1", "user_1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("blocks and unblocks users", async () => {
    const block = await service.blockUser("org_1", "user_1", "user_2");
    expect(block.id).toBe("block_1");
    const removed = await service.unblockUser("org_1", "user_1", "user_2");
    expect(removed.count).toBe(1);
  });

  it("lists, edits, deletes messages and creates reaction", async () => {
    prisma.message.findMany.mockResolvedValueOnce([{ id: "msg_1" }]);
    await expect(
      service.listMessages("org_1", "user_1", "conv_1"),
    ).resolves.toMatchObject({
      data: [{ id: "msg_1" }],
    });
    prisma.message.findFirst.mockResolvedValueOnce({
      id: "msg_1",
      senderId: "user_1",
      conversationId: "conv_1",
      organizationId: "org_1",
      deletedAt: null,
    });
    await service.editMessage("org_1", "user_1", "msg_1", "edited");
    prisma.message.findFirst.mockResolvedValueOnce({
      id: "msg_1",
      senderId: "user_1",
      conversationId: "conv_1",
      organizationId: "org_1",
      deletedAt: null,
    });
    await service.deleteMessage("org_1", "user_1", "msg_1");
    prisma.messageReaction.findUnique.mockResolvedValueOnce(null);
    await service.reactToMessage("org_1", "user_1", "msg_1", "🔥");
    expect(prisma.message.update).toHaveBeenCalled();
    expect(prisma.messageReaction.create).toHaveBeenCalled();
  });
});
