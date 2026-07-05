import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  CreateHelpArticleDto,
  CreateHelpCategoryDto,
  CreateSupportTicketDto,
  CreateSupportTicketReplyDto,
  UpdateHelpArticleDto,
  UpdateHelpCategoryDto,
  UpdateSupportTicketDto,
} from "./dto/help.dto";

@Injectable()
export class HelpService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Categories
  async listCategories(organizationId: string) {
    return this.prisma.helpCategory.findMany({
      where: { organizationId },
      orderBy: [{ orderIndex: "asc" }, { title: "asc" }],
      include: { _count: { select: { articles: true } } },
    });
  }

  async createCategory(
    organization: OrganizationContext,
    userId: string,
    dto: CreateHelpCategoryDto,
  ) {
    const category = await this.prisma.helpCategory.create({
      data: {
        organizationId: organization.id,
        key: dto.key,
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
    await this.audit(organization.id, userId, "help_category.created", category.id);
    return category;
  }

  async updateCategory(
    organization: OrganizationContext,
    userId: string,
    categoryId: string,
    dto: UpdateHelpCategoryDto,
  ) {
    const category = await this.getCategory(organization.id, categoryId);
    const updated = await this.prisma.helpCategory.update({
      where: { id: category.id },
      data: {
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        orderIndex: dto.orderIndex,
      },
    });
    await this.audit(organization.id, userId, "help_category.updated", updated.id);
    return updated;
  }

  async deleteCategory(
    organization: OrganizationContext,
    userId: string,
    categoryId: string,
  ) {
    const category = await this.getCategory(organization.id, categoryId);
    await this.prisma.helpCategory.delete({ where: { id: category.id } });
    await this.audit(organization.id, userId, "help_category.deleted", category.id);
    return { id: category.id };
  }

  // Articles
  async listArticles(
    organizationId: string,
    options: { q?: string; categoryId?: string; limit?: number },
  ) {
    const where: Prisma.HelpArticleWhereInput = {
      organizationId,
    };
    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }
    if (options.q) {
      const term = options.q.trim();
      if (term) {
        where.OR = [
          { title: { contains: term, mode: "insensitive" } },
          { body: { contains: term, mode: "insensitive" } },
          { excerpt: { contains: term, mode: "insensitive" } },
        ];
      }
    }
    return this.prisma.helpArticle.findMany({
      where,
      include: { category: { select: { id: true, key: true, title: true } } },
      orderBy: { updatedAt: "desc" },
      take: options.limit ?? 50,
    });
  }

  async getArticle(organizationId: string, articleId: string, userId?: string) {
    const article = await this.prisma.helpArticle.findFirst({
      where: { id: articleId, organizationId },
      include: { category: { select: { id: true, key: true, title: true } } },
    });
    if (!article) throw new NotFoundException("Help article not found");
    if (userId) {
      await this.prisma.helpArticleView
        .create({
          data: {
            organizationId,
            articleId: article.id,
            userId,
          },
        })
        .catch(() => undefined);
    }
    return article;
  }

  async createArticle(
    organization: OrganizationContext,
    userId: string,
    dto: CreateHelpArticleDto,
  ) {
    const category = await this.prisma.helpCategory.findFirst({
      where: { id: dto.categoryId, organizationId: organization.id },
    });
    if (!category) throw new NotFoundException("Help category not found");
    const article = await this.prisma.helpArticle.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        slug: dto.slug,
        title: dto.title,
        body: dto.body,
        excerpt: dto.excerpt,
        status: dto.status ?? "DRAFT",
        tags: (dto.tags ?? []) as unknown as Prisma.InputJsonValue,
        publishedAt: dto.status === "PUBLISHED" ? new Date() : dto.publishedAt ? new Date(dto.publishedAt) : null,
      },
    });
    await this.audit(organization.id, userId, "help_article.created", article.id);
    return article;
  }

  async updateArticle(
    organization: OrganizationContext,
    userId: string,
    articleId: string,
    dto: UpdateHelpArticleDto,
  ) {
    const article = await this.prisma.helpArticle.findFirst({
      where: { id: articleId, organizationId: organization.id },
    });
    if (!article) throw new NotFoundException("Help article not found");
    if (dto.categoryId) {
      const category = await this.prisma.helpCategory.findFirst({
        where: { id: dto.categoryId, organizationId: organization.id },
      });
      if (!category) throw new NotFoundException("Help category not found");
    }
    const updated = await this.prisma.helpArticle.update({
      where: { id: article.id },
      data: {
        categoryId: dto.categoryId ?? article.categoryId,
        slug: dto.slug ?? article.slug,
        title: dto.title ?? article.title,
        body: dto.body ?? article.body,
        excerpt: dto.excerpt ?? article.excerpt,
        status: dto.status ?? article.status,
        tags: dto.tags ? (dto.tags as unknown as Prisma.InputJsonValue) : (article.tags as Prisma.InputJsonValue),
        publishedAt:
          dto.status === "PUBLISHED" && !article.publishedAt
            ? new Date()
            : article.publishedAt,
      },
    });
    await this.audit(organization.id, userId, "help_article.updated", updated.id);
    return updated;
  }

  async deleteArticle(
    organization: OrganizationContext,
    userId: string,
    articleId: string,
  ) {
    const article = await this.prisma.helpArticle.findFirst({
      where: { id: articleId, organizationId: organization.id },
    });
    if (!article) throw new NotFoundException("Help article not found");
    await this.prisma.helpArticle.delete({ where: { id: article.id } });
    await this.audit(organization.id, userId, "help_article.deleted", article.id);
    return { id: article.id };
  }

  // Support tickets
  async listTickets(
    organizationId: string,
    options: { userId?: string; status?: string; limit?: number },
  ) {
    const where: Prisma.SupportTicketWhereInput = { organizationId };
    if (options.userId) where.userId = options.userId;
    if (options.status) where.status = options.status;
    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
    });
  }

  async getTicket(organizationId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, organizationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    return ticket;
  }

  async createTicket(
    organization: OrganizationContext,
    userId: string,
    dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: organization.id,
        userId,
        subject: dto.subject,
        body: dto.body,
        category: dto.category ?? "general",
        priority: dto.priority ?? "NORMAL",
        status: "OPEN",
      },
    });
    await this.audit(organization.id, userId, "support_ticket.created", ticket.id);
    return ticket;
  }

  async createReply(
    organization: OrganizationContext,
    userId: string,
    ticketId: string,
    dto: CreateSupportTicketReplyDto,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, organizationId: organization.id },
    });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    const reply = await this.prisma.supportTicketReply.create({
      data: {
        organizationId: organization.id,
        ticketId: ticket.id,
        authorId: userId,
        body: dto.body,
        isInternal: dto.isInternal ?? false,
      },
      include: { author: { select: { id: true, email: true, name: true } } },
    });
    // Update status when customer or staff reply
    if (ticket.userId === userId && ticket.status === "PENDING") {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      });
    } else if (ticket.userId !== userId && ticket.status === "OPEN") {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "PENDING" },
      });
    }
    return reply;
  }

  async updateTicket(
    organization: OrganizationContext,
    userId: string,
    ticketId: string,
    dto: UpdateSupportTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, organizationId: organization.id },
    });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    if (dto.assignedToId) {
      const assignee = await this.prisma.organizationMember.findFirst({
        where: { organizationId: organization.id, userId: dto.assignedToId },
      });
      if (!assignee) throw new NotFoundException("Assignee is not a member");
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status ?? ticket.status,
        priority: dto.priority ?? ticket.priority,
        assignedToId: dto.assignedToId ?? ticket.assignedToId,
        closedAt:
          dto.status === "RESOLVED" || dto.status === "CLOSED"
            ? ticket.closedAt ?? new Date()
            : ticket.closedAt,
      },
    });
    await this.audit(organization.id, userId, "support_ticket.updated", updated.id);
    return updated;
  }

  private async getCategory(organizationId: string, categoryId: string) {
    const category = await this.prisma.helpCategory.findFirst({
      where: { id: categoryId, organizationId },
    });
    if (!category) throw new NotFoundException("Help category not found");
    return category;
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Help",
        entityId,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
  }
}
