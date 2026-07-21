-- CreateEnum
CREATE TYPE "AssignmentSubmissionType" AS ENUM ('TEXT', 'FILE', 'LINK', 'TEXT_AND_FILE', 'PROJECT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LATE', 'GRADED', 'RETURNED', 'RESUBMITTED');

-- CreateEnum
CREATE TYPE "RubricStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CertificateTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningGoalTargetType" AS ENUM ('COURSE_COMPLETION', 'ACTIVITY_COMPLETION', 'STUDY_TIME', 'SCORE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LearningGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "activityId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "submissionType" "AssignmentSubmissionType" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
    "latePenaltyPercent" DOUBLE PRECISION,
    "maxAttempts" INTEGER,
    "allowResubmission" BOOLEAN NOT NULL DEFAULT false,
    "rubricId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "activityId" TEXT,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "textAnswer" TEXT,
    "linkUrl" TEXT,
    "fileIds" JSONB NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "gradedById" TEXT,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "status" "RubricStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maxPoints" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricLevel" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "points" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RubricLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricScore" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "levelId" TEXT,
    "points" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "design" JSONB NOT NULL DEFAULT '{}',
    "status" "CertificateTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "certificateNumber" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "pdfFileId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetType" "LearningGoalTargetType" NOT NULL,
    "targetValue" JSONB NOT NULL DEFAULT '{}',
    "progressValue" JSONB NOT NULL DEFAULT '{}',
    "dueAt" TIMESTAMP(3),
    "status" "LearningGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_activityId_key" ON "Assignment"("activityId");
CREATE INDEX "Assignment_organizationId_courseId_idx" ON "Assignment"("organizationId", "courseId");
CREATE INDEX "Assignment_organizationId_status_idx" ON "Assignment"("organizationId", "status");
CREATE INDEX "Assignment_createdById_idx" ON "Assignment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_attemptNumber_key" ON "AssignmentSubmission"("assignmentId", "userId", "attemptNumber");
CREATE INDEX "AssignmentSubmission_organizationId_assignmentId_idx" ON "AssignmentSubmission"("organizationId", "assignmentId");
CREATE INDEX "AssignmentSubmission_organizationId_userId_courseId_idx" ON "AssignmentSubmission"("organizationId", "userId", "courseId");
CREATE INDEX "AssignmentSubmission_organizationId_activityId_idx" ON "AssignmentSubmission"("organizationId", "activityId");
CREATE INDEX "AssignmentSubmission_organizationId_status_idx" ON "AssignmentSubmission"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Rubric_organizationId_status_idx" ON "Rubric"("organizationId", "status");
CREATE INDEX "Rubric_organizationId_courseId_idx" ON "Rubric"("organizationId", "courseId");
CREATE INDEX "Rubric_createdById_idx" ON "Rubric"("createdById");

-- CreateIndex
CREATE INDEX "RubricCriterion_rubricId_orderIndex_idx" ON "RubricCriterion"("rubricId", "orderIndex");
CREATE INDEX "RubricLevel_criterionId_orderIndex_idx" ON "RubricLevel"("criterionId", "orderIndex");
CREATE UNIQUE INDEX "RubricScore_submissionId_criterionId_key" ON "RubricScore"("submissionId", "criterionId");
CREATE INDEX "RubricScore_criterionId_idx" ON "RubricScore"("criterionId");
CREATE INDEX "RubricScore_levelId_idx" ON "RubricScore"("levelId");

-- CreateIndex
CREATE INDEX "CertificateTemplate_organizationId_status_idx" ON "CertificateTemplate"("organizationId", "status");
CREATE INDEX "CertificateTemplate_createdById_idx" ON "CertificateTemplate"("createdById");
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");
CREATE UNIQUE INDEX "Certificate_organizationId_courseId_userId_key" ON "Certificate"("organizationId", "courseId", "userId");
CREATE INDEX "Certificate_organizationId_courseId_idx" ON "Certificate"("organizationId", "courseId");
CREATE INDEX "Certificate_organizationId_userId_idx" ON "Certificate"("organizationId", "userId");
CREATE INDEX "Certificate_verificationCode_idx" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "LearningGoal_organizationId_userId_status_idx" ON "LearningGoal"("organizationId", "userId", "status");
CREATE INDEX "LearningGoal_organizationId_courseId_idx" ON "LearningGoal"("organizationId", "courseId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricLevel" ADD CONSTRAINT "RubricLevel_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "RubricLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
