import { Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { FilesService } from "../files/files.service";
import { PrismaService } from "../prisma/prisma.service";

type CertificateStatus = "VALID" | "REVOKED" | "EXPIRED";

@Injectable()
export class CertificatePdfService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async ensureGenerated(organizationId: string, certificateId: string, force = false) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, organizationId },
      include: { organization: true, course: true, user: true, template: true, pdfFile: true },
    });
    if (!certificate) throw new NotFoundException("Certificate not found");

    const currentStatus = this.status(certificate.revokedAt, certificate.expiresAt);
    const metadata = this.jsonObject(certificate.metadata);
    if (
      !force &&
      certificate.pdfStatus === "GENERATED" &&
      certificate.pdfFile &&
      !certificate.pdfFile.deletedAt &&
      metadata.pdfCertificateStatus === currentStatus
    ) {
      return certificate;
    }

    await this.prisma.certificate.update({
      where: { id: certificate.id },
      data: { pdfStatus: "GENERATING", pdfError: null },
    });

    try {
      const verificationUrl = this.verificationUrl(certificate.verificationCode);
      const qrCode = await QRCode.toBuffer(verificationUrl, {
        type: "png",
        width: 220,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      const pdf = await this.render({
        learnerName: certificate.user.name ?? "Learner",
        courseTitle: certificate.course.title,
        organizationName: certificate.organization.name,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        verificationUrl,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        status: currentStatus,
        qrCode,
      });
      const stored = await this.files.createManagedFile({
        organizationId,
        ownerId: certificate.userId,
        filename: this.filename(certificate.course.title, certificate.user.name ?? "learner"),
        body: pdf,
        mimeType: "application/pdf",
        purpose: "CERTIFICATE",
        metadata: { certificateId: certificate.id, courseId: certificate.courseId },
      });
      const generated = await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          pdfFileId: stored.id,
          pdfStatus: "GENERATED",
          pdfGeneratedAt: new Date(),
          pdfError: null,
          metadata: {
            ...metadata,
            verificationUrl,
            pdfCertificateStatus: currentStatus,
          } as Prisma.InputJsonObject,
        },
        include: { organization: true, course: true, user: true, template: true, pdfFile: true },
      });
      if (certificate.pdfFileId && certificate.pdfFileId !== stored.id) {
        try {
          await this.files.deleteManagedFile(organizationId, certificate.pdfFileId);
        } catch {
          // The new PDF remains usable; stale storage cleanup can be retried operationally.
        }
      }
      return generated;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown PDF generation error";
      await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfStatus: "FAILED", pdfError: message },
      });
      throw new InternalServerErrorException("Certificate PDF generation failed");
    }
  }

  status(revokedAt: Date | null, expiresAt: Date | null): CertificateStatus {
    if (revokedAt) return "REVOKED";
    if (expiresAt && expiresAt.getTime() < Date.now()) return "EXPIRED";
    return "VALID";
  }

  private render(input: {
    learnerName: string;
    courseTitle: string;
    organizationName: string;
    certificateNumber: string;
    verificationCode: string;
    verificationUrl: string;
    issuedAt: Date;
    expiresAt: Date | null;
    status: CertificateStatus;
    qrCode: Buffer;
  }) {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 42, info: { Title: "Course Certificate" } });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);

      const teal = "#0f766e";
      const ink = "#17324d";
      document.rect(24, 24, 794, 547).lineWidth(3).stroke(teal);
      document.rect(32, 32, 778, 531).lineWidth(0.8).stroke("#94a3b8");
      document.fillColor(teal).font("Helvetica-Bold").fontSize(13).text("LEARNING CERTIFICATE", 60, 58, { align: "center", width: 720, characterSpacing: 2 });
      document.fillColor(ink).font("Helvetica-Bold").fontSize(34).text("Certificate of Completion", 80, 94, { align: "center", width: 680 });
      document.fillColor("#475569").font("Helvetica").fontSize(13).text("This certificate is presented to", 80, 151, { align: "center", width: 680 });
      document.fillColor(ink).font("Helvetica-Bold").fontSize(27).text(this.clean(input.learnerName), 95, 181, { align: "center", width: 650 });
      document.moveTo(210, 218).lineTo(630, 218).lineWidth(1).stroke("#cbd5e1");
      document.fillColor("#475569").font("Helvetica").fontSize(13).text("for successfully completing", 80, 235, { align: "center", width: 680 });
      document.fillColor(teal).font("Helvetica-Bold").fontSize(23).text(this.clean(input.courseTitle), 110, 263, { align: "center", width: 620 });
      document.fillColor(ink).font("Helvetica-Bold").fontSize(14).text(this.clean(input.organizationName), 80, 314, { align: "center", width: 680 });

      const issue = this.date(input.issuedAt);
      const expiry = input.expiresAt ? this.date(input.expiresAt) : "No expiry";
      document.fillColor("#475569").font("Helvetica").fontSize(10)
        .text(`Issued: ${issue}`, 92, 365)
        .text(`Expires: ${expiry}`, 92, 382)
        .text(`Certificate no: ${this.clean(input.certificateNumber)}`, 92, 399)
        .text(`Status: ${input.status}`, 92, 416);
      document.image(input.qrCode, 646, 354, { width: 92, height: 92 });
      document.fillColor("#475569").fontSize(8).text(`Verification code: ${this.clean(input.verificationCode)}`, 568, 452, { align: "center", width: 248 });
      document.fontSize(7).text(this.clean(input.verificationUrl), 493, 468, { align: "center", width: 323 });
      document.fillColor("#64748b").fontSize(8).text("Verify this certificate using the QR code or verification URL.", 80, 510, { align: "center", width: 680 });
      document.end();
    });
  }

  private verificationUrl(code: string) {
    const configured = process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    let base: URL;
    try {
      base = new URL(configured);
    } catch {
      base = new URL("http://localhost:3000");
    }
    if (!['http:', 'https:'].includes(base.protocol)) base = new URL("http://localhost:3000");
    return new URL(`/certificates/verify/${encodeURIComponent(code)}`, base).toString();
  }

  private filename(course: string, learner: string) {
    const slug = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "certificate";
    return `certificate-${slug(course)}-${slug(learner)}.pdf`;
  }

  private clean(value: string) {
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  }

  private date(value: Date) {
    return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(value);
  }

  private jsonObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Prisma.JsonValue] => entry[1] !== undefined));
  }
}
