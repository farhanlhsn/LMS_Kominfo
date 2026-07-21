export type CaptionCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

const timePattern =
  /(?:(\d{2}):)?(\d{2}):(\d{2})(?:[.,](\d{1,3}))?/;

function parseTimestamp(value: string) {
  const match = value.trim().match(timePattern);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const milliseconds = Number((match[4] ?? "0").padEnd(3, "0"));
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

export function normalizeCaptionCues(cues: CaptionCue[]) {
  const normalized = cues
    .map((cue) => ({
      startSeconds: Number(cue.startSeconds),
      endSeconds: Number(cue.endSeconds),
      text: cue.text.trim(),
    }))
    .filter(
      (cue) =>
        Number.isFinite(cue.startSeconds) &&
        Number.isFinite(cue.endSeconds) &&
        cue.startSeconds >= 0 &&
        cue.endSeconds > cue.startSeconds &&
        cue.text.length > 0,
    )
    .sort((left, right) => left.startSeconds - right.startSeconds);
  return normalized.map((cue, index) => ({
    ...cue,
    startSeconds:
      index > 0 && cue.startSeconds < normalized[index - 1]!.startSeconds
        ? normalized[index - 1]!.startSeconds
        : cue.startSeconds,
  }));
}

export function parseCaptionContent(rawContent: string) {
  const normalized = rawContent
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalized) return [];

  const withoutHeader = normalized.replace(/^WEBVTT\s*\n/i, "");
  const blocks = withoutHeader.split(/\n{2,}/);
  const cues: CaptionCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (/^(NOTE|STYLE|REGION)\b/i.test(lines[0] ?? "")) continue;

    const timestampIndex = lines.findIndex((line) => line.includes("-->"));
    if (timestampIndex === -1) continue;
    const timestampLine = lines[timestampIndex]!;
    const [startRaw, endRaw] = timestampLine.split("-->").map((part) => part.trim());
    const startSeconds = parseTimestamp(startRaw ?? "");
    const endSeconds = parseTimestamp(endRaw?.split(/\s+/)[0] ?? "");
    if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds) {
      continue;
    }
    const text = lines
      .slice(timestampIndex + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) continue;
    cues.push({ startSeconds, endSeconds, text });
  }

  return normalizeCaptionCues(cues);
}

export function cuesToTranscriptSegments(cues: CaptionCue[], language?: string) {
  return normalizeCaptionCues(cues).map((cue, index) => ({
    startSeconds: cue.startSeconds,
    endSeconds: cue.endSeconds,
    text: cue.text,
    language,
    orderIndex: index,
  }));
}
