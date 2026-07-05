-- Phase 21: Data Governance & Backup
-- Phase 22: OAuth, Captcha, MFA
-- Phase 26: Moderation, Legal, Consent

-- ===========================================================================
-- Enums (Phase 21)
-- ===========================================================================

CREATE TYPE "LegalDocumentType" AS ENUM (
  'PRIVACY_POLICY',
  'TERMS',
  'COOKIE_POLICY',
  'DPA'
);

CREATE TYPE "BackupJobType" AS ENUM (
  'FULL',
  'INCREMENTAL'
);

CREATE TYPE "BackupJobStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED'
);

-- ===========================================================================
-- Enums (Phase 22)
-- ===========================================================================

CREATE TYPE "OAuthProvider" AS ENUM (
  'GOOGLE',
  'MICROSOFT'
);

CREATE TYPE "MfaFactorType" AS ENUM (
  'TOTP',
  'BACKUP_CODE'
);

-- ===========================================================================
-- Enums (Phase 26)
-- ===========================================================================

CREATE TYPE "ModerationTargetType" AS ENUM (
  'CONTENT',
  'USER',
  'COMMENT',
  'COURSE',
  'DISCUSSION'
);

CREATE TYPE "ModerationReportStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'DISMISSED'
);

CREATE TYPE "ModerationActionType" AS ENUM (
  'WARN',
  'SUSPEND',
  'BAN',
  'REMOVE',
  'RESTORE',
  'LOCK'
);

-- ===========================================================================
-- Phase 21: Legal Document
-- ===========================================================================

CREATE TABLE "LegalDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocument_organizationId_type_version_key"
  ON "LegalDocument"("organizationId", "type", "version");
CREATE INDEX "LegalDocument_organizationId_type_idx"
  ON "LegalDocument"("organizationId", "type");

ALTER TABLE "LegalDocument"
  ADD CONSTRAINT "LegalDocument_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Consent Record
-- ===========================================================================

CREATE TABLE "ConsentRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT,
  "documentType" "LegalDocumentType" NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentRecord_organizationId_userId_idx"
  ON "ConsentRecord"("organizationId", "userId");
CREATE INDEX "ConsentRecord_organizationId_documentType_idx"
  ON "ConsentRecord"("organizationId", "documentType");

ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Data Export Request
-- ===========================================================================

CREATE TABLE "DataExportRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "downloadUrl" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataExportRequest_organizationId_userId_idx"
  ON "DataExportRequest"("organizationId", "userId");
CREATE INDEX "DataExportRequest_organizationId_status_idx"
  ON "DataExportRequest"("organizationId", "status");

ALTER TABLE "DataExportRequest"
  ADD CONSTRAINT "DataExportRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Anonymization Request
-- ===========================================================================

CREATE TABLE "AnonymizationRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "reason" TEXT,
  CONSTRAINT "AnonymizationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnonymizationRequest_organizationId_userId_idx"
  ON "AnonymizationRequest"("organizationId", "userId");
CREATE INDEX "AnonymizationRequest_organizationId_status_idx"
  ON "AnonymizationRequest"("organizationId", "status");

ALTER TABLE "AnonymizationRequest"
  ADD CONSTRAINT "AnonymizationRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Retention Policy
-- ===========================================================================

CREATE TABLE "RetentionPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL DEFAULT 365,
  "anonymize" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RetentionPolicy_organizationId_entityType_key"
  ON "RetentionPolicy"("organizationId", "entityType");
CREATE INDEX "RetentionPolicy_organizationId_idx"
  ON "RetentionPolicy"("organizationId");

ALTER TABLE "RetentionPolicy"
  ADD CONSTRAINT "RetentionPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Backup Job
-- ===========================================================================

CREATE TABLE "BackupJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "BackupJobType" NOT NULL,
  "status" "BackupJobStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "sizeBytes" BIGINT,
  "location" TEXT,
  "notes" TEXT,
  "triggeredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackupJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupJob_organizationId_status_idx"
  ON "BackupJob"("organizationId", "status");
CREATE INDEX "BackupJob_organizationId_createdAt_idx"
  ON "BackupJob"("organizationId", "createdAt");

ALTER TABLE "BackupJob"
  ADD CONSTRAINT "BackupJob_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 21: Cookie Consent
-- ===========================================================================

CREATE TABLE "CookieConsent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "necessary" BOOLEAN NOT NULL DEFAULT true,
  "analytics" BOOLEAN NOT NULL DEFAULT false,
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  "preferences" BOOLEAN NOT NULL DEFAULT false,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CookieConsent_organizationId_sessionId_key"
  ON "CookieConsent"("organizationId", "sessionId");
CREATE INDEX "CookieConsent_organizationId_grantedAt_idx"
  ON "CookieConsent"("organizationId", "grantedAt");

ALTER TABLE "CookieConsent"
  ADD CONSTRAINT "CookieConsent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 22: OAuth Account
-- ===========================================================================

CREATE TABLE "OAuthAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "provider" "OAuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "rawProfile" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key"
  ON "OAuthAccount"("provider", "providerUserId");
CREATE INDEX "OAuthAccount_userId_idx"
  ON "OAuthAccount"("userId");

ALTER TABLE "OAuthAccount"
  ADD CONSTRAINT "OAuthAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 22: MFA Factor
-- ===========================================================================

CREATE TABLE "MfaFactor" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "type" "MfaFactorType" NOT NULL,
  "secret" TEXT,
  "backupCodes" JSONB NOT NULL DEFAULT '[]',
  "verifiedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MfaFactor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MfaFactor_userId_type_idx" ON "MfaFactor"("userId", "type");
CREATE INDEX "MfaFactor_userId_verifiedAt_idx" ON "MfaFactor"("userId", "verifiedAt");

ALTER TABLE "MfaFactor"
  ADD CONSTRAINT "MfaFactor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 22: Refresh Session (extended session tracking)
-- ===========================================================================

CREATE TABLE "RefreshSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "deviceInfo" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshSession_refreshTokenHash_key"
  ON "RefreshSession"("refreshTokenHash");
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");
CREATE INDEX "RefreshSession_userId_revokedAt_idx"
  ON "RefreshSession"("userId", "revokedAt");

ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 22: Login Attempt
-- ===========================================================================

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT,
  "success" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "captchaToken" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginAttempt_email_createdAt_idx"
  ON "LoginAttempt"("email", "createdAt");
CREATE INDEX "LoginAttempt_organizationId_createdAt_idx"
  ON "LoginAttempt"("organizationId", "createdAt");
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx"
  ON "LoginAttempt"("ipAddress", "createdAt");

ALTER TABLE "LoginAttempt"
  ADD CONSTRAINT "LoginAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 26: Moderation Report
-- ===========================================================================

CREATE TABLE "ModerationReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" "ModerationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationReport_organizationId_status_idx"
  ON "ModerationReport"("organizationId", "status");
CREATE INDEX "ModerationReport_organizationId_targetType_targetId_idx"
  ON "ModerationReport"("organizationId", "targetType", "targetId");
CREATE INDEX "ModerationReport_organizationId_createdAt_idx"
  ON "ModerationReport"("organizationId", "createdAt");

ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationReport"
  ADD CONSTRAINT "ModerationReport_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 26: Moderation Action
-- ===========================================================================

CREATE TABLE "ModerationAction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "targetType" "ModerationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "actionType" "ModerationActionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationAction_organizationId_targetType_targetId_idx"
  ON "ModerationAction"("organizationId", "targetType", "targetId");
CREATE INDEX "ModerationAction_organizationId_actionType_idx"
  ON "ModerationAction"("organizationId", "actionType");
CREATE INDEX "ModerationAction_organizationId_createdAt_idx"
  ON "ModerationAction"("organizationId", "createdAt");

ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 26: Content Flag
-- ===========================================================================

CREATE TABLE "ContentFlag" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "flaggedById" TEXT,
  "targetType" "ModerationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "flagType" TEXT NOT NULL,
  "autoDetected" BOOLEAN NOT NULL DEFAULT false,
  "confidence" DOUBLE PRECISION,
  "reason" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentFlag_organizationId_targetType_targetId_idx"
  ON "ContentFlag"("organizationId", "targetType", "targetId");
CREATE INDEX "ContentFlag_organizationId_flagType_idx"
  ON "ContentFlag"("organizationId", "flagType");
CREATE INDEX "ContentFlag_organizationId_autoDetected_idx"
  ON "ContentFlag"("organizationId", "autoDetected");

ALTER TABLE "ContentFlag"
  ADD CONSTRAINT "ContentFlag_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentFlag"
  ADD CONSTRAINT "ContentFlag_flaggedById_fkey"
  FOREIGN KEY ("flaggedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 26: Legal Acceptance Log
-- ===========================================================================

CREATE TABLE "LegalAcceptanceLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentType" "LegalDocumentType" NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "LegalAcceptanceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegalAcceptanceLog_organizationId_userId_idx"
  ON "LegalAcceptanceLog"("organizationId", "userId");
CREATE INDEX "LegalAcceptanceLog_organizationId_documentType_idx"
  ON "LegalAcceptanceLog"("organizationId", "documentType");

ALTER TABLE "LegalAcceptanceLog"
  ADD CONSTRAINT "LegalAcceptanceLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
