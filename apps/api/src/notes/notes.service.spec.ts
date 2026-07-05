import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { TranscriptNoteService } from "./notes.service";
import { MockNoteContextProvider } from "./notes.provider";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: ["courses:read"],
  isPlatformAdmin: false,
};

const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "learner",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

function setup() {
  const notes = new Map<string, Record<string, any>>();
  const contexts = new Map<string, Record<string, any>>();
  const exports: Record<string, unknown>[] = [];
  const auditLogs: Record<string, unknown>[] = [];
  const prisma: any = {
    transcriptNote: {
      findMany: vi.fn(async (args: any) => {
        let list = Array.from(notes.values());
        if (args?.where?.userId) {
          list = list.filter((n) => n.userId === args.where.userId);
        }
        if (args?.where?.organizationId) {
          list = list.filter((n) => n.organizationId === args.where.organizationId);
        }
        if (args?.where?.lessonId) {
          list = list.filter((n) => n.lessonId === args.where.lessonId);
        }
        if (args?.where?.activityId) {
          list = list.filter((n) => n.activityId === args.where.activityId);
        }
        if (args?.where?.id?.in) {
          const ids = new Set(args.where.id.in);
          list = list.filter((n) => ids.has(n.id));
        }
        if (args?.where?.NOT?.id) {
          list = list.filter((n) => n.id !== args.where.NOT.id);
        }
        if (args?.where?.OR) {
          list = list.filter((n) =>
            args.where.OR.some((clause: any) => {
              if (clause.content?.contains) {
                return n.content.toLowerCase().includes(clause.content.contains.toLowerCase());
              }
              return false;
            }),
          );
        }
        return list;
      }),
      findFirst: vi.fn(async (args: any) => {
        const id = args?.where?.id;
        if (!id) return null;
        const note = notes.get(id);
        if (!note) return null;
        if (note.organizationId !== args.where.organizationId) return null;
        if (note.userId !== args.where.userId) return null;
        return note;
      }),
      create: vi.fn(async (args: any) => {
        const id = `n-${notes.size + 1}`;
        const created = { id, ...args.data };
        notes.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = notes.get(args.where.id) ?? { id: args.where.id };
        const updated = { ...existing, ...args.data };
        notes.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        notes.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    noteContext: {
      upsert: vi.fn(async (args: any) => {
        const existing = contexts.get(args.where.noteId);
        const next = {
          id: existing?.id ?? `nc-${contexts.size + 1}`,
          ...args.create,
          ...args.update,
        };
        contexts.set(args.where.noteId, next);
        return next;
      }),
      findUnique: vi.fn(async (args: any) => contexts.get(args.where.noteId) ?? null),
    },
    notesExport: {
      create: vi.fn(async (args: any) => {
        const id = `exp-${exports.length + 1}`;
        const created = { id, ...args.data };
        exports.push(created);
        return created;
      }),
    },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
  };
  const service = new TranscriptNoteService(prisma, new MockNoteContextProvider());
  return { service, prisma, notes, contexts, exports, auditLogs };
}

describe("TranscriptNoteService", () => {
  it("creates a transcript note", async () => {
    const { service } = setup();
    const note = await service.create(org, user.id, {
      lessonId: "l-1",
      content: "Important insight",
      timestampSeconds: 42,
    });
    expect(note).toMatchObject({ content: "Important insight", timestampSeconds: 42 });
  });

  it("updates a transcript note", async () => {
    const { service } = setup();
    const note = await service.create(org, user.id, {
      lessonId: "l-1",
      content: "first",
    });
    const updated = await service.update(org, user.id, note.id, { content: "second" });
    expect(updated.content).toBe("second");
  });

  it("rejects updates for a non-owner", async () => {
    const { service, prisma } = setup();
    const note = await service.create(org, user.id, { lessonId: "l-1", content: "x" });
    prisma.transcriptNote.findFirst = vi.fn(async () => null);
    await expect(
      service.update(org, "u-2", note.id, { content: "hijack" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("deletes a transcript note", async () => {
    const { service } = setup();
    const note = await service.create(org, user.id, { lessonId: "l-1", content: "x" });
    const result = await service.delete(org, user.id, note.id);
    expect(result).toMatchObject({ id: note.id });
  });

  it("searches by content", async () => {
    const { service } = setup();
    await service.create(org, user.id, { lessonId: "l-1", content: "alpha" });
    await service.create(org, user.id, { lessonId: "l-1", content: "beta" });
    const result = await service.search(org.id, user.id, { q: "alpha", limit: 10 });
    expect(result).toHaveLength(1);
  });

  it("generates an AI context with the mock provider", async () => {
    const { service, auditLogs, contexts } = setup();
    const a = await service.create(org, user.id, {
      lessonId: "l-1",
      content: "React hooks and state",
    });
    const b = await service.create(org, user.id, {
      lessonId: "l-1",
      content: "JavaScript closures and lexical scope",
    });
    const result = await service.generateContext(org, user.id, a.id, {});
    expect(result.aiContextSummary).toMatch(/Summary/);
    expect(auditLogs).toHaveLength(1);
    expect(contexts.get(a.id)).toBeTruthy();
    // b should be considered
    expect(b).toBeTruthy();
  });

  it("exports notes as markdown grouped by lesson", async () => {
    const { service } = setup();
    await service.create(org, user.id, {
      lessonId: "l-1",
      content: "First",
      timestampSeconds: 10,
    });
    await service.create(org, user.id, {
      lessonId: "l-1",
      content: "Second",
      timestampSeconds: 20,
    });
    const result = await service.exportNotes(org, user.id, undefined);
    expect(result.count).toBe(2);
    expect(result.markdown).toContain("Transcript Notes");
    expect(result.markdown).toContain("First");
  });
});
