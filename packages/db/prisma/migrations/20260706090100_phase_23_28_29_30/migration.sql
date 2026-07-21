-- Phase 23: Timezone & cohort scheduling
-- Phase 28: Proctoring
-- Phase 29: Revenue share & payout
-- Phase 30: Multi-currency & tax

-- =====================================================================
-- Phase 23: Timezone & cohort scheduling
-- =====================================================================

CREATE TYPE "CohortStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CohortMemberStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'COMPLETED');

CREATE TABLE "Cohort" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "maxSeats" INTEGER NOT NULL DEFAULT 0,
  "status" "CohortStatus" NOT NULL DEFAULT 'PLANNED',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Cohort_organizationId_courseId_idx" ON "Cohort"("organizationId", "courseId");
CREATE INDEX "Cohort_organizationId_status_idx" ON "Cohort"("organizationId", "status");
CREATE INDEX "Cohort_organizationId_startAt_idx" ON "Cohort"("organizationId", "startAt");
ALTER TABLE "Cohort"
  ADD CONSTRAINT "Cohort_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cohort"
  ADD CONSTRAINT "Cohort_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CohortMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "CohortMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CohortMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CohortMember_cohortId_userId_key" ON "CohortMember"("cohortId", "userId");
CREATE INDEX "CohortMember_organizationId_userId_idx" ON "CohortMember"("organizationId", "userId");
CREATE INDEX "CohortMember_organizationId_status_idx" ON "CohortMember"("organizationId", "status");
ALTER TABLE "CohortMember"
  ADD CONSTRAINT "CohortMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortMember"
  ADD CONSTRAINT "CohortMember_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortMember"
  ADD CONSTRAINT "CohortMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CohortSchedule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "lessonId" TEXT,
  "meetingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CohortSchedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CohortSchedule_organizationId_cohortId_idx" ON "CohortSchedule"("organizationId", "cohortId");
CREATE INDEX "CohortSchedule_organizationId_weekday_idx" ON "CohortSchedule"("organizationId", "weekday");
ALTER TABLE "CohortSchedule"
  ADD CONSTRAINT "CohortSchedule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortSchedule"
  ADD CONSTRAINT "CohortSchedule_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CohortSchedule"
  ADD CONSTRAINT "CohortSchedule_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserTimezonePreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "autoDetect" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTimezonePreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserTimezonePreference_userId_key" ON "UserTimezonePreference"("userId");
ALTER TABLE "UserTimezonePreference"
  ADD CONSTRAINT "UserTimezonePreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Phase 28: Proctoring
-- =====================================================================

CREATE TYPE "ProctoringSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FLAGGED', 'REVIEWED');
CREATE TYPE "ProctoringEventType" AS ENUM (
  'TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'LOOKING_AWAY',
  'NO_FACE', 'MULTIPLE_FACES', 'PHONE_DETECTED', 'NOISE_DETECTED'
);
CREATE TYPE "ProctoringSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ProctoringFlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'UPHELD');

CREATE TABLE "ProctoringSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "attemptType" TEXT NOT NULL DEFAULT 'quiz',
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "status" "ProctoringSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "integrityScore" DOUBLE PRECISION,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProctoringSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProctoringSession_organizationId_attemptId_attemptType_key"
  ON "ProctoringSession"("organizationId", "attemptId", "attemptType");
CREATE INDEX "ProctoringSession_organizationId_userId_idx" ON "ProctoringSession"("organizationId", "userId");
CREATE INDEX "ProctoringSession_organizationId_status_idx" ON "ProctoringSession"("organizationId", "status");
ALTER TABLE "ProctoringSession"
  ADD CONSTRAINT "ProctoringSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctoringSession"
  ADD CONSTRAINT "ProctoringSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProctoringEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "ProctoringEventType" NOT NULL,
  "severity" "ProctoringSeverity" NOT NULL DEFAULT 'LOW',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProctoringEvent_organizationId_sessionId_idx" ON "ProctoringEvent"("organizationId", "sessionId");
CREATE INDEX "ProctoringEvent_organizationId_type_idx" ON "ProctoringEvent"("organizationId", "type");
ALTER TABLE "ProctoringEvent"
  ADD CONSTRAINT "ProctoringEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctoringEvent"
  ADD CONSTRAINT "ProctoringEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ProctoringSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProctoringFlag" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "eventId" TEXT,
  "status" "ProctoringFlagStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProctoringFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProctoringFlag_organizationId_status_idx" ON "ProctoringFlag"("organizationId", "status");
CREATE INDEX "ProctoringFlag_organizationId_sessionId_idx" ON "ProctoringFlag"("organizationId", "sessionId");
ALTER TABLE "ProctoringFlag"
  ADD CONSTRAINT "ProctoringFlag_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctoringFlag"
  ADD CONSTRAINT "ProctoringFlag_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ProctoringSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctoringFlag"
  ADD CONSTRAINT "ProctoringFlag_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "ProctoringEvent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProctoringFlag"
  ADD CONSTRAINT "ProctoringFlag_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Phase 29: Revenue share & payout
-- =====================================================================

CREATE TYPE "RevenueShareScope" AS ENUM ('PLATFORM', 'INSTRUCTOR', 'COURSE');
CREATE TYPE "PayoutPeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'PAID');
CREATE TYPE "PayoutBeneficiaryType" AS ENUM ('INSTRUCTOR', 'ORG', 'PLATFORM');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED');
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK', 'PAYPAL', 'STRIPE');

CREATE TABLE "RevenueShareRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "scope" "RevenueShareScope" NOT NULL DEFAULT 'INSTRUCTOR',
  "targetId" TEXT,
  "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevenueShareRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RevenueShareRule_organizationId_scope_active_idx"
  ON "RevenueShareRule"("organizationId", "scope", "active");
ALTER TABLE "RevenueShareRule"
  ADD CONSTRAINT "RevenueShareRule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PayoutPeriod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "PayoutPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "lockedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutPeriod_organizationId_status_idx" ON "PayoutPeriod"("organizationId", "status");
CREATE INDEX "PayoutPeriod_organizationId_periodStart_periodEnd_idx"
  ON "PayoutPeriod"("organizationId", "periodStart", "periodEnd");
ALTER TABLE "PayoutPeriod"
  ADD CONSTRAINT "PayoutPeriod_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Payout" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "beneficiaryType" "PayoutBeneficiaryType" NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "grossAmount" INTEGER NOT NULL DEFAULT 0,
  "feeAmount" INTEGER NOT NULL DEFAULT 0,
  "netAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "reference" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payout_organizationId_periodId_idx" ON "Payout"("organizationId", "periodId");
CREATE INDEX "Payout_organizationId_status_idx" ON "Payout"("organizationId", "status");
CREATE INDEX "Payout_organizationId_beneficiaryType_beneficiaryId_idx"
  ON "Payout"("organizationId", "beneficiaryType", "beneficiaryId");
ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "PayoutPeriod"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PayoutMethod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "beneficiaryType" "PayoutBeneficiaryType" NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "type" "PayoutMethodType" NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutMethod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutMethod_organizationId_beneficiaryType_beneficiaryId_idx"
  ON "PayoutMethod"("organizationId", "beneficiaryType", "beneficiaryId");
ALTER TABLE "PayoutMethod"
  ADD CONSTRAINT "PayoutMethod_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Phase 30: Multi-currency & tax
-- =====================================================================

CREATE TYPE "TaxRuleType" AS ENUM ('VAT', 'GST', 'SALES_TAX');

CREATE TABLE "TaxRegion" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRegion_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "TaxRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "regionCode" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "type" "TaxRuleType" NOT NULL DEFAULT 'VAT',
  "inclusive" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaxRule_organizationId_regionCode_active_idx"
  ON "TaxRule"("organizationId", "regionCode", "active");
ALTER TABLE "TaxRule"
  ADD CONSTRAINT "TaxRule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRule"
  ADD CONSTRAINT "TaxRule_regionCode_fkey"
  FOREIGN KEY ("regionCode") REFERENCES "TaxRegion"("code")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TaxCalculation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "regionCode" TEXT NOT NULL,
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "breakdown" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaxCalculation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaxCalculation_organizationId_orderId_idx" ON "TaxCalculation"("organizationId", "orderId");
CREATE INDEX "TaxCalculation_organizationId_regionCode_idx" ON "TaxCalculation"("organizationId", "regionCode");
ALTER TABLE "TaxCalculation"
  ADD CONSTRAINT "TaxCalculation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxCalculation"
  ADD CONSTRAINT "TaxCalculation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
