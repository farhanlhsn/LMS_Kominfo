import { Injectable } from '@nestjs/common';

export interface ChunkOptions {
  /** Target ukuran chunk dalam karakter (default 2400 ≈ 800 token) */
  chunkSize?: number;
  /** Overlap antar chunk untuk konteks (default 400 ≈ 150 token) */
  overlap?: number;
  /** Prioritas pemisah (semakin tinggi = semakin didahulukan) */
  separators?: string[];
}

export interface TextChunk {
  index: number;
  content: string;
  tokenCount: number;
}

/**
 * Chunker teks untuk RAG.
 *
 * Implementasi: recursive text splitter ala LangChain (sederhana).
 * Pemisah dengan prioritas: paragraf > kalimat > kata > karakter.
 *
 * Karakter → token ratio diasumsikan ~3:1 untuk bahasa Indonesia & Inggris.
 */
@Injectable()
export class ChunkerService {
  private readonly defaultSeparators = ['\n\n', '\n', '. ', '.', '! ', '? ', '; ', ', ', ' '];

  split(text: string, opts: ChunkOptions = {}): TextChunk[] {
    const chunkSize = opts.chunkSize ?? 2400;
    const overlap = opts.overlap ?? 400;
    const separators = opts.separators ?? this.defaultSeparators;

    if (!text || text.trim().length === 0) return [];

    const normalized = text.replace(/\r\n/g, '\n').trim();

    // Jika teks sudah cukup pendek, langsung kembalikan sebagai satu chunk
    if (normalized.length <= chunkSize) {
      return [{
        index: 0,
        content: normalized,
        tokenCount: this.estimateTokens(normalized),
      }];
    }

    const pieces = this.recursiveSplit(normalized, separators, chunkSize);
    const chunks: TextChunk[] = [];
    let current = '';
    let buffer = '';

    for (const piece of pieces) {
      // Jika piece sendiri > chunkSize, paksa split per karakter
      if (piece.length > chunkSize) {
        if (current) {
          chunks.push(this.makeChunk(chunks.length, current));
          current = '';
        }
        for (let i = 0; i < piece.length; i += chunkSize - overlap) {
          const segment = piece.slice(i, i + chunkSize);
          chunks.push(this.makeChunk(chunks.length, segment));
        }
        continue;
      }

      const candidate = (current ? current + ' ' : '') + piece;
      if (candidate.length > chunkSize) {
        chunks.push(this.makeChunk(chunks.length, current));
        // Overlap: simpan tail dari chunk sebelumnya
        buffer = current.slice(Math.max(0, current.length - overlap));
        current = buffer ? buffer + ' ' + piece : piece;
      } else {
        current = candidate;
      }
    }

    if (current.trim()) chunks.push(this.makeChunk(chunks.length, current));

    return chunks;
  }

  private recursiveSplit(text: string, separators: string[], chunkSize: number): string[] {
    const finalChunks: string[] = [];
    let separatorsToUse = [...separators];

    if (text.length <= chunkSize) {
      return [text];
    }

    let separator: string | undefined = separatorsToUse.shift();
    while (separator === '' && separatorsToUse.length) separator = separatorsToUse.shift();

    if (!separator) {
      // Tidak ada separator lagi, hard split per karakter
      const out: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        out.push(text.slice(i, i + chunkSize));
      }
      return out;
    }

    const splits = text.split(separator);
    let goodSplits: string[] = [];
    for (const s of splits) {
      if (s.length < chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length) {
          finalChunks.push(goodSplits.join(separator));
          goodSplits = [];
        }
        finalChunks.push(...this.recursiveSplit(s, separatorsToUse, chunkSize));
      }
    }
    if (goodSplits.length) finalChunks.push(goodSplits.join(separator));
    return finalChunks;
  }

  private makeChunk(index: number, content: string): TextChunk {
    return {
      index,
      content: content.trim(),
      tokenCount: this.estimateTokens(content),
    };
  }

  /** Estimasi kasar token (3 chars ≈ 1 token). */
  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 3));
  }
}
