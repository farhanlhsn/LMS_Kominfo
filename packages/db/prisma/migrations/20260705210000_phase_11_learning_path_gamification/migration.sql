-- Phase 11: Learning Path, Skills, Gamification
-- Learning Paths
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "difficulty" TEXT DEFAULT 'ALL_LEVELS',
    "durationHours" INTEGER NOT NULL DEFAULT 0,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPath_organizationId_slug_key" ON "LearningPath"("organizationId", "slug");
CREATE INDEX "LearningPath_organizationId_status_idx" ON "LearningPath"("organizationId", "status");
CREATE INDEX "LearningPath_organizationId_createdAt_idx" ON "LearningPath"("organizationId", "createdAt");

CREATE TABLE "LearningPathCourse" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningPathCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPathCourse_learningPathId_courseId_key" ON "LearningPathCourse"("learningPathId", "courseId");
CREATE INDEX "LearningPathCourse_learningPathId_orderIndex_idx" ON "LearningPathCourse"("learningPathId", "orderIndex");

CREATE TABLE "LearningPathEnrollment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningPathEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningPathEnrollment_organizationId_learningPathId_userId_key" ON "LearningPathEnrollment"("organizationId", "learningPathId", "userId");
CREATE INDEX "LearningPathEnrollment_organizationId_userId_idx" ON "LearningPathEnrollment"("organizationId", "userId");
CREATE INDEX "LearningPathEnrollment_organizationId_learningPathId_idx" ON "LearningPathEnrollment"("organizationId", "learningPathId");

-- Skills
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Skill_organizationId_slug_key" ON "Skill"("organizationId", "slug");
CREATE INDEX "Skill_organizationId_category_idx" ON "Skill"("organizationId", "category");

CREATE TABLE "CourseSkill" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseSkill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseSkill_courseId_skillId_key" ON "CourseSkill"("courseId", "skillId");

CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");
CREATE INDEX "UserSkill_skillId_proficiency_idx" ON "UserSkill"("skillId", "proficiency");

-- XP & Leaderboard
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "XpTransaction_organizationId_userId_createdAt_idx" ON "XpTransaction"("organizationId", "userId", "createdAt");
CREATE INDEX "XpTransaction_organizationId_createdAt_idx" ON "XpTransaction"("organizationId", "createdAt");

CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT,
    "period" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "rankings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeaderboardSnapshot_organizationId_courseId_period_snapshotDate_idx" ON "LeaderboardSnapshot"("organizationId", "courseId", "period", "snapshotDate");

-- Achievements
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Achievement_organizationId_key_key" ON "Achievement"("organizationId", "key");

CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- Foreign keys
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningPathEnrollment" ADD CONSTRAINT "LearningPathEnrollment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningPathEnrollment" ADD CONSTRAINT "LearningPathEnrollment_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningPathEnrollment" ADD CONSTRAINT "LearningPathEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseSkill" ADD CONSTRAINT "CourseSkill_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseSkill" ADD CONSTRAINT "CourseSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
