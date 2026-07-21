CREATE TYPE "AiDocumentStatus" AS ENUM ('PENDING', 'INDEXING', 'READY', 'NEEDS_REINDEX', 'FAILED');
CREATE TYPE "AiConversationType" AS ENUM ('LEARNER_TUTOR', 'INSTRUCTOR_ASSISTANT', 'ADMIN_ASSISTANT');
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "AiAnswerSourceType" AS ENUM ('COURSE_MATERIAL', 'GENERAL_EDUCATIONAL', 'BLOCKED', 'OUT_OF_SCOPE', 'DISABLED');

CREATE TABLE "AiDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT,
  "lessonId" TEXT,
  "activityId" TEXT,
  "fileId" TEXT,
  "title" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "rawText" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "status" "AiDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "indexedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AiDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiConversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "lessonId" TEXT,
  "activityId" TEXT,
  "type" "AiConversationType" NOT NULL DEFAULT 'LEARNER_TUTOR',
  "title" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "sourceType" "AiAnswerSourceType",
  "sources" JSONB NOT NULL DEFAULT '[]',
  "provider" TEXT,
  "model" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiAnswerCache" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT,
  "canonicalQuestion" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "contextHash" TEXT NOT NULL,
  "sourceType" "AiAnswerSourceType" NOT NULL,
  "answer" TEXT NOT NULL,
  "citations" JSONB NOT NULL DEFAULT '[]',
  "suggestions" JSONB NOT NULL DEFAULT '[]',
  "provider" TEXT,
  "model" TEXT,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiAnswerCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "conversationId" TEXT,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "requestType" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "sourceType" "AiAnswerSourceType" NOT NULL,
  "cacheHit" BOOLEAN NOT NULL DEFAULT false,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiDocument_organizationId_sourceType_activityId_fileId_key" ON "AiDocument"("organizationId", "sourceType", "activityId", "fileId");
CREATE INDEX "AiDocument_organizationId_courseId_status_idx" ON "AiDocument"("organizationId", "courseId", "status");
CREATE INDEX "AiDocument_organizationId_activityId_idx" ON "AiDocument"("organizationId", "activityId");
CREATE INDEX "AiConversation_organizationId_userId_courseId_updatedAt_idx" ON "AiConversation"("organizationId", "userId", "courseId", "updatedAt");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE UNIQUE INDEX "AiAnswerCache_organizationId_courseId_canonicalKey_contextHash_key" ON "AiAnswerCache"("organizationId", "courseId", "canonicalKey", "contextHash");
CREATE INDEX "AiAnswerCache_organizationId_expiresAt_idx" ON "AiAnswerCache"("organizationId", "expiresAt");
CREATE INDEX "AiUsageLog_organizationId_createdAt_idx" ON "AiUsageLog"("organizationId", "createdAt");
CREATE INDEX "AiUsageLog_organizationId_userId_createdAt_idx" ON "AiUsageLog"("organizationId", "userId", "createdAt");

ALTER TABLE "AiDocument" ADD CONSTRAINT "AiDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDocumentChunk" ADD CONSTRAINT "AiDocumentChunk_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "AiDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAnswerCache" ADD CONSTRAINT "AiAnswerCache_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
