import type { Question, QuestionType } from "./lms-types";

const TYPES = new Set<QuestionType>([
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "NUMERIC",
]);

export type CsvQuestionRow = {
  type: QuestionType;
  prompt: string;
  points: number;
  explanation?: string;
  acceptedAnswers?: string[];
  numericTolerance?: number;
  options?: Array<{ text: string; isCorrect: boolean }>;
};

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Export bank questions to a simple CSV (Moodle-lite). */
export function questionsToCsv(questions: Question[]): string {
  const header = [
    "type",
    "prompt",
    "points",
    "explanation",
    "acceptedAnswers",
    "numericTolerance",
    "options",
  ];
  const lines = [header.join(",")];
  for (const q of questions) {
    const options = (q.options ?? [])
      .map((o) => `${o.isCorrect ? "*" : ""}${o.text.replace(/\|/g, "/")}`)
      .join("|");
    lines.push(
      [
        q.type,
        escapeCsv(q.prompt),
        String(q.points ?? 1),
        escapeCsv(q.explanation ?? ""),
        escapeCsv((q.acceptedAnswers ?? []).join("|")),
        String(q.numericTolerance ?? ""),
        escapeCsv(options),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Minimal CSV parser: handles quotes, commas, newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  while (i < src.length) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export function csvToQuestions(text: string): CsvQuestionRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const out: CsvQuestionRow[] = [];
  for (const row of rows.slice(1)) {
    const typeRaw = (row[idx("type")] ?? "SHORT_ANSWER").trim().toUpperCase();
    const type = (TYPES.has(typeRaw as QuestionType)
      ? typeRaw
      : "SHORT_ANSWER") as QuestionType;
    const prompt = (row[idx("prompt")] ?? "").trim();
    if (prompt.length < 2) continue;
    const points = Number(row[idx("points")] ?? 1) || 1;
    const explanation = (row[idx("explanation")] ?? "").trim() || undefined;
    const acceptedRaw = (row[idx("acceptedanswers")] ?? "").trim();
    const acceptedAnswers = acceptedRaw
      ? acceptedRaw.split("|").map((s) => s.trim()).filter(Boolean)
      : [];
    const numericTolerance = Number(row[idx("numerictolerance")] ?? 0) || 0;
    const optionsRaw = (row[idx("options")] ?? "").trim();
    let options: Array<{ text: string; isCorrect: boolean }> | undefined;
    if (optionsRaw) {
      options = optionsRaw.split("|").map((part) => {
        const star = part.startsWith("*");
        const text = (star ? part.slice(1) : part).trim();
        return { text, isCorrect: star };
      }).filter((o) => o.text);
    } else if (type === "TRUE_FALSE") {
      const correct = acceptedAnswers[0]?.toLowerCase() === "false" ? "False" : "True";
      options = [
        { text: "True", isCorrect: correct === "True" },
        { text: "False", isCorrect: correct === "False" },
      ];
    }
    out.push({
      type,
      prompt,
      points,
      explanation,
      acceptedAnswers,
      numericTolerance: type === "NUMERIC" ? numericTolerance : undefined,
      options,
    });
  }
  return out;
}

export function downloadText(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
