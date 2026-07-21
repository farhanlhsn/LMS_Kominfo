import { Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  CreateTranscriptNoteDto,
  GenerateNoteContextDto,
  SearchTranscriptNotesDto,
  UpdateTranscriptNoteDto,
} from "./dto/notes.dto";
import {
  MockNoteContextProvider,
  NOTE_CONTEXT_PROVIDER,
  type NoteContextInput,
  type NoteContextProvider,
} from "./notes.provider";

@Injectable()
export class TranscriptNoteService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(NOTE_CONTEXT_PROVIDER)
    private readonly contextProvider?: NoteContextProvider,
  ) {}

  private get provider(): NoteContextProvider {
    return this.contextProvider ?? this.fallbackProvider;
  }

  private readonly fallbackProvider = new MockNoteContextProvider();

  async list(organizationId: string, userId: string, lessonId?: string) {
    return this.prisma.transcriptNote.findMany({
      where: {
        organizationId,
        userId,
        ...(lessonId ? { lessonId } : {}),
      },
      orderBy: { timestampSeconds: "asc" },
      take: 200,
    });
  }

  async search(
    organizationId: string,
    userId: string,
    query: SearchTranscriptNotesDto,
  ) {
    const where: Prisma.TranscriptNoteWhereInput = {
      organizationId,
      userId,
    };
    if (query.lessonId) where.lessonId = query.lessonId;
    if (query.activityId) where.activityId = query.activityId;
    if (query.q) {
      const term = query.q.trim();
      if (term) {
        where.OR = [
          { content: { contains: term, mode: "insensitive" } },
          { color: { contains: term, mode: "insensitive" } },
        ];
      }
    }
    const notes = await this.prisma.transcriptNote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: query.limit ?? 50,
    });
    if (query.tags && query.tags.length > 0) {
      return notes.filter((note) => {
        const tags = Array.isArray(note.tags)
          ? (note.tags as unknown[]).filter(
              (tag): tag is string => typeof tag === "string",
            )
          : [];
        return query.tags!.some((tag) => tags.includes(tag));
      });
    }
    return notes;
  }

  async create(
    organization: OrganizationContext,
    userId: string,
    dto: CreateTranscriptNoteDto,
  ) {
    const note = await this.prisma.transcriptNote.create({
      data: {
        organizationId: organization.id,
        userId,
        lessonId: dto.lessonId,
        activityId: dto.activityId,
        timestampSeconds: dto.timestampSeconds ?? 0,
        content: dto.content,
        color: dto.color ?? "yellow",
        tags: (dto.tags ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    return note;
  }

  async update(
    organization: OrganizationContext,
    userId: string,
    noteId: string,
    dto: UpdateTranscriptNoteDto,
  ) {
    const note = await this.getNote(organization.id, userId, noteId);
    const updated = await this.prisma.transcriptNote.update({
      where: { id: note.id },
      data: {
        content: dto.content ?? note.content,
        color: dto.color ?? note.color,
        tags: dto.tags ? (dto.tags as unknown as Prisma.InputJsonValue) : (note.tags as Prisma.InputJsonValue),
        timestampSeconds: dto.timestampSeconds ?? note.timestampSeconds,
      },
    });
    return updated;
  }

  async delete(organization: OrganizationContext, userId: string, noteId: string) {
    const note = await this.getNote(organization.id, userId, noteId);
    await this.prisma.transcriptNote.delete({ where: { id: note.id } });
    return { id: note.id };
  }

  async generateContext(
    organization: OrganizationContext,
    userId: string,
    noteId: string,
    dto: GenerateNoteContextDto,
  ) {
    const note = await this.getNote(organization.id, userId, noteId);
    const candidates = await this.loadCandidates(
      organization.id,
      userId,
      note,
      dto.candidateNoteIds,
    );
    const providerInput: NoteContextInput = {
      organizationId: organization.id,
      note: {
        id: note.id,
        content: note.content,
        timestampSeconds: note.timestampSeconds,
        tags: this.asStringList(note.tags),
      },
      candidates: candidates.map((row) => ({
        id: row.id,
        content: row.content,
        timestampSeconds: row.timestampSeconds,
        tags: this.asStringList(row.tags),
      })),
    };
    const result = await this.provider.generateContext(providerInput);
    const context = await this.prisma.noteContext.upsert({
      where: { noteId: note.id },
      update: {
        aiContextSummary: result.aiContextSummary,
        relatedNotes: result.relatedNotes as unknown as Prisma.InputJsonValue,
        providerKey: result.providerKey,
        metadata: result.metadata as Prisma.InputJsonValue,
      },
      create: {
        organizationId: organization.id,
        noteId: note.id,
        aiContextSummary: result.aiContextSummary,
        relatedNotes: result.relatedNotes as unknown as Prisma.InputJsonValue,
        providerKey: result.providerKey,
        metadata: result.metadata as Prisma.InputJsonValue,
      },
    });
    await this.audit(organization.id, userId, "note.context_generated", context.id);
    return context;
  }

  async getContext(organizationId: string, userId: string, noteId: string) {
    const note = await this.getNote(organizationId, userId, noteId);
    return this.prisma.noteContext.findUnique({ where: { noteId: note.id } });
  }

  async exportNotes(
    organization: OrganizationContext,
    userId: string,
    lessonId: string | undefined,
  ) {
    const notes = await this.prisma.transcriptNote.findMany({
      where: {
        organizationId: organization.id,
        userId,
        ...(lessonId ? { lessonId } : {}),
      },
      orderBy: [{ lessonId: "asc" }, { timestampSeconds: "asc" }],
    });
    const markdown = this.toMarkdown(notes);
    const exportRow = await this.prisma.notesExport.create({
      data: {
        organizationId: organization.id,
        userId,
        lessonId,
        format: "markdown",
        status: "COMPLETED",
        markdown,
        count: notes.length,
        metadata: { noteIds: notes.map((note) => note.id) } as Prisma.InputJsonValue,
      },
    });
    return {
      id: exportRow.id,
      markdown: exportRow.markdown,
      count: exportRow.count,
      format: exportRow.format,
    };
  }

  private async loadCandidates(
    organizationId: string,
    userId: string,
    note: { id: string; lessonId: string },
    candidateIds: string[] | undefined,
  ) {
    if (candidateIds && candidateIds.length > 0) {
      const rows = await this.prisma.transcriptNote.findMany({
        where: {
          organizationId,
          userId,
          id: { in: candidateIds },
        },
      });
      // Ensure the primary note is also part of the input
      if (!rows.find((row) => row.id === note.id)) {
        rows.push(note as Awaited<typeof rows>[number]);
      }
      return rows;
    }
    return this.prisma.transcriptNote.findMany({
      where: {
        organizationId,
        userId,
        lessonId: note.lessonId,
        NOT: { id: note.id },
      },
      orderBy: { timestampSeconds: "asc" },
      take: 20,
    });
  }

  private asStringList(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  private toMarkdown(notes: Array<{
    id: string;
    lessonId: string;
    timestampSeconds: number;
    content: string;
    color: string;
    tags: Prisma.JsonValue;
  }>): string {
    if (notes.length === 0) {
      return "# Transcript Notes\n\n_No notes captured yet._\n";
    }
    const grouped = new Map<string, typeof notes>();
    for (const note of notes) {
      const existing = grouped.get(note.lessonId) ?? [];
      existing.push(note);
      grouped.set(note.lessonId, existing);
    }
    const lines: string[] = ["# Transcript Notes", ""];
    for (const [lessonId, lessonNotes] of grouped) {
      lines.push(`## Lesson \`${lessonId}\``, "");
      for (const note of lessonNotes) {
        const tags = this.asStringList(note.tags);
        const tagLabel = tags.length ? ` _${tags.join(", ")}_` : "";
        lines.push(
          `- **[${note.timestampSeconds.toFixed(0)}s]** ${note.content}${tagLabel}`,
        );
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  private async getNote(organizationId: string, userId: string, noteId: string) {
    const note = await this.prisma.transcriptNote.findFirst({
      where: { id: noteId, organizationId, userId },
    });
    if (!note) throw new NotFoundException("Transcript note not found");
    return note;
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
        entityType: "TranscriptNote",
        entityId,
        metadata: {} as Prisma.InputJsonObject,
      },
    });
  }
}
