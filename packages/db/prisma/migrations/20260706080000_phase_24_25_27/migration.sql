-- Phase 24/25/27: Realtime Gateway, Bulk Operations, Direct Messaging

-- ===========================================================================
-- Phase 24: Realtime Gateway
-- ===========================================================================

CREATE TABLE "RealtimeEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RealtimeEvent_organizationId_channel_createdAt_idx"
  ON "RealtimeEvent"("organizationId", "channel", "createdAt");
CREATE INDEX "RealtimeEvent_organizationId_createdAt_idx"
  ON "RealtimeEvent"("organizationId", "createdAt");
ALTER TABLE "RealtimeEvent"
  ADD CONSTRAINT "RealtimeEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RealtimeEvent"
  ADD CONSTRAINT "RealtimeEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RealtimeSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RealtimeSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RealtimeSubscription_userId_channel_key"
  ON "RealtimeSubscription"("userId", "channel");
CREATE INDEX "RealtimeSubscription_organizationId_channel_idx"
  ON "RealtimeSubscription"("organizationId", "channel");
ALTER TABLE "RealtimeSubscription"
  ADD CONSTRAINT "RealtimeSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RealtimeSubscription"
  ADD CONSTRAINT "RealtimeSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 25: Bulk Operations
-- ===========================================================================

CREATE TYPE "BulkJobType" AS ENUM (
  'IMPORT',
  'EXPORT',
  'ARCHIVE',
  'UNARCHIVE',
  'ENROLL',
  'UNENROLL',
  'TAG',
  'UNTAG'
);

CREATE TYPE "BulkJobStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'PARTIAL'
);

CREATE TYPE "BulkJobItemStatus" AS ENUM (
  'PENDING',
  'PROCESSED',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "BulkJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "BulkJobType" NOT NULL,
  "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
  "input" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB NOT NULL DEFAULT '{}',
  "progressTotal" INTEGER NOT NULL DEFAULT 0,
  "progressDone" INTEGER NOT NULL DEFAULT 0,
  "progressFailed" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BulkJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BulkJob_organizationId_status_idx"
  ON "BulkJob"("organizationId", "status");
CREATE INDEX "BulkJob_organizationId_type_idx"
  ON "BulkJob"("organizationId", "type");
CREATE INDEX "BulkJob_organizationId_createdAt_idx"
  ON "BulkJob"("organizationId", "createdAt");
ALTER TABLE "BulkJob"
  ADD CONSTRAINT "BulkJob_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulkJob"
  ADD CONSTRAINT "BulkJob_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BulkJobItem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "status" "BulkJobItemStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "input" JSONB NOT NULL DEFAULT '{}',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BulkJobItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BulkJobItem_jobId_idx" ON "BulkJobItem"("jobId");
CREATE INDEX "BulkJobItem_organizationId_status_idx"
  ON "BulkJobItem"("organizationId", "status");
ALTER TABLE "BulkJobItem"
  ADD CONSTRAINT "BulkJobItem_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulkJobItem"
  ADD CONSTRAINT "BulkJobItem_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "BulkJob"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Phase 27: Direct Messaging
-- ===========================================================================

CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

CREATE TYPE "ConversationMemberRole" AS ENUM ('MEMBER', 'ADMIN');

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
  "createdById" TEXT NOT NULL,
  "name" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Conversation_organizationId_lastMessageAt_idx"
  ON "Conversation"("organizationId", "lastMessageAt");
CREATE INDEX "Conversation_organizationId_type_idx"
  ON "Conversation"("organizationId", "type");
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConversationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ConversationMemberRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3),
  CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key"
  ON "ConversationMember"("conversationId", "userId");
CREATE INDEX "ConversationMember_organizationId_userId_idx"
  ON "ConversationMember"("organizationId", "userId");
ALTER TABLE "ConversationMember"
  ADD CONSTRAINT "ConversationMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember"
  ADD CONSTRAINT "ConversationMember_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember"
  ADD CONSTRAINT "ConversationMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "parentMessageId" TEXT,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_organizationId_conversationId_createdAt_idx"
  ON "Message"("organizationId", "conversationId", "createdAt");
CREATE INDEX "Message_organizationId_senderId_idx"
  ON "Message"("organizationId", "senderId");
CREATE INDEX "Message_parentMessageId_idx"
  ON "Message"("parentMessageId");
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_parentMessageId_fkey"
  FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MessageReaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key"
  ON "MessageReaction"("messageId", "userId", "emoji");
CREATE INDEX "MessageReaction_organizationId_messageId_idx"
  ON "MessageReaction"("organizationId", "messageId");
ALTER TABLE "MessageReaction"
  ADD CONSTRAINT "MessageReaction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction"
  ADD CONSTRAINT "MessageReaction_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction"
  ADD CONSTRAINT "MessageReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MessageRead" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key"
  ON "MessageRead"("messageId", "userId");
CREATE INDEX "MessageRead_organizationId_userId_idx"
  ON "MessageRead"("organizationId", "userId");
ALTER TABLE "MessageRead"
  ADD CONSTRAINT "MessageRead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRead"
  ADD CONSTRAINT "MessageRead_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRead"
  ADD CONSTRAINT "MessageRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserBlock" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key"
  ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX "UserBlock_organizationId_blockerId_idx"
  ON "UserBlock"("organizationId", "blockerId");
ALTER TABLE "UserBlock"
  ADD CONSTRAINT "UserBlock_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock"
  ADD CONSTRAINT "UserBlock_blockerId_fkey"
  FOREIGN KEY ("blockerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock"
  ADD CONSTRAINT "UserBlock_blockedId_fkey"
  FOREIGN KEY ("blockedId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
