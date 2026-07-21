import { Injectable } from "@nestjs/common";
import { estimateTokens } from "./ai-provider.types";

export interface AiTextChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

@Injectable()
export class AiChunkerService {
  chunk(
    text: string,
    targetCharacters = 1200,
    overlapCharacters = 180,
  ): AiTextChunk[] {
    const normalized = text
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!normalized) return [];
    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
    const chunks: string[] = [];
    let current = "";

    const flush = () => {
      if (!current.trim()) return;
      chunks.push(current.trim());
      current = current
        .slice(Math.max(0, current.length - overlapCharacters))
        .trim();
    };

    for (const paragraph of paragraphs) {
      const pieces =
        paragraph.length > targetCharacters
          ? (paragraph.match(
              // Clamp width so attacker-controlled config cannot inflate ReDoS risk.
              new RegExp(
                `.{1,${Math.min(Math.max(1, targetCharacters | 0), 8000)}}(?:\\s|$)`,
                "gs",
              ),
            ) ?? [paragraph])
          : [paragraph];
      for (const piece of pieces) {
        if (current && current.length + piece.length + 2 > targetCharacters)
          flush();
        current = `${current}${current ? "\n\n" : ""}${piece.trim()}`;
      }
    }
    flush();

    return chunks.map((content, chunkIndex) => ({
      content,
      chunkIndex,
      tokenCount: estimateTokens(content),
    }));
  }
}
