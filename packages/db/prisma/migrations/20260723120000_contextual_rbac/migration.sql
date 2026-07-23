CREATE TYPE "AccessContextType" AS ENUM (
  'SYSTEM',
  'ORGANIZATION',
  'USER',
  'COURSE_CATEGORY',
  'COURSE',
  'MODULE',
  'ACTIVITY',
  'PLUGIN'
);

CREATE TYPE "CapabilityEffect" AS ENUM (
  'INHERIT',
  'ALLOW',
  'PREVENT',
  'PROHIBIT'
);

CREATE TYPE "CapabilityType" AS ENUM ('READ', 'WRITE');

ALTER TABLE "Permission"
  ADD COLUMN "capabilityType" "CapabilityType" NOT NULL DEFAULT 'WRITE',
  ADD COLUMN "component" TEXT NOT NULL DEFAULT 'core',
  ADD COLUMN "contextTypes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "riskBitmask" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sourcePluginKey" TEXT;

ALTER TABLE "Role"
  ADD COLUMN "archetype" TEXT,
  ADD COLUMN "assignableContextTypes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AccessContext" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "type" "AccessContextType" NOT NULL,
  "instanceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "parentId" TEXT,
  "path" TEXT NOT NULL,
  "depth" INTEGER NOT NULL,
  "component" TEXT NOT NULL DEFAULT 'core',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "missingReason" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessContext_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContextRoleAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contextId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedById" TEXT,
  "sourceComponent" TEXT NOT NULL DEFAULT 'core',
  "sourceId" TEXT NOT NULL DEFAULT '',
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContextRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleCapabilityOverride" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "contextId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "effect" "CapabilityEffect" NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleCapabilityOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleDelegation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorRoleId" TEXT NOT NULL,
  "targetRoleId" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  "canAssign" BOOLEAN NOT NULL DEFAULT false,
  "canOverride" BOOLEAN NOT NULL DEFAULT false,
  "canSwitch" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleDelegation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleSwitch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contextId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleSwitch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessContext_key_key" ON "AccessContext"("key");
CREATE INDEX "AccessContext_organizationId_type_isActive_idx" ON "AccessContext"("organizationId", "type", "isActive");
CREATE INDEX "AccessContext_parentId_idx" ON "AccessContext"("parentId");
CREATE INDEX "AccessContext_path_idx" ON "AccessContext"("path");
CREATE UNIQUE INDEX "AccessContext_organizationId_type_instanceId_key" ON "AccessContext"("organizationId", "type", "instanceId");
CREATE INDEX "ContextRoleAssignment_organizationId_userId_idx" ON "ContextRoleAssignment"("organizationId", "userId");
CREATE INDEX "ContextRoleAssignment_roleId_idx" ON "ContextRoleAssignment"("roleId");
CREATE INDEX "ContextRoleAssignment_expiresAt_idx" ON "ContextRoleAssignment"("expiresAt");
CREATE UNIQUE INDEX "ContextRoleAssignment_contextId_roleId_userId_sourceCompone_key" ON "ContextRoleAssignment"("contextId", "roleId", "userId", "sourceComponent", "sourceId");
CREATE INDEX "RoleCapabilityOverride_organizationId_roleId_idx" ON "RoleCapabilityOverride"("organizationId", "roleId");
CREATE INDEX "RoleCapabilityOverride_permissionId_idx" ON "RoleCapabilityOverride"("permissionId");
CREATE UNIQUE INDEX "RoleCapabilityOverride_contextId_roleId_permissionId_key" ON "RoleCapabilityOverride"("contextId", "roleId", "permissionId");
CREATE INDEX "RoleDelegation_targetRoleId_idx" ON "RoleDelegation"("targetRoleId");
CREATE UNIQUE INDEX "RoleDelegation_organizationId_actorRoleId_targetRoleId_key" ON "RoleDelegation"("organizationId", "actorRoleId", "targetRoleId");
CREATE INDEX "RoleSwitch_organizationId_userId_idx" ON "RoleSwitch"("organizationId", "userId");
CREATE INDEX "RoleSwitch_roleId_idx" ON "RoleSwitch"("roleId");
CREATE INDEX "RoleSwitch_expiresAt_idx" ON "RoleSwitch"("expiresAt");
CREATE UNIQUE INDEX "RoleSwitch_sessionId_contextId_key" ON "RoleSwitch"("sessionId", "contextId");
CREATE INDEX "Permission_component_isActive_idx" ON "Permission"("component", "isActive");
CREATE INDEX "Permission_sourcePluginKey_idx" ON "Permission"("sourcePluginKey");

ALTER TABLE "AccessContext"
  ADD CONSTRAINT "AccessContext_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessContext"
  ADD CONSTRAINT "AccessContext_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "AccessContext"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextRoleAssignment"
  ADD CONSTRAINT "ContextRoleAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextRoleAssignment"
  ADD CONSTRAINT "ContextRoleAssignment_contextId_fkey"
  FOREIGN KEY ("contextId") REFERENCES "AccessContext"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextRoleAssignment"
  ADD CONSTRAINT "ContextRoleAssignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextRoleAssignment"
  ADD CONSTRAINT "ContextRoleAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContextRoleAssignment"
  ADD CONSTRAINT "ContextRoleAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoleCapabilityOverride"
  ADD CONSTRAINT "RoleCapabilityOverride_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleCapabilityOverride"
  ADD CONSTRAINT "RoleCapabilityOverride_contextId_fkey"
  FOREIGN KEY ("contextId") REFERENCES "AccessContext"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleCapabilityOverride"
  ADD CONSTRAINT "RoleCapabilityOverride_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleCapabilityOverride"
  ADD CONSTRAINT "RoleCapabilityOverride_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleCapabilityOverride"
  ADD CONSTRAINT "RoleCapabilityOverride_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoleDelegation"
  ADD CONSTRAINT "RoleDelegation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleDelegation"
  ADD CONSTRAINT "RoleDelegation_actorRoleId_fkey"
  FOREIGN KEY ("actorRoleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleDelegation"
  ADD CONSTRAINT "RoleDelegation_targetRoleId_fkey"
  FOREIGN KEY ("targetRoleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleSwitch"
  ADD CONSTRAINT "RoleSwitch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleSwitch"
  ADD CONSTRAINT "RoleSwitch_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleSwitch"
  ADD CONSTRAINT "RoleSwitch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleSwitch"
  ADD CONSTRAINT "RoleSwitch_contextId_fkey"
  FOREIGN KEY ("contextId") REFERENCES "AccessContext"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleSwitch"
  ADD CONSTRAINT "RoleSwitch_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
