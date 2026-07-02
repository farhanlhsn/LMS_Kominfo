import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AiGateway } from '../gateway/ai.gateway';
import { ChunkerService, TextChunk } from '../chunker/chunker.service';

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  courseId: string;
  chunkIndex: number;
}

export interface IngestResult {
  lessonId: string;
  chunksCreated: number;
  totalTokens: number;
}

/**
 * RAG (Retrieval-Augmented Generation) service.
 *
 * Tanggung jawab:
 *  - Ingest teks → chunk → embed → simpan ke tabel Embedding (pgvector)
 *  - Retrieve: cari top-K chunk paling relevan dengan query menggunakan cosine
 *    similarity (melalui raw SQL pgvector)
 *  - Generate prompt dengan sitasi untuk AI Tutor
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGateway,
    private readonly chunker: ChunkerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ingest teks materi menjadi embeddings di pgvector.
   * Menghapus embedding lama untuk lesson yang sama sebelum re-ingest.
   */
  async ingestLessonText(lessonId: string, text: string): Promise<IngestResult> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

    const chunks = this.chunker.split(text);
    if (chunks.length === 0) {
      return { lessonId, chunksCreated: 0, totalTokens: 0 };
    }

    // Hapus embedding lama untuk idempotency
    await this.prisma.embedding.deleteMany({ where: { lessonId } });

    // Embed batch
    const texts = chunks.map((c) => c.content);
    const { embeddings, usage } = await this.aiGateway.embedBatch(texts);
    this.logger.log(`Embedded ${chunks.length} chunks (${usage.totalTokens} tokens) for lesson ${lessonId}`);

    // Insert ke tabel Embedding — menggunakan raw SQL karena tipe column vector
    await this.insertEmbeddings(lessonId, chunks, embeddings);

    const totalTokens = chunks.reduce((s, c) => s + c.tokenCount, 0);
    return { lessonId, chunksCreated: chunks.length, totalTokens };
  }

  private async insertEmbeddings(lessonId: string, chunks: TextChunk[], embeddings: number[][]): Promise<void> {
    // Insert satu per satu (tidak ideal, tapi Prisma belum support vector native).
    // Untuk volume besar, idealnya COPY/INSERT batch.
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vec = embeddings[i];
      const vecLiteral = `[${vec.join(',')}]`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any).$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "lessonId", "chunkIndex", content, embedding, "tokenCount", "createdAt")
         VALUES (gen_random_uuid()::uuid, $1::uuid, $2, $3, $4::vector, $5, now())`,
        lessonId,
        chunk.index,
        chunk.content,
        vecLiteral,
        chunk.tokenCount,
      );
    }
  }

  /**
   * Retrieve top-K chunk paling relevan dengan query. Menggunakan cosine
   * distance pgvector (`<=>`).
   *
   * @param scope Optional: batasi pencarian ke lessonId/courseId tertentu
   */
  async retrieve(query: string, topK = 5, scope?: { lessonId?: string; courseId?: string }): Promise<RetrievedChunk[]> {
    const { embedding } = await this.aiGateway.embed(query);
    const vecLiteral = `[${embedding.join(',')}]`;

    // Build WHERE clause berdasarkan scope
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [vecLiteral];
    let whereExtra = '';
    if (scope?.lessonId) {
      params.push(scope.lessonId);
      whereExtra += ` AND e."lessonId" = $${params.length}::uuid`;
    }
    if (scope?.courseId) {
      params.push(scope.courseId);
      whereExtra += ` AND l."moduleId" IN (SELECT id FROM "Module" WHERE "courseId" = $${params.length}::uuid)`;
    }
    params.push(topK);

    // Cosine distance: 0 = identik, 1 = ortogonal. Score = 1 - distance.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await (this.prisma as any).$queryRawUnsafe(
      `SELECT e.id, e.content, e."chunkIndex", e."lessonId",
              l.title as "lessonTitle", l."moduleId",
              m."courseId" as "courseId",
              1 - (e.embedding <=> $1::vector) as score
         FROM "Embedding" e
         JOIN "Lesson" l ON l.id = e."lessonId"
         JOIN "Module" m ON m.id = l."moduleId"
        WHERE 1=1 ${whereExtra}
        ORDER BY e.embedding <=> $1::vector
        LIMIT $${params.length}`,
      ...params,
    );

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      score: Number(r.score),
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle,
      moduleId: r.moduleId,
      courseId: r.courseId,
      chunkIndex: r.chunkIndex,
    }));
  }

  /**
   * Build prompt untuk AI Tutor dengan konteks RAG dan sitasi.
   */
  buildPromptWithContext(question: string, retrieved: RetrievedChunk[]): string {
    if (retrieved.length === 0) {
      return `Kamu adalah AI Tutor untuk Kominfo AI-LMS. Jawab pertanyaan berikut dalam bahasa Indonesia dengan jelas dan ringkas. Jika tidak yakin, sampaikan bahwa kamu tidak memiliki informasi tersebut.\n\nPertanyaan: ${question}`;
    }

    const context = retrieved
      .map((r, i) => `[Sumber ${i + 1}] (Pelajaran: "${r.lessonTitle}", Chunk ${r.chunkIndex}, Skor: ${(r.score * 100).toFixed(0)}%)\n${r.content}`)
      .join('\n\n---\n\n');

    return `Kamu adalah AI Tutor untuk Kominfo AI-LMS. Jawab pertanyaan siswa HANYA berdasarkan konteks materi di bawah. Gunakan bahasa Indonesia yang jelas. Selalu cantumkan sitasi dalam format [Sumber N] untuk klaim yang diambil dari konteks. Jika konteks tidak cukup, sampaikan bahwa kamu tidak yakin.

KONTEKS MATERI:
${context}

PERTANYAAN SISWA: ${question}

JAWABAN (dengan sitasi):`;
  }
}
