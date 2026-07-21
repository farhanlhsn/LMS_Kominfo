import { describe, expect, it, vi } from "vitest";
import { TranscriptNoteController } from "./notes.controller";

const org = { id: "org-1" } as any;
const user = { id: "u1" } as any;

describe("TranscriptNoteController", () => {
  it("delegates CRUD and context endpoints", async () => {
    const service = {
      list: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "n1" }),
      update: vi.fn().mockResolvedValue({ id: "n1" }),
      delete: vi.fn().mockResolvedValue({ id: "n1" }),
      generateContext: vi.fn().mockResolvedValue({ text: "ctx" }),
      getContext: vi.fn().mockResolvedValue({ text: "ctx" }),
      exportNotes: vi.fn().mockResolvedValue({ markdown: "" }),
    };
    const controller = new TranscriptNoteController(service as any);
    await controller.list(org, user, "lesson-1");
    await controller.search(org, user, { q: "x" } as any);
    await controller.create(org, user, { body: "hi" } as any);
    await controller.update(org, user, "n1", { body: "yo" } as any);
    await controller.remove(org, user, "n1");
    await controller.generateContext(org, user, "n1", {} as any);
    await controller.getContext(org, user, "n1");
    await controller.export(org, user, { lessonId: "l1" });
    expect(service.list).toHaveBeenCalledWith("org-1", "u1", "lesson-1");
    expect(service.exportNotes).toHaveBeenCalled();
  });
});
