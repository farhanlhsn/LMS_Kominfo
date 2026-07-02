import { Injectable, Logger, UnsupportedMediaTypeException } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';

/**
 * Extractor teks dari berbagai format materi.
 *
 * - PDF       → pdf-parse
 * - DOCX      → mammoth
 * - PPTX/XLSX → masih basic (raw text) — tambahkan officeparser nanti
 * - TXT/MD/CSV → raw read
 *
 * Dependensi: pdf-parse, mammoth. Package lain bisa ditambahkan bertahap.
 */
@Injectable()
export class ExtractorService {
  private readonly logger = new Logger(ExtractorService.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Ekstrak teks dari file di storage berdasarkan material metadata.
   * @param storageKey Path di storage provider
   * @param mimeType MIME type file
   * @param provider 'MINIO' | 'LOCAL'
   */
  async extract(storageKey: string, mimeType: string, provider: 'MINIO' | 'LOCAL' = 'LOCAL'): Promise<string> {
    const buffer = await this.readBuffer(storageKey, provider);
    return this.extractFromBuffer(buffer, mimeType, storageKey);
  }

  async extractFromBuffer(buffer: Buffer, mimeType: string, filename = ''): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop() || '';

    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return this.extractPdf(buffer);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      return this.extractDocx(buffer);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      ext === 'pptx'
    ) {
      return this.extractPptx(buffer);
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === 'xlsx'
    ) {
      return this.extractXlsx(buffer);
    }
    if (mimeType.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext)) {
      return buffer.toString('utf-8');
    }

    throw new UnsupportedMediaTypeException(`Tipe file ${mimeType || ext} tidak didukung untuk ekstraksi.`);
  }

  // ===== Format-specific extractors =====

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err) {
      this.logger.warn(`pdf-parse error: ${(err as Error).message}. Install dengan: pnpm add pdf-parse`);
      return '';
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err) {
      this.logger.warn(`mammoth error: ${(err as Error).message}`);
      return '';
    }
  }

  private async extractPptx(buffer: Buffer): Promise<string> {
    // PPTX is a ZIP; extract text from XML parts minimal-implementation.
    // Untuk produksi gunakan officeparser/parse-pptx. Di sini placeholder.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const JSZip = require('jszip').default || require('jszip');
      const zip = await JSZip.loadAsync(buffer);
      const slideTexts: string[] = [];
      const slideFiles = Object.keys(zip.files)
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
        .sort();
      for (const f of slideFiles) {
        const xml = await zip.files[f].async('string');
        const text = xml
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text) slideTexts.push(text);
      }
      return slideTexts.join('\n\n');
    } catch (err) {
      this.logger.warn(`pptx extract error: ${(err as Error).message}. Tambahkan officeparser untuk hasil lebih baik.`);
      return '';
    }
  }

  private async extractXlsx(buffer: Buffer): Promise<string> {
    // Placeholder — gunakan xlsx package di fase berikutnya
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const JSZip = require('jszip').default || require('jszip');
      const zip = await JSZip.loadAsync(buffer);
      const sheetTexts: string[] = [];
      const sheetFiles = Object.keys(zip.files)
        .filter((k) => /^xl\/sharedStrings\.xml$/.test(k) || /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
      for (const f of sheetFiles) {
        const xml = await zip.files[f].async('string');
        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) sheetTexts.push(text);
      }
      return sheetTexts.join('\n\n');
    } catch (err) {
      this.logger.warn(`xlsx extract error: ${(err as Error).message}`);
      return '';
    }
  }

  // ===== Storage helper =====

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async readBuffer(storageKey: string, provider: 'MINIO' | 'LOCAL'): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage: any = this.storage;
    if (provider === 'MINIO' && storage.client) {
      const stream = await storage.client.getObject(storage.bucket, storageKey);
      return this.streamToBuffer(stream);
    }
    const path = `${process.cwd()}/uploads/${storageKey}`;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const fs = require('fs');
    return fs.promises.readFile(path);
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
