export const SEARCH_PROVIDER = Symbol.for("lms.search.provider");

export type SearchEntityType =
  | "course"
  | "lesson"
  | "discussion"
  | "user"
  | "certificate"
  | "help_article";

export type SearchableDocument = {
  id: string;
  organizationId: string;
  type: SearchEntityType;
  title: string;
  body: string;
  tags: string[];
  metadata: Record<string, unknown>;
  updatedAt: Date;
};

export type SearchableHit = {
  id: string;
  type: SearchEntityType;
  title: string;
  snippet: string;
  score: number;
  url: string;
  metadata: Record<string, unknown>;
};

export type SearchQuery = {
  organizationId: string;
  text: string;
  types?: SearchEntityType[];
  courseId?: string;
  limit?: number;
  userId?: string;
};

export type SearchProviderResult = {
  total: number;
  hits: SearchableHit[];
  facetCounts: Record<SearchEntityType, number>;
};

export interface SearchProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchProviderResult>;
}

export type SearchableContentSource = {
  organizationId: string;
  type: SearchEntityType;
  load(): Promise<SearchableDocument[]>;
};

export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";

  private readonly documents = new Map<string, SearchableDocument[]>();

  registerSource(source: SearchableContentSource): void {
    void source.load().then((docs) => {
      this.documents.set(`${source.organizationId}::${source.type}`, docs);
    });
  }

  upsert(document: SearchableDocument): void {
    const key = `${document.organizationId}::${document.type}`;
    const list = this.documents.get(key) ?? [];
    const existingIndex = list.findIndex((doc) => doc.id === document.id);
    if (existingIndex >= 0) {
      list[existingIndex] = document;
    } else {
      list.push(document);
    }
    this.documents.set(key, list);
  }

  remove(organizationId: string, type: SearchEntityType, id: string): void {
    const key = `${organizationId}::${type}`;
    const list = this.documents.get(key) ?? [];
    this.documents.set(
      key,
      list.filter((doc) => doc.id !== id),
    );
  }

  async search(query: SearchQuery): Promise<SearchProviderResult> {
    const text = query.text.trim().toLowerCase();
    const tokens = text
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const types = (query.types && query.types.length ? query.types : [
      "course",
      "lesson",
      "discussion",
      "user",
      "certificate",
      "help_article",
    ]) as SearchEntityType[];
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));

    const hits: SearchableHit[] = [];
    const facetCounts: Record<SearchEntityType, number> = {
      course: 0,
      lesson: 0,
      discussion: 0,
      user: 0,
      certificate: 0,
      help_article: 0,
    };

    for (const type of types) {
      const list =
        this.documents.get(`${query.organizationId}::${type}`) ?? [];
      for (const doc of list) {
        if (query.courseId) {
          const courseId = doc.metadata?.courseId;
          if (typeof courseId === "string" && courseId !== query.courseId) {
            continue;
          }
        }
        const score = this.scoreDocument(doc, tokens);
        if (score <= 0) {
          continue;
        }
        facetCounts[type] += 1;
        hits.push({
          id: doc.id,
          type,
          title: doc.title,
          snippet: this.buildSnippet(doc.body, tokens),
          score,
          url: this.buildUrl(doc, type),
          metadata: doc.metadata,
        });
      }
    }

    hits.sort((a, b) => b.score - a.score);
    const top = hits.slice(0, limit);
    return {
      total: hits.length,
      hits: top,
      facetCounts,
    };
  }

  private scoreDocument(doc: SearchableDocument, tokens: string[]): number {
    if (tokens.length === 0) {
      return 0;
    }
    const titleLower = doc.title.toLowerCase();
    const bodyLower = doc.body.toLowerCase();
    const tagsLower = doc.tags.map((tag) => tag.toLowerCase());
    let score = 0;
    for (const token of tokens) {
      if (titleLower.includes(token)) score += 10;
      if (tagsLower.some((tag) => tag.includes(token))) score += 5;
      if (bodyLower.includes(token)) score += 2;
    }
    return score;
  }

  private buildSnippet(body: string, tokens: string[]): string {
    if (!body) {
      return "";
    }
    const lower = body.toLowerCase();
    for (const token of tokens) {
      const index = lower.indexOf(token);
      if (index >= 0) {
        const start = Math.max(0, index - 40);
        const end = Math.min(body.length, index + 120);
        return (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
      }
    }
    return body.slice(0, 160) + (body.length > 160 ? "…" : "");
  }

  private buildUrl(doc: SearchableDocument, type: SearchEntityType): string {
    switch (type) {
      case "course":
        return `/courses/${doc.id}`;
      case "lesson":
        return `/learn/lessons/${doc.id}`;
      case "discussion":
        return `/discussions/${doc.id}`;
      case "user":
        return `/profile/${doc.id}`;
      case "certificate":
        return `/certificates/${doc.id}`;
      case "help_article":
        return `/help/${doc.id}`;
      default:
        return `/search?type=${type}&id=${doc.id}`;
    }
  }
}
