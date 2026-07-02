import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '@/common/storage/storage.service';

export interface CertificatePdfInput {
  certificateNumber: string;
  userName: string;
  courseTitle: string;
  regionName?: string;
  issuedAt: Date;
  verifyUrl: string;
}

/**
 * PDF Certificate generator.
 *
 * Menggunakan PDFKit (lazy require). Layout:
 *  - Header: "SERTIFIKAT" + logo
 *  - Body: nama siswa, judul kursus, region
 *  - Footer: cert number, issued date, QR code
 *
 * PDF di-upload ke StorageService (MinIO/Local) untuk konsistensi delivery.
 */
@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private PDFDocument: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private QRCode: any = null;

  constructor(
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      this.PDFDocument = require('pdfkit');
    } catch {
      this.logger.warn('pdfkit belum ter-install. Jalankan: pnpm add pdfkit @types/pdfkit');
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      this.QRCode = require('qrcode');
    } catch {
      this.logger.warn('qrcode belum ter-install. Jalankan: pnpm add qrcode @types/qrcode');
    }
  }

  /**
   * Generate PDF sertifikat, simpan ke storage, dan kembalikan URL.
   */
  async generate(input: CertificatePdfInput): Promise<{ storageKey: string; publicUrl: string }> {
    const buffer = await this.buildPdf(input);
    const filename = `${input.certificateNumber}.pdf`;
    const result = await this.storage.upload({
      filename,
      mimeType: 'application/pdf',
      buffer,
      size: buffer.length,
    }, 'certificates');
    this.logger.log(`Certificate PDF generated: ${result.storageKey} (${buffer.length} bytes)`);
    return { storageKey: result.storageKey, publicUrl: result.publicUrl };
  }

  private async buildPdf(input: CertificatePdfInput): Promise<Buffer> {
    if (!this.PDFDocument) {
      throw new Error('PDFKit not available — install with: pnpm add pdfkit @types/pdfkit');
    }
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const doc = new this.PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
          info: {
            Title: `Sertifikat - ${input.courseTitle}`,
            Author: 'Kominfo AI-LMS',
            Subject: `Sertifikat untuk ${input.userName}`,
          },
        });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Border
        doc.lineWidth(3).strokeColor('#1e40af')
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();
        doc.lineWidth(1).strokeColor('#1e40af')
          .rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();

        // Header
        doc.font('Helvetica-Bold').fontSize(40).fillColor('#1e40af')
          .text('SERTIFIKAT', 0, 80, { align: 'center' });
        doc.font('Helvetica').fontSize(14).fillColor('#666')
          .text('Kompetensi Penyelesaian Kursus', 0, 130, { align: 'center' });

        // Divider
        doc.moveTo(150, 170).lineTo(doc.page.width - 150, 170).strokeColor('#1e40af').lineWidth(1).stroke();

        // Body
        doc.font('Helvetica').fontSize(14).fillColor('#333')
          .text('Diberikan kepada:', 0, 200, { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(32).fillColor('#000')
          .text(input.userName, 0, 230, { align: 'center' });
        doc.font('Helvetica').fontSize(14).fillColor('#333')
          .text('atas keberhasilan menyelesaikan kursus:', 0, 285, { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#1e40af')
          .text(input.courseTitle, 0, 315, { align: 'center' });

        if (input.regionName) {
          doc.font('Helvetica-Oblique').fontSize(12).fillColor('#666')
            .text(`Region: ${input.regionName}`, 0, 350, { align: 'center' });
        }

        // Footer info
        const issuedStr = new Intl.DateTimeFormat('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        }).format(input.issuedAt);
        doc.font('Helvetica').fontSize(11).fillColor('#555')
          .text(`Nomor: ${input.certificateNumber}`, 60, doc.page.height - 130)
          .text(`Diterbitkan: ${issuedStr}`, 60, doc.page.height - 110);

        // QR code (verification)
        if (this.QRCode) {
          const qrBuffer = await this.QRCode.toBuffer(input.verifyUrl, {
            type: 'png', errorCorrectionLevel: 'H', margin: 1, width: 120,
          });
          doc.image(qrBuffer, doc.page.width - 180, doc.page.height - 180, { width: 120 });
          doc.font('Helvetica').fontSize(8).fillColor('#888')
            .text('Scan untuk verifikasi', doc.page.width - 180, doc.page.height - 55, { width: 120, align: 'center' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
