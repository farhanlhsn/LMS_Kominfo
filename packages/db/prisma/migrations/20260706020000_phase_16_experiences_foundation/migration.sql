-- Phase 16: SCORM, xAPI, H5P, Survey, Polling, Course Feedback

-- ── SCORM ────────────────────────────────────────────
CREATE TABLE "ScormPackage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "activityId" TEXT,
  "title" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.2',
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "fileId" TEXT,
  "entryUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScormPackage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScormPackage_organizationId_courseId_idx" ON "ScormPackage"("organizationId", "courseId");
CREATE INDEX "ScormPackage_organizationId_activityId_idx" ON "ScormPackage"("organizationId", "activityId");

CREATE TABLE "ScormAttempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "scoreRaw" DOUBLE PRECISION,
  "scoreMin" DOUBLE PRECISION,
  "scoreMax" DOUBLE PRECISION,
  "completion" TEXT NOT NULL DEFAULT 'INCOMPLETE',
  "success" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "sessionId" TEXT,
  "cmiData" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScormAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScormAttempt_organizationId_packageId_idx" ON "ScormAttempt"("organizationId", "packageId");
CREATE INDEX "ScormAttempt_organizationId_userId_idx" ON "ScormAttempt"("organizationId", "userId");
CREATE UNIQUE INDEX "ScormAttempt_organizationId_packageId_userId_sessionId_key" ON "ScormAttempt"("organizationId", "packageId", "userId", "sessionId");

-- ── H5P ──────────────────────────────────────────────
CREATE TABLE "H5PContent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "activityId" TEXT,
  "library" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "params" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "fileId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "H5PContent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "H5PContent_organizationId_courseId_idx" ON "H5PContent"("organizationId", "courseId");
CREATE INDEX "H5PContent_organizationId_activityId_idx" ON "H5PContent"("organizationId", "activityId");

CREATE TABLE "H5PResult" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION,
  "completion" TEXT NOT NULL DEFAULT 'INCOMPLETE',
  "success" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "raw" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "H5PResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "H5PResult_organizationId_contentId_idx" ON "H5PResult"("organizationId", "contentId");
CREATE INDEX "H5PResult_organizationId_userId_idx" ON "H5PResult"("organizationId", "userId");

-- ── xAPI ─────────────────────────────────────────────
CREATE TABLE "XapiStatement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actor" JSONB NOT NULL,
  "verb" JSONB NOT NULL,
  "object" JSONB NOT NULL,
  "result" JSONB,
  "context" JSONB,
  "stored" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "timestamp" TIMESTAMP(3),
  "authority" JSONB,
  CONSTRAINT "XapiStatement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "XapiStatement_organizationId_stored_idx" ON "XapiStatement"("organizationId", "stored");
CREATE INDEX "XapiStatement_organizationId_timestamp_idx" ON "XapiStatement"("organizationId", "timestamp");

CREATE TABLE "XapiActivityState" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "agent" JSONB NOT NULL,
  "stateId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XapiActivityState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "XapiActivityState_org_activity_agent_state_key" ON "XapiActivityState"("organizationId", "activityId", "agent", "stateId");

-- ── Survey ───────────────────────────────────────────
CREATE TABLE "Survey" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT,
  "activityId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "allowMultipleSubmissions" BOOLEAN NOT NULL DEFAULT false,
  "closesAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Survey_organizationId_courseId_idx" ON "Survey"("organizationId", "courseId");
CREATE INDEX "Survey_organizationId_activityId_idx" ON "Survey"("organizationId", "activityId");
CREATE INDEX "Survey_organizationId_status_idx" ON "Survey"("organizationId", "status");

CREATE TABLE "SurveyQuestion" (
  "id" TEXT NOT NULL,
  "surveyId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "helpText" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "options" JSONB NOT NULL DEFAULT '[]',
  "scale" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyQuestion_surveyId_orderIndex_idx" ON "SurveyQuestion"("surveyId", "orderIndex");

CREATE TABLE "SurveyResponse" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "surveyId" TEXT NOT NULL,
  "userId" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyResponse_organizationId_surveyId_idx" ON "SurveyResponse"("organizationId", "surveyId");
CREATE INDEX "SurveyResponse_organizationId_surveyId_userId_idx" ON "SurveyResponse"("organizationId", "surveyId", "userId");

CREATE TABLE "SurveyAnswer" (
  "id" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "textValue" TEXT,
  CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SurveyAnswer_responseId_idx" ON "SurveyAnswer"("responseId");
CREATE INDEX "SurveyAnswer_questionId_idx" ON "SurveyAnswer"("questionId");

-- ── Poll ─────────────────────────────────────────────
CREATE TABLE "Poll" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT,
  "activityId" TEXT,
  "question" TEXT NOT NULL,
  "options" JSONB NOT NULL DEFAULT '[]',
  "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "closesAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Poll_organizationId_courseId_idx" ON "Poll"("organizationId", "courseId");
CREATE INDEX "Poll_organizationId_activityId_idx" ON "Poll"("organizationId", "activityId");
CREATE INDEX "Poll_organizationId_status_idx" ON "Poll"("organizationId", "status");

CREATE TABLE "PollVote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "userId" TEXT,
  "selected" JSONB NOT NULL,
  "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PollVote_organizationId_pollId_idx" ON "PollVote"("organizationId", "pollId");
CREATE UNIQUE INDEX "PollVote_org_poll_user_key" ON "PollVote"("organizationId", "pollId", "userId");

-- ── Course Feedback ──────────────────────────────────
CREATE TABLE "CourseFeedback" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "userId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseFeedback_organizationId_courseId_idx" ON "CourseFeedback"("organizationId", "courseId");
CREATE INDEX "CourseFeedback_organizationId_submittedAt_idx" ON "CourseFeedback"("organizationId", "submittedAt");
