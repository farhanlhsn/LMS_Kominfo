import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: CertificatePdfService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async generateCertificate(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { user: true, course: { include: { region: true } } },
    });

    if (!enrollment || enrollment.status !== 'COMPLETED') {
      throw new NotFoundException('Course not completed or not enrolled');
    }

    const existingCert = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingCert) return existingCert;

    // Generate unique cert number
    const certNumber = `KMNFO-${courseId.substring(0, 8).toUpperCase()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    // Generate PDF
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:4000';
    const verifyUrl = `${appUrl}/api/v1/certificates/verify/${certNumber}`;
    const { publicUrl } = await this.pdfService.generate({
      certificateNumber: certNumber,
      userName: enrollment.user.name,
      courseTitle: enrollment.course.title,
      regionName: enrollment.course.region?.name,
      issuedAt: new Date(),
      verifyUrl,
    });

    const certificate = await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateNumber: certNumber,
        pdfUrl: publicUrl,
      },
    });

    // Kirim notifikasi ke siswa
    await this.notificationsService.create({
      userId,
      title: 'Selamat! Sertifikat Anda telah terbit 🎉',
      body: `Sertifikat untuk kursus "${enrollment.course.title}" sudah tersedia. Nomor: ${certNumber}`,
      type: 'SUCCESS' as any,
    });

    this.logger.log(`Generated certificate ${certNumber} for user ${userId}`);
    return certificate;
  }

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { title: true, thumbnailUrl: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async verifyCertificate(certificateNumber: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert) throw new NotFoundException('Certificate not found or invalid');
    return cert;
  }
}
