import { describe, expect, it, vi } from "vitest";
import {
  AdminHelpController,
  AdminSupportTicketController,
  HelpController,
  SupportTicketController,
} from "./help.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("Help controllers", () => {
  it("public help endpoints", async () => {
    const service = {
      listCategories: vi.fn().mockResolvedValue([]),
      listArticles: vi.fn().mockResolvedValue([]),
      getArticle: vi.fn().mockResolvedValue({ id: "a1" }),
    };
    const controller = new HelpController(service as any);
    await controller.categories(org);
    await controller.articles(org, { q: "x" } as any);
    await controller.article(org, user, "a1");
    expect(service.getArticle).toHaveBeenCalledWith("org-1", "a1", "u1");
  });

  it("admin help endpoints", async () => {
    const service = {
      createCategory: vi.fn().mockResolvedValue({ id: "c1" }),
      updateCategory: vi.fn().mockResolvedValue({ id: "c1" }),
      deleteCategory: vi.fn().mockResolvedValue({ id: "c1" }),
      createArticle: vi.fn().mockResolvedValue({ id: "a1" }),
      updateArticle: vi.fn().mockResolvedValue({ id: "a1" }),
      deleteArticle: vi.fn().mockResolvedValue({ id: "a1" }),
    };
    const admin = new AdminHelpController(service as any);
    await admin.createCategory(org, user, { name: "General" } as any);
    await admin.updateCategory(org, user, "c1", { name: "G2" } as any);
    await admin.deleteCategory(org, user, "c1");
    await admin.createArticle(org, user, { title: "A" } as any);
    await admin.updateArticle(org, user, "a1", { title: "B" } as any);
    await admin.deleteArticle(org, user, "a1");
    expect(service.deleteArticle).toHaveBeenCalled();
  });

  it("support ticket endpoints", async () => {
    const service = {
      listTickets: vi.fn().mockResolvedValue([]),
      createTicket: vi.fn().mockResolvedValue({ id: "t1" }),
      getTicket: vi.fn().mockResolvedValue({ id: "t1" }),
      createReply: vi.fn().mockResolvedValue({ id: "r1" }),
      updateTicket: vi.fn().mockResolvedValue({ id: "t1" }),
    };
    const tickets = new SupportTicketController(service as any);
    await tickets.list(org, user, {} as any);
    await tickets.create(org, user, { subject: "Help" } as any);
    await tickets.get(org, "t1");
    await tickets.reply(org, user, "t1", { body: "hi" } as any);
    const admin = new AdminSupportTicketController(service as any);
    await admin.list(org, {} as any);
    await admin.get(org, "t1");
    await admin.update(org, user, "t1", { status: "CLOSED" } as any);
    expect(service.updateTicket).toHaveBeenCalled();
  });
});
