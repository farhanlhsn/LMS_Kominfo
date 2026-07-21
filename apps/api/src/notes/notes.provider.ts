export const NOTE_CONTEXT_PROVIDER = Symbol.for("lms.noteContext.provider");

export type NoteContextCandidateNote = {
  id: string;
  content: string;
  timestampSeconds?: number;
  tags?: string[];
};

export type NoteContextInput = {
  organizationId: string;
  note: NoteContextCandidateNote;
  candidates: NoteContextCandidateNote[];
};

export type NoteContextResult = {
  providerKey: string;
  aiContextSummary: string;
  relatedNotes: { id: string; relevance: number; reason: string }[];
  metadata: Record<string, unknown>;
};

export interface NoteContextProvider {
  readonly name: string;
  generateContext(input: NoteContextInput): Promise<NoteContextResult>;
}

export class MockNoteContextProvider implements NoteContextProvider {
  readonly name = "mock";

  async generateContext(input: NoteContextInput): Promise<NoteContextResult> {
    const tokens = this.tokenize(input.note.content);
    const relatedNotes = input.candidates
      .filter((candidate) => candidate.id !== input.note.id)
      .map((candidate) => {
        const candidateTokens = this.tokenize(candidate.content);
        const overlap = tokens.filter((token) => candidateTokens.includes(token));
        const relevance = candidateTokens.length === 0
          ? 0
          : overlap.length / candidateTokens.length;
        return {
          id: candidate.id,
          relevance: Number(relevance.toFixed(2)),
          reason: overlap.length === 0
            ? "no lexical overlap"
            : `overlap on ${overlap.slice(0, 3).join(", ")}`,
        };
      })
      .filter((entry) => entry.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
    const summary = this.summarize(input.note.content, tokens.length);
    return {
      providerKey: this.name,
      aiContextSummary: summary,
      relatedNotes,
      metadata: {
        tokenCount: tokens.length,
        candidateCount: input.candidates.length,
        note: "Mock provider — replace with real AI integration in production.",
      },
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length > 2);
  }

  private summarize(content: string, tokenCount: number): string {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return "Empty note — add a transcript excerpt to generate context.";
    }
    if (trimmed.length <= 240) {
      return `Summary: ${trimmed}`;
    }
    return `Summary (${tokenCount} tokens): ${trimmed.slice(0, 220)}…`;
  }
}
