import type { Question } from "./lms-types";
import { questionTags } from "./lms-types";

export function parseTagInput(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

export function mergeTags(existing: string[], add: string[]): string[] {
  const set = new Set([...existing, ...add].map((t) => t.toLowerCase()));
  return [...set];
}

export function allTagsFromQuestions(questions: Question[]): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    for (const t of questionTags(q)) set.add(t.toLowerCase());
  }
  return [...set].sort();
}

export function metadataWithTags(
  metadata: Record<string, unknown> | null | undefined,
  tags: string[],
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    tags: tags.map((t) => t.toLowerCase()),
  };
}
