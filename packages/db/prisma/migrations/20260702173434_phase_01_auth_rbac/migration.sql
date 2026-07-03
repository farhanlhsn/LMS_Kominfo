-- CreateEnum
CREATE TYPE "SsoProviderType" AS ENUM ('SAML', 'OIDC', 'GOOGLE_WORKSPACE', 'MICROSOFT_ENTRA');

-- CreateEnum
CREATE TYPE "IdentityProviderType" AS ENUM ('PASSWORD', 'GOOGLE', 'MICROSOFT', 'SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "activeOrganizationId" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- CreateTable
CREATE TABLE "SsoProvider" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "SsoProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "entityId" TEXT,
    "clientId" TEXT,
    "clientSecretEncrypted" TEXT,
    "metadataUrl" TEXT,
    "metadataXml" TEXT,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "userInfoUrl" TEXT,
    "callbackUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "jitProvisioningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inviteOnly" BOOLEAN NOT NULL DEFAULT true,
    "defaultRoleId" TEXT,
    "groupRoleMappings" JSONB,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsoProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "providerType" "IdentityProviderType" NOT NULL,
    "ssoProviderId" TEXT,
    "providerSubject" TEXT NOT NULL,
    "providerEmail" TEXT NOT NULL,
    "providerEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "rawProfile" JSONB NOT NULL DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verificationStatus" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "ssoProviderId" TEXT,
    "enforceSso" BOOLEAN NOT NULL DEFAULT false,
    "autoJoinEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLoginPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "allowPasswordLogin" BOOLEAN NOT NULL DEFAULT true,
    "allowSocialLogin" BOOLEAN NOT NULL DEFAULT false,
    "allowSsoLogin" BOOLEAN NOT NULL DEFAULT false,
    "requireSsoForVerifiedDomains" BOOLEAN NOT NULL DEFAULT false,
    "jitProvisioningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "sessionTtlMinutes" INTEGER NOT NULL DEFAULT 43200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLoginPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SsoProvider_organizationId_idx" ON "SsoProvider"("organizationId");

-- CreateIndex
CREATE INDEX "SsoProvider_organizationId_enabled_idx" ON "SsoProvider"("organizationId", "enabled");

-- CreateIndex
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

-- CreateIndex
CREATE INDEX "UserIdentity_organizationId_idx" ON "UserIdentity"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_providerType_organizationId_providerSubject_key" ON "UserIdentity"("providerType", "organizationId", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_ssoProviderId_providerSubject_key" ON "UserIdentity"("ssoProviderId", "providerSubject");

-- CreateIndex
CREATE INDEX "OrganizationDomain_domain_idx" ON "OrganizationDomain"("domain");

-- CreateIndex
CREATE INDEX "OrganizationDomain_organizationId_verificationStatus_idx" ON "OrganizationDomain"("organizationId", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_organizationId_domain_key" ON "OrganizationDomain"("organizationId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLoginPolicy_organizationId_key" ON "OrganizationLoginPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "UserSession_activeOrganizationId_idx" ON "UserSession"("activeOrganizationId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoProvider" ADD CONSTRAINT "SsoProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoProvider" ADD CONSTRAINT "SsoProvider_defaultRoleId_fkey" FOREIGN KEY ("defaultRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_ssoProviderId_fkey" FOREIGN KEY ("ssoProviderId") REFERENCES "SsoProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDomain" ADD CONSTRAINT "OrganizationDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDomain" ADD CONSTRAINT "OrganizationDomain_ssoProviderId_fkey" FOREIGN KEY ("ssoProviderId") REFERENCES "SsoProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLoginPolicy" ADD CONSTRAINT "OrganizationLoginPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
