-- Phase 31: 3D Content Plugin
-- Phase 32: Code Runner Plugin
-- Phase 33: Plugin Marketplace Governance
-- Phase 34: Popout Dual Monitor
-- Phase 36: Plugin Workspace Panels

-- =============================================================
-- Phase 31: 3D Content Plugin
-- =============================================================

CREATE TABLE "ThreeDAsset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreeDAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ThreeDAsset_organizationId_createdAt_idx"
  ON "ThreeDAsset"("organizationId", "createdAt");
CREATE INDEX "ThreeDAsset_organizationId_format_idx"
  ON "ThreeDAsset"("organizationId", "format");
ALTER TABLE "ThreeDAsset"
  ADD CONSTRAINT "ThreeDAsset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreeDAsset"
  ADD CONSTRAINT "ThreeDAsset_uploadedBy_fkey"
  FOREIGN KEY ("uploadedBy") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ThreeDScene" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "scene" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreeDScene_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ThreeDScene_organizationId_assetId_idx"
  ON "ThreeDScene"("organizationId", "assetId");
ALTER TABLE "ThreeDScene"
  ADD CONSTRAINT "ThreeDScene_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreeDScene"
  ADD CONSTRAINT "ThreeDScene_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "ThreeDAsset"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ThreeDInteraction" (
  "id" TEXT NOT NULL,
  "sceneId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "action" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreeDInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ThreeDInteraction_sceneId_idx"
  ON "ThreeDInteraction"("sceneId");
ALTER TABLE "ThreeDInteraction"
  ADD CONSTRAINT "ThreeDInteraction_sceneId_fkey"
  FOREIGN KEY ("sceneId") REFERENCES "ThreeDScene"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- Phase 32: Code Runner Plugin
-- =============================================================

CREATE TABLE "CodeExecution" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "output" TEXT,
  "error" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CodeExecution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CodeExecution_organizationId_userId_idx"
  ON "CodeExecution"("organizationId", "userId");
CREATE INDEX "CodeExecution_organizationId_createdAt_idx"
  ON "CodeExecution"("organizationId", "createdAt");
ALTER TABLE "CodeExecution"
  ADD CONSTRAINT "CodeExecution_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeExecution"
  ADD CONSTRAINT "CodeExecution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CodeExecutionTestCase" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "input" TEXT NOT NULL DEFAULT '',
  "expectedOutput" TEXT NOT NULL DEFAULT '',
  "actualOutput" TEXT,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CodeExecutionTestCase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CodeExecutionTestCase_executionId_idx"
  ON "CodeExecutionTestCase"("executionId");
ALTER TABLE "CodeExecutionTestCase"
  ADD CONSTRAINT "CodeExecutionTestCase_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "CodeExecution"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CodeSubmission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "score" DOUBLE PRECISION,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CodeSubmission_organizationId_assignmentId_idx"
  ON "CodeSubmission"("organizationId", "assignmentId");
CREATE INDEX "CodeSubmission_organizationId_userId_idx"
  ON "CodeSubmission"("organizationId", "userId");
ALTER TABLE "CodeSubmission"
  ADD CONSTRAINT "CodeSubmission_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeSubmission"
  ADD CONSTRAINT "CodeSubmission_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeSubmission"
  ADD CONSTRAINT "CodeSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- Phase 33: Plugin Marketplace Governance
-- =============================================================

CREATE TABLE "PluginListing" (
  "id" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "longDescription" TEXT,
  "categories" JSONB NOT NULL DEFAULT '[]',
  "screenshots" JSONB NOT NULL DEFAULT '[]',
  "pricing" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PluginListing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginListing_pluginId_organizationId_key"
  ON "PluginListing"("pluginId", "organizationId");
CREATE INDEX "PluginListing_organizationId_status_idx"
  ON "PluginListing"("organizationId", "status");
ALTER TABLE "PluginListing"
  ADD CONSTRAINT "PluginListing_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PluginListing"
  ADD CONSTRAINT "PluginListing_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PluginReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PluginReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PluginReview_organizationId_listingId_idx"
  ON "PluginReview"("organizationId", "listingId");
CREATE INDEX "PluginReview_organizationId_status_idx"
  ON "PluginReview"("organizationId", "status");
ALTER TABLE "PluginReview"
  ADD CONSTRAINT "PluginReview_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PluginReview"
  ADD CONSTRAINT "PluginReview_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "PluginListing"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PluginReview"
  ADD CONSTRAINT "PluginReview_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PluginInstallation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "config" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "PluginInstallation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginInstallation_organizationId_listingId_key"
  ON "PluginInstallation"("organizationId", "listingId");
CREATE INDEX "PluginInstallation_organizationId_status_idx"
  ON "PluginInstallation"("organizationId", "status");
ALTER TABLE "PluginInstallation"
  ADD CONSTRAINT "PluginInstallation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PluginInstallation"
  ADD CONSTRAINT "PluginInstallation_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "PluginListing"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PluginPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "maxInstalls" INTEGER NOT NULL DEFAULT 50,
  "allowedCategories" JSONB NOT NULL DEFAULT '[]',
  "requireApproval" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PluginPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginPolicy_organizationId_key"
  ON "PluginPolicy"("organizationId");
ALTER TABLE "PluginPolicy"
  ADD CONSTRAINT "PluginPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- Phase 34: Popout Dual Monitor
-- =============================================================

CREATE TABLE "PopoutSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PopoutSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PopoutSession_token_key" ON "PopoutSession"("token");
CREATE INDEX "PopoutSession_organizationId_userId_idx"
  ON "PopoutSession"("organizationId", "userId");
CREATE INDEX "PopoutSession_expiresAt_idx" ON "PopoutSession"("expiresAt");
ALTER TABLE "PopoutSession"
  ADD CONSTRAINT "PopoutSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PopoutSession"
  ADD CONSTRAINT "PopoutSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================
-- Phase 36: Plugin Workspace Panels
-- =============================================================

CREATE TABLE "PluginPanel" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pluginId" TEXT NOT NULL,
  "panelKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultSize" TEXT NOT NULL DEFAULT 'md',
  "defaultPosition" TEXT NOT NULL DEFAULT 'right',
  "allowedRoutes" JSONB NOT NULL DEFAULT '[]',
  "configSchema" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PluginPanel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginPanel_organizationId_pluginId_panelKey_key"
  ON "PluginPanel"("organizationId", "pluginId", "panelKey");
CREATE INDEX "PluginPanel_organizationId_pluginId_idx"
  ON "PluginPanel"("organizationId", "pluginId");
ALTER TABLE "PluginPanel"
  ADD CONSTRAINT "PluginPanel_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPanelLayout" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "layoutKey" TEXT NOT NULL,
  "panels" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPanelLayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserPanelLayout_userId_layoutKey_key"
  ON "UserPanelLayout"("userId", "layoutKey");
CREATE INDEX "UserPanelLayout_organizationId_userId_idx"
  ON "UserPanelLayout"("organizationId", "userId");
ALTER TABLE "UserPanelLayout"
  ADD CONSTRAINT "UserPanelLayout_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPanelLayout"
  ADD CONSTRAINT "UserPanelLayout_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
