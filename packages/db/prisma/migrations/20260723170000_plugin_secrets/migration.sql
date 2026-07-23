-- Tenant-scoped encrypted plugin credentials. Plaintext values never enter JSON config.
CREATE TABLE "PluginSecret" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "lastFour" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PluginSecret_organizationId_pluginId_key_key"
ON "PluginSecret"("organizationId", "pluginId", "key");

CREATE INDEX "PluginSecret_organizationId_pluginId_idx"
ON "PluginSecret"("organizationId", "pluginId");

ALTER TABLE "PluginSecret"
ADD CONSTRAINT "PluginSecret_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PluginSecret"
ADD CONSTRAINT "PluginSecret_pluginId_fkey"
FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
