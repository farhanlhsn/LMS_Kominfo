import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AdminCertificateTemplatesController,
  InstructorCertificatesController,
  LearnerCertificatesController,
  PublicCertificateVerificationController,
} from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import { EngagementModule } from "../engagement/engagement.module";
import { FilesModule } from "../files/files.module";
import { CertificatePdfService } from "./certificate-pdf.service";

@Module({
  imports: [PrismaModule, EngagementModule, FilesModule],
  controllers: [
    AdminCertificateTemplatesController,
    InstructorCertificatesController,
    LearnerCertificatesController,
    PublicCertificateVerificationController,
  ],
  providers: [CertificatesService, CertificatePdfService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
