-- Create analytics aggregate tables for Phase 10
CREATE TABLE "DailyCourseAggregate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "activeLearners" INTEGER NOT NULL DEFAULT 0,
    "newEnrollments" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "avgProgressPercent" DOUBLE PRECISION,
    "activityEvents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCourseAggregate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearnerDailyActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "activityMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerDailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyCourseAggregate_organizationId_courseId_date_key" ON "DailyCourseAggregate"("organizationId", "courseId", "date");
CREATE INDEX "DailyCourseAggregate_organizationId_courseId_date_idx" ON "DailyCourseAggregate"("organizationId", "courseId", "date");

CREATE UNIQUE INDEX "LearnerDailyActivity_organizationId_userId_date_key" ON "LearnerDailyActivity"("organizationId", "userId", "date");
CREATE INDEX "LearnerDailyActivity_organizationId_userId_date_idx" ON "LearnerDailyActivity"("organizationId", "userId", "date");

ALTER TABLE "DailyCourseAggregate" ADD CONSTRAINT "DailyCourseAggregate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyCourseAggregate" ADD CONSTRAINT "DailyCourseAggregate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LearnerDailyActivity" ADD CONSTRAINT "LearnerDailyActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearnerDailyActivity" ADD CONSTRAINT "LearnerDailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
