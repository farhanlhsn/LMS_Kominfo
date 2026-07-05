-- Phase 16: organization branding (white-label) fields
ALTER TABLE "Organization"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "faviconUrl" TEXT,
  ADD COLUMN "primaryColor" TEXT,
  ADD COLUMN "secondaryColor" TEXT,
  ADD COLUMN "accentColor" TEXT,
  ADD COLUMN "borderRadius" TEXT;
