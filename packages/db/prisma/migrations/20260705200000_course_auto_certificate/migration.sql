-- Add auto-certificate configuration fields to Course table
ALTER TABLE "Course"
  ADD COLUMN "autoCertificate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autoCertificateTemplateId" TEXT;

ALTER TABLE "Course"
  ADD CONSTRAINT "Course_autoCertificateTemplateId_fkey"
  FOREIGN KEY ("autoCertificateTemplateId")
  REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
