import { Injectable } from "@nestjs/common";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { htmlToPlainText } from "@lms/shared";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class AiTextExtractorService {
  constructor(private readonly storage: StorageService) {}

  fromRichContent(textContent: string | null, body: unknown): string {
    if (textContent?.trim()) return textContent.trim();
    if (!body || typeof body !== "object" || Array.isArray(body)) return "";
    const record = body as Record<string, unknown>;
    const candidate = [record.html, record.text, record.content].find(
      (value) => typeof value === "string",
    ) as string | undefined;
    return candidate ? htmlToPlainText(candidate) : "";
  }

  async fromFile(file: {
    bucket: string;
    key: string;
    mimeType: string;
    originalFilename: string;
  }): Promise<string> {
    const buffer = await this.storage.getFile(file.bucket, file.key);
    if (file.mimeType === "text/plain" || file.mimeType === "text/markdown") {
      return buffer.toString("utf8").trim();
    }
    if (file.mimeType === "application/pdf") {
      const result = await pdfParse(buffer);
      return result.text.trim();
    }
    if (
      file.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    throw new Error(`Text extraction is not supported for ${file.mimeType}`);
  }
}
