-- Phase 15: Reviews, Wishlist, Favorites, Recently Viewed

-- CourseReview
CREATE TABLE "CourseReview" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "courseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL, "rating" INTEGER NOT NULL, "title" TEXT, "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "moderatedById" TEXT, "moderatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseReview_organizationId_courseId_userId_key" ON "CourseReview"("organizationId", "courseId", "userId");
CREATE INDEX "CourseReview_organizationId_courseId_status_idx" ON "CourseReview"("organizationId", "courseId", "status");
CREATE INDEX "CourseReview_organizationId_courseId_rating_idx" ON "CourseReview"("organizationId", "courseId", "rating");
CREATE INDEX "CourseReview_organizationId_status_idx" ON "CourseReview"("organizationId", "status");

-- Wishlist
CREATE TABLE "Wishlist" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Wishlist_organizationId_userId_courseId_key" ON "Wishlist"("organizationId", "userId", "courseId");
CREATE INDEX "Wishlist_organizationId_userId_idx" ON "Wishlist"("organizationId", "userId");

-- FavoriteInstructor
CREATE TABLE "FavoriteInstructor" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteInstructor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FavoriteInstructor_organizationId_userId_instructorId_key" ON "FavoriteInstructor"("organizationId", "userId", "instructorId");
CREATE INDEX "FavoriteInstructor_organizationId_instructorId_idx" ON "FavoriteInstructor"("organizationId", "instructorId");

-- RecentlyViewedCourse
CREATE TABLE "RecentlyViewedCourse" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL, "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecentlyViewedCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecentlyViewedCourse_organizationId_userId_courseId_key" ON "RecentlyViewedCourse"("organizationId", "userId", "courseId");
CREATE INDEX "RecentlyViewedCourse_organizationId_userId_viewedAt_idx" ON "RecentlyViewedCourse"("organizationId", "userId", "viewedAt");

-- Foreign keys
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FavoriteInstructor" ADD CONSTRAINT "FavoriteInstructor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FavoriteInstructor" ADD CONSTRAINT "FavoriteInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FavoriteInstructor" ADD CONSTRAINT "FavoriteInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecentlyViewedCourse" ADD CONSTRAINT "RecentlyViewedCourse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecentlyViewedCourse" ADD CONSTRAINT "RecentlyViewedCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecentlyViewedCourse" ADD CONSTRAINT "RecentlyViewedCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
