export const PLAGIARISM_PROVIDER = Symbol.for("lms.plagiarism.provider");

export type PlagiarismMatchedSource = {
  url?: string;
  title?: string;
  excerpt?: string;
  similarityPercent: number;
};

export type PlagiarismCheckResult = {
  provider: string;
  status: "COMPLETED" | "FAILED";
  similarityScore: number;
  matchedSources: PlagiarismMatchedSource[];
  reportUrl?: string;
  details?: Record<string, unknown>;
  errorMessage?: string;
};

export type PlagiarismCheckInput = {
  organizationId: string;
  submissionId: string;
  text: string;
  fileIds: string[];
  metadata?: Record<string, unknown>;
};

export interface PlagiarismProvider {
  readonly name: string;
  check(input: PlagiarismCheckInput): Promise<PlagiarismCheckResult>;
}

export class MockPlagiarismProvider implements PlagiarismProvider {
  readonly name = "mock";

  async check(input: PlagiarismCheckInput): Promise<PlagiarismCheckResult> {
    const text = input.text ?? "";
    if (!text.trim()) {
      return {
        provider: this.name,
        status: "COMPLETED",
        similarityScore: 0,
        matchedSources: [],
        details: { reason: "empty-text" },
      };
    }
    const lower = text.toLowerCase();
    const knownReferences = [
      { key: "wikipedia", label: "Wikipedia", url: "https://wikipedia.org/" },
      { key: "coursera", label: "Coursera", url: "https://coursera.org/" },
      { key: "common", label: "Common sources", url: undefined },
    ];
    const matchedSources = knownReferences
      .filter((ref) => lower.includes(ref.key))
      .map((ref) => ({
        url: ref.url,
        title: ref.label,
        excerpt: `Detected keyword "${ref.key}"`,
        similarityPercent: 0,
      }));
    const tokens = lower.split(/\s+/).filter(Boolean);
    const distinct = new Set(tokens);
    const repetition = tokens.length
      ? Math.round(((tokens.length - distinct.size) / tokens.length) * 100)
      : 0;
    const baseScore = Math.min(95, Math.max(0, repetition * 2));
    return {
      provider: this.name,
      status: "COMPLETED",
      similarityScore: baseScore,
      matchedSources,
      details: {
        tokenCount: tokens.length,
        distinctTokenCount: distinct.size,
        repetitionPercent: repetition,
        note: "Mock provider — replace with real integration in production.",
      },
    };
  }
}
