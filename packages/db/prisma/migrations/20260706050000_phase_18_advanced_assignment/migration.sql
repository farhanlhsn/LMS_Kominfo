-- Phase 18: Advanced assignment (group, peer review, plagiarism, portfolio, showcase)

CREATE TYPE "AssignmentCollaborationMode" AS ENUM ('INDIVIDUAL', 'GROUP');
CREATE TYPE "PeerReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'DECLINED');
CREATE TYPE "PlagiarismCheckStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Assignment: add collaboration + resubmission caps
ALTER TABLE "Assignment"
  ADD COLUMN "collaborationMode" "AssignmentCollaborationMode" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "groupMinMembers" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "groupMaxMembers" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "maxResubmissions" INTEGER;

-- AssignmentSubmission: add optional groupId
ALTER TABLE "AssignmentSubmission" ADD COLUMN "groupId" TEXT;
CREATE INDEX "AssignmentSubmission_organizationId_groupId_idx"
  ON "AssignmentSubmission"("organizationId", "groupId");
ALTER TABLE "AssignmentSubmission"
  ADD CONSTRAINT "AssignmentSubmission_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "AssignmentGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AssignmentGroup
CREATE TABLE "AssignmentGroup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "maxMembers" INTEGER NOT NULL DEFAULT 5,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssignmentGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssignmentGroup_organizationId_assignmentId_idx"
  ON "AssignmentGroup"("organizationId", "assignmentId");
CREATE INDEX "AssignmentGroup_organizationId_courseId_idx"
  ON "AssignmentGroup"("organizationId", "courseId");
ALTER TABLE "AssignmentGroup"
  ADD CONSTRAINT "AssignmentGroup_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentGroup"
  ADD CONSTRAINT "AssignmentGroup_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentGroup"
  ADD CONSTRAINT "AssignmentGroup_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AssignmentGroupMember
CREATE TABLE "AssignmentGroupMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentGroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssignmentGroupMember_groupId_userId_key"
  ON "AssignmentGroupMember"("groupId", "userId");
CREATE INDEX "AssignmentGroupMember_organizationId_userId_idx"
  ON "AssignmentGroupMember"("organizationId", "userId");
ALTER TABLE "AssignmentGroupMember"
  ADD CONSTRAINT "AssignmentGroupMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentGroupMember"
  ADD CONSTRAINT "AssignmentGroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "AssignmentGroup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentGroupMember"
  ADD CONSTRAINT "AssignmentGroupMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PeerReviewConfig
CREATE TABLE "PeerReviewConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "reviewsRequired" INTEGER NOT NULL DEFAULT 2,
  "reviewsToReceive" INTEGER NOT NULL DEFAULT 2,
  "openFrom" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "rubricId" TEXT,
  "anonymize" BOOLEAN NOT NULL DEFAULT true,
  "allowSelfReview" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerReviewConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerReviewConfig_assignmentId_key" ON "PeerReviewConfig"("assignmentId");
CREATE INDEX "PeerReviewConfig_organizationId_status_idx"
  ON "PeerReviewConfig"("organizationId", "status");
ALTER TABLE "PeerReviewConfig"
  ADD CONSTRAINT "PeerReviewConfig_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewConfig"
  ADD CONSTRAINT "PeerReviewConfig_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewConfig"
  ADD CONSTRAINT "PeerReviewConfig_rubricId_fkey"
  FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PeerReviewMatch
CREATE TABLE "PeerReviewMatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "configId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "status" "PeerReviewStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerReviewMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerReviewMatch_configId_submissionId_reviewerUserId_key"
  ON "PeerReviewMatch"("configId", "submissionId", "reviewerUserId");
CREATE INDEX "PeerReviewMatch_organizationId_reviewerUserId_idx"
  ON "PeerReviewMatch"("organizationId", "reviewerUserId");
CREATE INDEX "PeerReviewMatch_organizationId_status_idx"
  ON "PeerReviewMatch"("organizationId", "status");
ALTER TABLE "PeerReviewMatch"
  ADD CONSTRAINT "PeerReviewMatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewMatch"
  ADD CONSTRAINT "PeerReviewMatch_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "PeerReviewConfig"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewMatch"
  ADD CONSTRAINT "PeerReviewMatch_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewMatch"
  ADD CONSTRAINT "PeerReviewMatch_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PeerReview
CREATE TABLE "PeerReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "authorId" TEXT,
  "overallScore" DOUBLE PRECISION,
  "feedback" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerReview_matchId_key" ON "PeerReview"("matchId");
CREATE INDEX "PeerReview_organizationId_submittedAt_idx"
  ON "PeerReview"("organizationId", "submittedAt");
ALTER TABLE "PeerReview"
  ADD CONSTRAINT "PeerReview_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReview"
  ADD CONSTRAINT "PeerReview_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "PeerReviewMatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReview"
  ADD CONSTRAINT "PeerReview_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PeerReviewRubricScore
CREATE TABLE "PeerReviewRubricScore" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "criterionId" TEXT NOT NULL,
  "levelId" TEXT,
  "points" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PeerReviewRubricScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerReviewRubricScore_reviewId_criterionId_key"
  ON "PeerReviewRubricScore"("reviewId", "criterionId");
CREATE INDEX "PeerReviewRubricScore_organizationId_idx"
  ON "PeerReviewRubricScore"("organizationId");
ALTER TABLE "PeerReviewRubricScore"
  ADD CONSTRAINT "PeerReviewRubricScore_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewRubricScore"
  ADD CONSTRAINT "PeerReviewRubricScore_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "PeerReview"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewRubricScore"
  ADD CONSTRAINT "PeerReviewRubricScore_rubricId_fkey"
  FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewRubricScore"
  ADD CONSTRAINT "PeerReviewRubricScore_criterionId_fkey"
  FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewRubricScore"
  ADD CONSTRAINT "PeerReviewRubricScore_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "RubricLevel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PlagiarismCheck
CREATE TABLE "PlagiarismCheck" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "requesterId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "status" "PlagiarismCheckStatus" NOT NULL DEFAULT 'PENDING',
  "similarityScore" DOUBLE PRECISION,
  "matchedSources" JSONB NOT NULL DEFAULT '[]',
  "reportUrl" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PlagiarismCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlagiarismCheck_organizationId_submissionId_idx"
  ON "PlagiarismCheck"("organizationId", "submissionId");
CREATE INDEX "PlagiarismCheck_organizationId_status_idx"
  ON "PlagiarismCheck"("organizationId", "status");
ALTER TABLE "PlagiarismCheck"
  ADD CONSTRAINT "PlagiarismCheck_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlagiarismCheck"
  ADD CONSTRAINT "PlagiarismCheck_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlagiarismCheck"
  ADD CONSTRAINT "PlagiarismCheck_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- SubmissionAnnotation
CREATE TABLE "SubmissionAnnotation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "startOffset" INTEGER NOT NULL,
  "endOffset" INTEGER NOT NULL,
  "selectedText" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubmissionAnnotation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubmissionAnnotation_organizationId_submissionId_idx"
  ON "SubmissionAnnotation"("organizationId", "submissionId");
ALTER TABLE "SubmissionAnnotation"
  ADD CONSTRAINT "SubmissionAnnotation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionAnnotation"
  ADD CONSTRAINT "SubmissionAnnotation_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionAnnotation"
  ADD CONSTRAINT "SubmissionAnnotation_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionAnnotation"
  ADD CONSTRAINT "SubmissionAnnotation_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ProjectShowcase
CREATE TABLE "ProjectShowcase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "thumbnailUrl" TEXT,
  "externalUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectShowcase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectShowcase_submissionId_key" ON "ProjectShowcase"("submissionId");
CREATE INDEX "ProjectShowcase_organizationId_courseId_idx"
  ON "ProjectShowcase"("organizationId", "courseId");
CREATE INDEX "ProjectShowcase_organizationId_publishedAt_idx"
  ON "ProjectShowcase"("organizationId", "publishedAt");
ALTER TABLE "ProjectShowcase"
  ADD CONSTRAINT "ProjectShowcase_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectShowcase"
  ADD CONSTRAINT "ProjectShowcase_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectShowcase"
  ADD CONSTRAINT "ProjectShowcase_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectShowcase"
  ADD CONSTRAINT "ProjectShowcase_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Portfolio
CREATE TABLE "Portfolio" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "shareToken" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Portfolio_shareToken_key" ON "Portfolio"("shareToken");
CREATE INDEX "Portfolio_organizationId_userId_idx"
  ON "Portfolio"("organizationId", "userId");
ALTER TABLE "Portfolio"
  ADD CONSTRAINT "Portfolio_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Portfolio"
  ADD CONSTRAINT "Portfolio_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PortfolioEntry
CREATE TABLE "PortfolioEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "portfolioId" TEXT NOT NULL,
  "submissionId" TEXT,
  "showcaseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortfolioEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PortfolioEntry_organizationId_portfolioId_idx"
  ON "PortfolioEntry"("organizationId", "portfolioId");
ALTER TABLE "PortfolioEntry"
  ADD CONSTRAINT "PortfolioEntry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioEntry"
  ADD CONSTRAINT "PortfolioEntry_portfolioId_fkey"
  FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioEntry"
  ADD CONSTRAINT "PortfolioEntry_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortfolioEntry"
  ADD CONSTRAINT "PortfolioEntry_showcaseId_fkey"
  FOREIGN KEY ("showcaseId") REFERENCES "ProjectShowcase"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
