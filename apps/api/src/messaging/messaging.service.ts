import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConversationType, Prisma } from "@lms/db";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import {
  CreateConversationDto,
  ConversationTypeValue,
  SendMessageDto,
} from "./dto/messaging.dto";

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  listConversations(organizationId: string, userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        organizationId,
        members: { some: { userId } },
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            lastReadAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 100,
    });
  }

  async getConversation(organizationId: string, userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }
    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException("You are not a member of this conversation");
    }
    return conv;
  }

  async createConversation(
    organizationId: string,
    userId: string,
    dto: CreateConversationDto,
  ) {
    if (dto.type === "DIRECT" && dto.memberIds.length !== 1) {
      throw new BadRequestException("DIRECT conversations require exactly 1 other member");
    }
    const blockedEither = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: dto.memberIds } },
          { blockerId: { in: dto.memberIds }, blockedId: userId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    if (blockedEither.length) {
      throw new ForbiddenException("One or more users are blocked");
    }

    const conv = await this.prisma.conversation.create({
      data: {
        id: randomUUID(),
        organizationId,
        type: dto.type as ConversationType,
        createdById: userId,
        name: dto.name ?? null,
        members: {
          create: [
            { id: randomUUID(), organizationId, userId, role: "ADMIN" },
            ...dto.memberIds.map((memberId) => ({
              id: randomUUID(),
              organizationId,
              userId: memberId,
              role: "MEMBER" as const,
            })),
          ],
        },
      },
      include: { members: true },
    });
    return conv;
  }

  async addMembers(
    organizationId: string,
    userId: string,
    conversationId: string,
    newMemberIds: string[],
  ) {
    const conv = await this.getConversation(organizationId, userId, conversationId);
    const actor = conv.members.find((m) => m.userId === userId);
    if (!actor || actor.role !== "ADMIN") {
      throw new ForbiddenException("Only admins can add members");
    }
    const existingIds = new Set(conv.members.map((m) => m.userId));
    const toAdd = newMemberIds.filter((id) => !existingIds.has(id));
    if (!toAdd.length) {
      return conv;
    }
    await this.prisma.conversationMember.createMany({
      data: toAdd.map((memberId) => ({
        id: randomUUID(),
        organizationId,
        conversationId,
        userId: memberId,
        role: "MEMBER",
      })),
    });
    return this.getConversation(organizationId, userId, conversationId);
  }

  async listMessages(
    organizationId: string,
    userId: string,
    conversationId: string,
    options: { cursor?: string; limit?: number } = {},
  ) {
    await this.getConversation(organizationId, userId, conversationId);
    const take = Math.min(Math.max(options.limit ?? 50, 1), 200);
    return this.prisma.message.findMany({
      where: {
        organizationId,
        conversationId,
        deletedAt: null,
        ...(options.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        reactions: true,
        reads: { where: { userId } },
      },
    });
  }

  async sendMessage(
    organizationId: string,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const conv = await this.getConversation(organizationId, userId, conversationId);
    const actor = conv.members.find((m) => m.userId === userId);
    if (!actor) {
      throw new ForbiddenException("You are not a member of this conversation");
    }
    if (dto.parentMessageId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: dto.parentMessageId, conversationId, organizationId },
      });
      if (!parent) {
        throw new BadRequestException("Parent message not in conversation");
      }
    }
    const message = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        organizationId,
        conversationId,
        senderId: userId,
        content: dto.content,
        attachments: (dto.attachments ?? []) as unknown as Prisma.InputJsonValue,
        parentMessageId: dto.parentMessageId ?? null,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    await this.realtime.publish(
      organizationId,
      userId,
      `org:${organizationId}:conversation:${conversationId}`,
      "message.created",
      { messageId: message.id, conversationId },
    );
    return message;
  }

  async editMessage(
    organizationId: string,
    userId: string,
    messageId: string,
    content: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, organizationId },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only edit your own messages");
    }
    if (message.deletedAt) {
      throw new BadRequestException("Message has been deleted");
    }
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
    });
    await this.realtime.publish(
      organizationId,
      userId,
      `org:${organizationId}:conversation:${message.conversationId}`,
      "message.edited",
      { messageId, conversationId: message.conversationId },
    );
    return updated;
  }

  async deleteMessage(organizationId: string, userId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, organizationId },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only delete your own messages");
    }
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: "" },
    });
    await this.realtime.publish(
      organizationId,
      userId,
      `org:${organizationId}:conversation:${message.conversationId}`,
      "message.deleted",
      { messageId, conversationId: message.conversationId },
    );
    return updated;
  }

  async reactToMessage(
    organizationId: string,
    userId: string,
    messageId: string,
    emoji: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, organizationId },
    });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      return { removed: true };
    }
    const reaction = await this.prisma.messageReaction.create({
      data: {
        id: randomUUID(),
        organizationId,
        messageId,
        userId,
        emoji,
      },
    });
    await this.realtime.publish(
      organizationId,
      userId,
      `org:${organizationId}:conversation:${message.conversationId}`,
      "message.reaction_added",
      { messageId, emoji, userId },
    );
    return reaction;
  }

  async markRead(
    organizationId: string,
    userId: string,
    conversationId: string,
    messageId?: string,
  ) {
    await this.getConversation(organizationId, userId, conversationId);
    const now = new Date();
    if (messageId) {
      await this.prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { id: randomUUID(), organizationId, messageId, userId, readAt: now },
        update: { readAt: now },
      });
    } else {
      const messages = await this.prisma.message.findMany({
        where: { organizationId, conversationId, deletedAt: null },
        select: { id: true },
      });
      if (messages.length) {
        await this.prisma.messageRead.createMany({
          data: messages.map((m) => ({
            id: randomUUID(),
            organizationId,
            messageId: m.id,
            userId,
            readAt: now,
          })),
          skipDuplicates: true,
        });
      }
    }
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: now },
    });
    return { readAt: now, conversationId };
  }

  async blockUser(organizationId: string, blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException("You cannot block yourself");
    }
    return this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { id: randomUUID(), organizationId, blockerId, blockedId },
      update: {},
    });
  }

  async unblockUser(organizationId: string, blockerId: string, blockedId: string) {
    return this.prisma.userBlock.deleteMany({
      where: { organizationId, blockerId, blockedId },
    });
  }
}
