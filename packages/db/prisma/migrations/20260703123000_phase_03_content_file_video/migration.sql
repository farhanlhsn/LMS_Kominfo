-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('MINIO', 'S3_COMPATIBLE');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'COURSE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FileAccessLevel" AS ENUM ('OWNER', 'INSTRUCTORS', 'ENROLLED_LEARNERS', 'ORGANIZATION_MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('CONTENT', 'THUMBNAIL', 'ATTACHMENT', 'VIDEO', 'DOCUMENT', 'BRANDING');

-- CreateEnum
CREATE TYPE "FileProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentLibraryItemType" AS ENUM ('RICH_TEXT', 'VIDEO', 'FILE', 'PDF', 'LINK', 'IMAGE');

-- AlterTable
ALTER TABLE "ActivityContent" ADD COLUMN "content" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ActivityContent" ADD COLUMN "textContent" TEXT;
ALTER TABLE "ActivityContent" ADD COLUMN "fileId" TEXT;
ALTER TABLE "ActivityContent" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "ActivityContent" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'MINIO',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "accessLevel" "FileAccessLevel" NOT NULL DEFAULT 'OWNER',
    "purpose" "FilePurpose" NOT NULL DEFAULT 'CONTENT',
    "processingStatus" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processedMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentLibraryItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContentLibraryItemType" NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContentLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityContent_fileId_idx" ON "ActivityContent"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "File_bucket_key_key" ON "File"("bucket", "key");

-- CreateIndex
CREATE INDEX "File_organizationId_createdAt_idx" ON "File"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "File_organizationId_processingStatus_idx" ON "File"("organizationId", "processingStatus");

-- CreateIndex
CREATE INDEX "File_ownerId_idx" ON "File"("ownerId");

-- CreateIndex
CREATE INDEX "File_folderId_idx" ON "File"("folderId");

-- CreateIndex
CREATE INDEX "Folder_organizationId_parentId_idx" ON "Folder"("organizationId", "parentId");

-- CreateIndex
CREATE INDEX "Folder_organizationId_name_idx" ON "Folder"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Folder_createdById_idx" ON "Folder"("createdById");

-- CreateIndex
CREATE INDEX "ContentLibraryItem_organizationId_type_idx" ON "ContentLibraryItem"("organizationId", "type");

-- CreateIndex
CREATE INDEX "ContentLibraryItem_organizationId_createdAt_idx" ON "ContentLibraryItem"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentLibraryItem_fileId_idx" ON "ContentLibraryItem"("fileId");

-- CreateIndex
CREATE INDEX "ContentLibraryItem_createdById_idx" ON "ContentLibraryItem"("createdById");

-- AddForeignKey
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
