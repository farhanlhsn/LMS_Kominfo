-- Phase 19: Global Search
-- Phase 20: Localization and Help Center
-- Phase 35: Transcript Notes AI Context

-- SearchQuery
CREATE TABLE "SearchQuery" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "types" JSONB NOT NULL DEFAULT '[]',
  "resultsCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchQuery_organizationId_createdAt_idx" ON "SearchQuery"("organizationId", "createdAt");
CREATE INDEX "SearchQuery_organizationId_userId_idx" ON "SearchQuery"("organizationId", "userId");
CREATE INDEX "SearchQuery_organizationId_query_idx" ON "SearchQuery"("organizationId", "query");
ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchQuery" ADD CONSTRAINT "SearchQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HelpCategory
CREATE TABLE "HelpCategory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HelpCategory_organizationId_key_key" ON "HelpCategory"("organizationId", "key");
CREATE INDEX "HelpCategory_organizationId_orderIndex_idx" ON "HelpCategory"("organizationId", "orderIndex");
ALTER TABLE "HelpCategory" ADD CONSTRAINT "HelpCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HelpArticle
CREATE TABLE "HelpArticle" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "excerpt" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HelpArticle_organizationId_slug_key" ON "HelpArticle"("organizationId", "slug");
CREATE INDEX "HelpArticle_organizationId_categoryId_idx" ON "HelpArticle"("organizationId", "categoryId");
CREATE INDEX "HelpArticle_organizationId_status_idx" ON "HelpArticle"("organizationId", "status");
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HelpArticleView
CREATE TABLE "HelpArticleView" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "userId" TEXT,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpArticleView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HelpArticleView_organizationId_articleId_idx" ON "HelpArticleView"("organizationId", "articleId");
CREATE INDEX "HelpArticleView_organizationId_viewedAt_idx" ON "HelpArticleView"("organizationId", "viewedAt");
ALTER TABLE "HelpArticleView" ADD CONSTRAINT "HelpArticleView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpArticleView" ADD CONSTRAINT "HelpArticleView_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "HelpArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpArticleView" ADD CONSTRAINT "HelpArticleView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SupportTicket
CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedToId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_organizationId_userId_idx" ON "SupportTicket"("organizationId", "userId");
CREATE INDEX "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");
CREATE INDEX "SupportTicket_organizationId_createdAt_idx" ON "SupportTicket"("organizationId", "createdAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SupportTicketReply
CREATE TABLE "SupportTicketReply" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicketReply_organizationId_ticketId_idx" ON "SupportTicketReply"("organizationId", "ticketId");
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserLocalePreference
CREATE TABLE "UserLocalePreference" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "fallbackChain" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLocalePreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserLocalePreference_organizationId_userId_key" ON "UserLocalePreference"("organizationId", "userId");
ALTER TABLE "UserLocalePreference" ADD CONSTRAINT "UserLocalePreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLocalePreference" ADD CONSTRAINT "UserLocalePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrgLocalePreference
CREATE TABLE "OrgLocalePreference" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "defaultLocale" TEXT NOT NULL DEFAULT 'en',
  "supportedLocales" JSONB NOT NULL DEFAULT '["en"]',
  "fallbackChain" JSONB NOT NULL DEFAULT '["en"]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrgLocalePreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrgLocalePreference_organizationId_key" ON "OrgLocalePreference"("organizationId");
ALTER TABLE "OrgLocalePreference" ADD CONSTRAINT "OrgLocalePreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TranscriptNote
CREATE TABLE "TranscriptNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "activityId" TEXT,
  "timestampSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "content" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranscriptNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TranscriptNote_organizationId_userId_idx" ON "TranscriptNote"("organizationId", "userId");
CREATE INDEX "TranscriptNote_organizationId_lessonId_idx" ON "TranscriptNote"("organizationId", "lessonId");
CREATE INDEX "TranscriptNote_organizationId_activityId_idx" ON "TranscriptNote"("organizationId", "activityId");
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptNote" ADD CONSTRAINT "TranscriptNote_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- NoteContext
CREATE TABLE "NoteContext" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "aiContextSummary" TEXT NOT NULL,
  "relatedNotes" JSONB NOT NULL DEFAULT '[]',
  "providerKey" TEXT NOT NULL DEFAULT 'mock',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NoteContext_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NoteContext_noteId_key" ON "NoteContext"("noteId");
CREATE INDEX "NoteContext_organizationId_createdAt_idx" ON "NoteContext"("organizationId", "createdAt");
ALTER TABLE "NoteContext" ADD CONSTRAINT "NoteContext_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteContext" ADD CONSTRAINT "NoteContext_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TranscriptNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotesExport
CREATE TABLE "NotesExport" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT,
  "format" TEXT NOT NULL DEFAULT 'markdown',
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "markdown" TEXT NOT NULL DEFAULT '',
  "count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotesExport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotesExport_organizationId_userId_idx" ON "NotesExport"("organizationId", "userId");
CREATE INDEX "NotesExport_organizationId_lessonId_idx" ON "NotesExport"("organizationId", "lessonId");
ALTER TABLE "NotesExport" ADD CONSTRAINT "NotesExport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotesExport" ADD CONSTRAINT "NotesExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotesExport" ADD CONSTRAINT "NotesExport_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
