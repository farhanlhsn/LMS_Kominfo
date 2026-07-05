CREATE TYPE "AiEmbeddingStatus" AS ENUM ('PENDING', 'READY', 'NEEDS_REINDEX', 'FAILED');

CREATE TABLE "AiDocumentChunk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "activityId" TEXT,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" JSONB,
    "embeddingProvider" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "embeddingRevision" TEXT,
    "embeddingDimensions" INTEGER NOT NULL,
    "embeddingVersion" TEXT,
    "status" "AiEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiDocumentChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiCanonicalQuestion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT,
    "canonicalText" TEXT NOT NULL,
    "embedding" JSONB,
    "embeddingProvider" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "embeddingRevision" TEXT,
    "embeddingDimensions" INTEGER NOT NULL,
    "embeddingVersion" TEXT,
    "status" "AiEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiCanonicalQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiClassificationPrototype" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT,
    "label" TEXT NOT NULL,
    "exampleText" TEXT NOT NULL,
    "embedding" JSONB,
    "embeddingProvider" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "embeddingRevision" TEXT,
    "embeddingDimensions" INTEGER NOT NULL,
    "embeddingVersion" TEXT,
    "status" "AiEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiClassificationPrototype_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiDocumentChunk_organizationId_courseId_status_idx" ON "AiDocumentChunk"("organizationId", "courseId", "status");
CREATE INDEX "AiDocumentChunk_organizationId_sourceDocumentId_chunkIndex_idx" ON "AiDocumentChunk"("organizationId", "sourceDocumentId", "chunkIndex");
CREATE INDEX "AiDocumentChunk_status_embeddingProvider_embeddingModel_idx" ON "AiDocumentChunk"("status", "embeddingProvider", "embeddingModel");
CREATE INDEX "AiCanonicalQuestion_organizationId_courseId_status_idx" ON "AiCanonicalQuestion"("organizationId", "courseId", "status");
CREATE INDEX "AiCanonicalQuestion_status_embeddingProvider_embeddingModel_idx" ON "AiCanonicalQuestion"("status", "embeddingProvider", "embeddingModel");
CREATE INDEX "AiClassificationPrototype_organizationId_courseId_label_status_idx" ON "AiClassificationPrototype"("organizationId", "courseId", "label", "status");
CREATE INDEX "AiClassificationPrototype_status_embeddingProvider_embeddingModel_idx" ON "AiClassificationPrototype"("status", "embeddingProvider", "embeddingModel");

ALTER TABLE "AiDocumentChunk" ADD CONSTRAINT "AiDocumentChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCanonicalQuestion" ADD CONSTRAINT "AiCanonicalQuestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiClassificationPrototype" ADD CONSTRAINT "AiClassificationPrototype_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
