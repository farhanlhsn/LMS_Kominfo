-- Phase 17: Advanced video learning

CREATE TYPE "VideoCaptionTrackKind" AS ENUM ('CAPTION', 'SUBTITLE');
CREATE TYPE "VideoCaptionTrackSource" AS ENUM ('MANUAL', 'UPLOAD', 'TRANSCRIPT');
CREATE TYPE "AiGeneratedItemType" AS ENUM (
  'QUESTION',
  'QUIZ',
  'SUMMARY',
  'FLASHCARD',
  'ASSIGNMENT',
  'RUBRIC',
  'COURSE_OUTLINE',
  'LESSON_CONTENT'
);
CREATE TYPE "AiGeneratedItemStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED');

CREATE TABLE "VideoCaptionTrack" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "lessonId" TEXT,
  "activityId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "kind" "VideoCaptionTrackKind" NOT NULL DEFAULT 'CAPTION',
  "source" "VideoCaptionTrackSource" NOT NULL DEFAULT 'MANUAL',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "cues" JSONB NOT NULL DEFAULT '[]',
  "rawContent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoCaptionTrack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoCaptionTrack_organizationId_activityId_language_idx"
  ON "VideoCaptionTrack"("organizationId", "activityId", "language");
CREATE INDEX "VideoCaptionTrack_organizationId_activityId_isDefault_idx"
  ON "VideoCaptionTrack"("organizationId", "activityId", "isDefault");

ALTER TABLE "VideoCaptionTrack"
  ADD CONSTRAINT "VideoCaptionTrack_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCaptionTrack"
  ADD CONSTRAINT "VideoCaptionTrack_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCaptionTrack"
  ADD CONSTRAINT "VideoCaptionTrack_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoCaptionTrack"
  ADD CONSTRAINT "VideoCaptionTrack_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AiGeneratedItem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "courseId" TEXT,
  "lessonId" TEXT,
  "activityId" TEXT,
  "createdById" TEXT NOT NULL,
  "type" "AiGeneratedItemType" NOT NULL,
  "title" TEXT,
  "prompt" TEXT NOT NULL,
  "output" JSONB NOT NULL,
  "status" "AiGeneratedItemStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiGeneratedItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiGeneratedItem_organizationId_type_status_idx"
  ON "AiGeneratedItem"("organizationId", "type", "status");
CREATE INDEX "AiGeneratedItem_organizationId_activityId_createdAt_idx"
  ON "AiGeneratedItem"("organizationId", "activityId", "createdAt");

ALTER TABLE "AiGeneratedItem"
  ADD CONSTRAINT "AiGeneratedItem_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGeneratedItem"
  ADD CONSTRAINT "AiGeneratedItem_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneratedItem"
  ADD CONSTRAINT "AiGeneratedItem_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneratedItem"
  ADD CONSTRAINT "AiGeneratedItem_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneratedItem"
  ADD CONSTRAINT "AiGeneratedItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
