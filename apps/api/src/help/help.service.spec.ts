import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { HelpService } from "./help.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: ["courses:read", "courses:update"],
  isPlatformAdmin: false,
};

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "admin",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

function setup() {
  const categories = new Map<string, Record<string, any>>();
  const articles = new Map<string, Record<string, any>>();
  const tickets = new Map<string, Record<string, any>>();
  const replies: Record<string, unknown>[] = [];
  const auditLogs: Record<string, unknown>[] = [];

  const prisma: any = {
    helpCategory: {
      findMany: vi.fn(async () => Array.from(categories.values())),
      findFirst: vi.fn(async (args: any) => {
        const id = args?.where?.id;
        return id ? categories.get(id) ?? null : Array.from(categories.values())[0] ?? null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `cat-${categories.size + 1}`;
        const cat = { id, ...args.data, _count: { articles: 0 } };
        categories.set(id, cat);
        return cat;
      }),
      update: vi.fn(async (args: any) => {
        const existing = categories.get(args.where.id) ?? { id: args.where.id };
        const updated = { ...existing, ...args.data };
        categories.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        categories.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    helpArticle: {
      findMany: vi.fn(async (args: any) => {
        let list = Array.from(articles.values());
        if (args?.where?.categoryId) {
          list = list.filter((a) => a.categoryId === args.where.categoryId);
        }
        if (args?.where?.organizationId) {
          list = list.filter((a) => a.organizationId === args.where.organizationId);
        }
        return list;
      }),
      findFirst: vi.fn(async (args: any) => {
        const id = args?.where?.id;
        return id ? articles.get(id) ?? null : null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `art-${articles.size + 1}`;
        const created = {
          id,
          ...args.data,
          category: { id: args.data.categoryId, key: "general", title: "General" },
        };
        articles.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = articles.get(args.where.id) ?? { id: args.where.id };
        const updated = { ...existing, ...args.data };
        articles.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        articles.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    helpArticleView: {
      create: vi.fn(async (args: any) => ({ id: "view-1", ...args.data })),
    },
    supportTicket: {
      findMany: vi.fn(async (args: any) => {
        let list = Array.from(tickets.values());
        if (args?.where?.userId) {
          list = list.filter((t) => t.userId === args.where.userId);
        }
        if (args?.where?.status) {
          list = list.filter((t) => t.status === args.where.status);
        }
        if (args?.where?.organizationId) {
          list = list.filter((t) => t.organizationId === args.where.organizationId);
        }
        return list.map((t) => ({
          ...t,
          user: { id: t.userId, email: "u@e.c", name: "U" },
          _count: { replies: 0 },
        }));
      }),
      findFirst: vi.fn(async (args: any) => {
        const id = args?.where?.id;
        if (!id) return null;
        const ticket = tickets.get(id);
        if (!ticket) return null;
        return {
          ...ticket,
          user: { id: ticket.userId, email: "u@e.c", name: "U" },
          replies: replies.filter((r) => r.ticketId === id),
        };
      }),
      create: vi.fn(async (args: any) => {
        const id = `t-${tickets.size + 1}`;
        const created = { id, ...args.data };
        tickets.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = tickets.get(args.where.id) ?? { id: args.where.id };
        const updated = { ...existing, ...args.data };
        tickets.set(args.where.id, updated);
        return updated;
      }),
    },
    supportTicketReply: {
      create: vi.fn(async (args: any) => {
        const id = `r-${replies.length + 1}`;
        const created = { id, ...args.data };
        replies.push(created);
        return { ...created, author: { id: args.data.authorId, email: "u@e.c", name: "U" } };
      }),
    },
    organizationMember: {
      findFirst: vi.fn(async () => ({ id: "m1" })),
    },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
  };
  const service = new HelpService(prisma);
  return { service, prisma, categories, articles, tickets, replies, auditLogs };
}

describe("HelpService", () => {
  it("creates a help category and lists it", async () => {
    const { service } = setup();
    const created = await service.createCategory(org, user.id, {
      key: "getting-started",
      title: "Getting Started",
    });
    expect(created).toMatchObject({ key: "getting-started" });
    const list = await service.listCategories(org.id);
    expect(list).toHaveLength(1);
  });

  it("updates a help category", async () => {
    const { service } = setup();
    const created = await service.createCategory(org, user.id, { key: "k", title: "Old" });
    const updated = await service.updateCategory(org, user.id, created.id, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("rejects updating a missing category", async () => {
    const { service } = setup();
    await expect(
      service.updateCategory(org, user.id, "missing", { title: "New" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates an article and tracks a view", async () => {
    const { service } = setup();
    const cat = await service.createCategory(org, user.id, { key: "general", title: "General" });
    const article = await service.createArticle(org, user.id, {
      categoryId: cat.id,
      slug: "first",
      title: "First Article",
      body: "Hello world",
    });
    const fetched = await service.getArticle(org.id, article.id, user.id);
    expect(fetched.title).toBe("First Article");
  });

  it("creates a support ticket and adds a reply", async () => {
    const { service } = setup();
    const ticket = await service.createTicket(org, user.id, {
      subject: "Need help",
      body: "Cannot log in",
    });
    expect(ticket.status).toBe("OPEN");
    const reply = await service.createReply(org, user.id, ticket.id, {
      body: "We are looking into it",
    });
    expect(reply.body).toBe("We are looking into it");
  });

  it("updates ticket status and priority", async () => {
    const { service } = setup();
    const ticket = await service.createTicket(org, user.id, {
      subject: "Need help",
      body: "Cannot log in",
    });
    const updated = await service.updateTicket(org, user.id, ticket.id, {
      status: "RESOLVED",
      priority: "HIGH",
    });
    expect(updated.status).toBe("RESOLVED");
    expect(updated.priority).toBe("HIGH");
  });

  it("lists tickets for the current user", async () => {
    const { service } = setup();
    await service.createTicket(org, user.id, { subject: "A", body: "b" });
    await service.createTicket(org, user.id, { subject: "B", body: "b" });
    const list = await service.listTickets(org.id, { userId: user.id });
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("updates and deletes articles and categories", async () => {
    const { service } = setup();
    const cat = await service.createCategory(org, user.id, {
      key: "faq",
      title: "FAQ",
    });
    await service.updateCategory(org, user.id, cat.id, { title: "FAQ 2" });
    const article = await service.createArticle(org, user.id, {
      categoryId: cat.id,
      slug: "how-to",
      title: "How",
      body: "Body",
    });
    await service.updateArticle(org, user.id, article.id, {
      title: "How 2",
    });
    await service.listArticles(org.id, { q: "How", categoryId: cat.id });
    await service.deleteArticle(org, user.id, article.id);
    await service.deleteCategory(org, user.id, cat.id);
    await service.getTicket(org.id, (
      await service.createTicket(org, user.id, {
        subject: "X",
        body: "Y",
      })
    ).id);
  });

  it("covers article category validation, publish date, reply status flips", async () => {
    const { service, tickets, prisma } = setup();
    const cat = await service.createCategory(org, user.id, {
      key: "g",
      title: "G",
    });
    const article = await service.createArticle(org, user.id, {
      categoryId: cat.id,
      slug: "a",
      title: "A",
      body: "B",
    });
    await expect(
      service.updateArticle(org, user.id, article.id, {
        categoryId: "missing",
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    await service.updateArticle(org, user.id, article.id, {
      status: "PUBLISHED",
      tags: ["t"],
    } as any);

    const ticket = await service.createTicket(org, user.id, {
      subject: "S",
      body: "B",
    });
    tickets.set(ticket.id, { ...tickets.get(ticket.id), status: "PENDING" });
    await service.createReply(org, user.id, ticket.id, { body: "owner" });
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "OPEN" }),
      }),
    );
    tickets.set(ticket.id, { ...tickets.get(ticket.id), status: "OPEN" });
    await service.createReply(org, "staff", ticket.id, { body: "staff" });
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      }),
    );

    prisma.organizationMember.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.updateTicket(org, user.id, ticket.id, {
        assignedToId: "nobody",
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    await service.updateTicket(org, user.id, ticket.id, {
      status: "CLOSED",
      assignedToId: "u-2",
    } as any);
  });
});

