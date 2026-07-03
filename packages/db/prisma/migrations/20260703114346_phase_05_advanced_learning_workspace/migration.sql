-- CreateEnum
CREATE TYPE "WorkspaceLayoutMode" AS ENUM ('standard', 'side_by_side', 'focus', 'theatre', 'split_video_transcript', 'split_content_notes', 'split_content_ai', 'dual_window', 'popout_panel', 'picture_in_picture_video');

-- CreateEnum
CREATE TYPE "WorkspacePanelMode" AS ENUM ('notes', 'transcript', 'resources', 'ai', 'discussion', 'flashcards', 'bookmarks', 'activity_info');

-- CreateEnum
CREATE TYPE "LearnerNoteVisibility" AS ENUM ('PRIVATE', 'INSTRUCTOR_VISIBLE', 'SHARED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "assessmentDisplayPolicy" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "LearningWorkspacePreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredLayout" "WorkspaceLayoutMode" NOT NULL DEFAULT 'standard',
    "rightPanelMode" "WorkspacePanelMode",
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "rightPanelCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "playbackSpeed" DOUBLE PRECISION,
    "captionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transcriptEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notesPanelOpen" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningWorkspacePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonWorkspaceState" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "activityId" TEXT,
    "layout" "WorkspaceLayoutMode" NOT NULL DEFAULT 'standard',
    "rightPanelMode" "WorkspacePanelMode",
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "rightPanelCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "lastVideoTimeSeconds" DOUBLE PRECISION,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonWorkspaceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "activityId" TEXT,
    "videoTimeSeconds" DOUBLE PRECISION,
    "selectedText" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "LearnerNoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LearnerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerBookmark" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "activityId" TEXT,
    "videoTimeSeconds" DOUBLE PRECISION,
    "title" TEXT,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LearnerBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "activityId" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "endSeconds" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "speaker" TEXT,
    "language" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningWorkspacePreference_userId_idx" ON "LearningWorkspacePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningWorkspacePreference_organizationId_userId_key" ON "LearningWorkspacePreference"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "LessonWorkspaceState_organizationId_userId_courseId_idx" ON "LessonWorkspaceState"("organizationId", "userId", "courseId");

-- CreateIndex
CREATE INDEX "LessonWorkspaceState_organizationId_userId_lessonId_idx" ON "LessonWorkspaceState"("organizationId", "userId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonWorkspaceState_organizationId_userId_activityId_idx" ON "LessonWorkspaceState"("organizationId", "userId", "activityId");

-- CreateIndex
CREATE INDEX "LearnerNote_organizationId_userId_courseId_idx" ON "LearnerNote"("organizationId", "userId", "courseId");

-- CreateIndex
CREATE INDEX "LearnerNote_organizationId_userId_activityId_idx" ON "LearnerNote"("organizationId", "userId", "activityId");

-- CreateIndex
CREATE INDEX "LearnerNote_organizationId_deletedAt_idx" ON "LearnerNote"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "LearnerBookmark_organizationId_userId_courseId_idx" ON "LearnerBookmark"("organizationId", "userId", "courseId");

-- CreateIndex
CREATE INDEX "LearnerBookmark_organizationId_userId_activityId_idx" ON "LearnerBookmark"("organizationId", "userId", "activityId");

-- CreateIndex
CREATE INDEX "LearnerBookmark_organizationId_deletedAt_idx" ON "LearnerBookmark"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "TranscriptSegment_organizationId_courseId_idx" ON "TranscriptSegment"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_organizationId_activityId_orderIndex_idx" ON "TranscriptSegment"("organizationId", "activityId", "orderIndex");

-- CreateIndex
CREATE INDEX "TranscriptSegment_activityId_startSeconds_idx" ON "TranscriptSegment"("activityId", "startSeconds");

-- AddForeignKey
ALTER TABLE "LearningWorkspacePreference" ADD CONSTRAINT "LearningWorkspacePreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningWorkspacePreference" ADD CONSTRAINT "LearningWorkspacePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWorkspaceState" ADD CONSTRAINT "LessonWorkspaceState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWorkspaceState" ADD CONSTRAINT "LessonWorkspaceState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWorkspaceState" ADD CONSTRAINT "LessonWorkspaceState_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWorkspaceState" ADD CONSTRAINT "LessonWorkspaceState_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWorkspaceState" ADD CONSTRAINT "LessonWorkspaceState_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerNote" ADD CONSTRAINT "LearnerNote_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBookmark" ADD CONSTRAINT "LearnerBookmark_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBookmark" ADD CONSTRAINT "LearnerBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBookmark" ADD CONSTRAINT "LearnerBookmark_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBookmark" ADD CONSTRAINT "LearnerBookmark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBookmark" ADD CONSTRAINT "LearnerBookmark_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
