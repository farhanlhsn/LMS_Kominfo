-- Phase 13: Enterprise SSO, API Keys, Webhooks

-- Add branding fields to Organization
ALTER TABLE "Organization" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#2563eb';
ALTER TABLE "Organization" ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#64748b';
ALTER TABLE "Organization" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#f59e0b';
ALTER TABLE "Organization" ADD COLUMN "borderRadius" TEXT NOT NULL DEFAULT '0.5rem';

-- ApiKey
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL, "keyHash" TEXT NOT NULL, "scopes" JSONB NOT NULL DEFAULT '[]',
  "ipRestrictions" TEXT[] DEFAULT ARRAY[]::TEXT[], "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3), "lastUsedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_organizationId_status_idx" ON "ApiKey"("organizationId", "status");

-- WebhookEndpoint
CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "url" TEXT NOT NULL, "secret" TEXT NOT NULL, "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "retryCount" INTEGER NOT NULL DEFAULT 3,
  "timeoutMs" INTEGER NOT NULL DEFAULT 5000, "description" TEXT,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookEndpoint_organizationId_status_idx" ON "WebhookEndpoint"("organizationId", "status");

-- WebhookDelivery
CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL, "endpointId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestHeaders" JSONB, "responseStatus" INTEGER, "responseBody" TEXT,
  "durationMs" INTEGER, "nextRetryAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");
CREATE INDEX "WebhookDelivery_endpointId_status_idx" ON "WebhookDelivery"("endpointId", "status");

-- Foreign keys
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
