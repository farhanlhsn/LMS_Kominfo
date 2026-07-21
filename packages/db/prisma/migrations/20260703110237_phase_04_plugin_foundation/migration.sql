-- CreateEnum
CREATE TYPE "PluginCategory" AS ENUM ('ACTIVITY', 'CONTENT', 'ASSESSMENT', 'AI_TOOL', 'INTEGRATION', 'PAYMENT_PROVIDER', 'NOTIFICATION_CHANNEL', 'STORAGE_PROVIDER', 'VIDEO_PROVIDER', 'PROCTORING_PROVIDER', 'ANALYTICS', 'CERTIFICATE_REQUIREMENT');

-- CreateEnum
CREATE TYPE "PluginStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "PluginExecutionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "category" "PluginCategory" NOT NULL,
    "status" "PluginStatus" NOT NULL DEFAULT 'DRAFT',
    "author" TEXT,
    "manifest" JSONB NOT NULL DEFAULT '{}',
    "configSchema" JSONB,
    "permissions" JSONB,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPlugin" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "installedById" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPlugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginExecutionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "status" "PluginExecutionStatus" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PluginExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginEventSubscription" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "handlerKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginEventSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginPermission" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PluginPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_key_key" ON "Plugin"("key");

-- CreateIndex
CREATE INDEX "Plugin_category_status_idx" ON "Plugin"("category", "status");

-- CreateIndex
CREATE INDEX "OrganizationPlugin_organizationId_enabled_idx" ON "OrganizationPlugin"("organizationId", "enabled");

-- CreateIndex
CREATE INDEX "OrganizationPlugin_pluginId_idx" ON "OrganizationPlugin"("pluginId");

-- CreateIndex
CREATE INDEX "OrganizationPlugin_installedById_idx" ON "OrganizationPlugin"("installedById");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPlugin_organizationId_pluginId_key" ON "OrganizationPlugin"("organizationId", "pluginId");

-- CreateIndex
CREATE INDEX "PluginExecutionLog_organizationId_idx" ON "PluginExecutionLog"("organizationId");

-- CreateIndex
CREATE INDEX "PluginExecutionLog_pluginId_idx" ON "PluginExecutionLog"("pluginId");

-- CreateIndex
CREATE INDEX "PluginExecutionLog_createdAt_idx" ON "PluginExecutionLog"("createdAt");

-- CreateIndex
CREATE INDEX "PluginExecutionLog_organizationId_createdAt_idx" ON "PluginExecutionLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PluginEventSubscription_eventType_enabled_idx" ON "PluginEventSubscription"("eventType", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PluginEventSubscription_pluginId_eventType_handlerKey_key" ON "PluginEventSubscription"("pluginId", "eventType", "handlerKey");

-- CreateIndex
CREATE INDEX "PluginPermission_permissionKey_idx" ON "PluginPermission"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PluginPermission_pluginId_permissionKey_key" ON "PluginPermission"("pluginId", "permissionKey");

-- AddForeignKey
ALTER TABLE "OrganizationPlugin" ADD CONSTRAINT "OrganizationPlugin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPlugin" ADD CONSTRAINT "OrganizationPlugin_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPlugin" ADD CONSTRAINT "OrganizationPlugin_installedById_fkey" FOREIGN KEY ("installedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginExecutionLog" ADD CONSTRAINT "PluginExecutionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginExecutionLog" ADD CONSTRAINT "PluginExecutionLog_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginExecutionLog" ADD CONSTRAINT "PluginExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginEventSubscription" ADD CONSTRAINT "PluginEventSubscription_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginPermission" ADD CONSTRAINT "PluginPermission_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
