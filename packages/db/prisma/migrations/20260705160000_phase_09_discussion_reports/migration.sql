CREATE TYPE "DiscussionReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "DiscussionReport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "threadId" TEXT,
  "replyId" TEXT,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "DiscussionReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscussionReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiscussionReport_organizationId_threadId_reporterId_key" ON "DiscussionReport"("organizationId", "threadId", "reporterId");
CREATE UNIQUE INDEX "DiscussionReport_organizationId_replyId_reporterId_key" ON "DiscussionReport"("organizationId", "replyId", "reporterId");
CREATE INDEX "DiscussionReport_organizationId_status_createdAt_idx" ON "DiscussionReport"("organizationId", "status", "createdAt");
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiscussionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "DiscussionReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
