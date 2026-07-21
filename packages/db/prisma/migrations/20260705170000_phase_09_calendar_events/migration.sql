CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "courseId" TEXT, "lessonId" TEXT, "activityId" TEXT,
  "title" TEXT NOT NULL, "description" TEXT, "type" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3), "timezone" TEXT, "sourceType" TEXT NOT NULL DEFAULT 'custom', "sourceId" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'course', "actionUrl" TEXT, "createdById" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarEvent_organizationId_startsAt_idx" ON "CalendarEvent"("organizationId", "startsAt");
CREATE INDEX "CalendarEvent_organizationId_courseId_startsAt_idx" ON "CalendarEvent"("organizationId", "courseId", "startsAt");
CREATE INDEX "CalendarEvent_organizationId_sourceType_sourceId_idx" ON "CalendarEvent"("organizationId", "sourceType", "sourceId");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
