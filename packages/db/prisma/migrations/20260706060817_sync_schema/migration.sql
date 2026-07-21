/*
  Warnings:

  - The `status` column on the `ApiKey` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `CourseReview` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `LearningPath` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `difficulty` column on the `LearningPath` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `LearningPathEnrollment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `provider` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `interval` column on the `SubscriptionPlan` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `UserSubscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `WebhookDelivery` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `events` column on the `WebhookEndpoint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `WebhookEndpoint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `period` on the `LeaderboardSnapshot` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventType` on the `WebhookDelivery` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningPathEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'MIDTRANS', 'XENDIT', 'STRIPE');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_PUBLISHED', 'ENROLLMENT_CREATED', 'ENROLLMENT_COMPLETED', 'USER_REGISTERED', 'PAYMENT_RECEIVED', 'ORDER_COMPLETED', 'CERTIFICATE_ISSUED', 'QUIZ_ATTEMPTED', 'ASSIGNMENT_SUBMITTED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'DISABLED', 'FAILING');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- DropIndex
DROP INDEX "Achievement_organizationId_idx";

-- DropIndex
DROP INDEX "ActivityProgress_enrollmentId_idx";

-- DropIndex
DROP INDEX "ActivityProgress_status_idx";

-- DropIndex
DROP INDEX "AiConversation_userId_idx";

-- DropIndex
DROP INDEX "AiUsageLog_userId_idx";

-- DropIndex
DROP INDEX "ApiKey_createdById_idx";

-- DropIndex
DROP INDEX "ApiKey_organizationId_idx";

-- DropIndex
DROP INDEX "Assignment_activityId_idx";

-- DropIndex
DROP INDEX "Assignment_rubricId_idx";

-- DropIndex
DROP INDEX "AssignmentSubmission_gradedById_idx";

-- DropIndex
DROP INDEX "AuditLog_entityType_idx";

-- DropIndex
DROP INDEX "CalendarEvent_createdById_idx";

-- DropIndex
DROP INDEX "Certificate_revokedById_idx";

-- DropIndex
DROP INDEX "Certificate_templateId_idx";

-- DropIndex
DROP INDEX "Coupon_courseId_idx";

-- DropIndex
DROP INDEX "Coupon_createdById_idx";

-- DropIndex
DROP INDEX "Coupon_organizationId_idx";

-- DropIndex
DROP INDEX "CourseModule_courseId_idx";

-- DropIndex
DROP INDEX "CourseSkill_courseId_idx";

-- DropIndex
DROP INDEX "CourseSkill_skillId_idx";

-- DropIndex
DROP INDEX "DailyCourseAggregate_courseId_idx";

-- DropIndex
DROP INDEX "DailyCourseAggregate_organizationId_idx";

-- DropIndex
DROP INDEX "DiscussionReport_replyId_idx";

-- DropIndex
DROP INDEX "DiscussionReport_reporterId_idx";

-- DropIndex
DROP INDEX "DiscussionReport_threadId_idx";

-- DropIndex
DROP INDEX "DiscussionThread_status_idx";

-- DropIndex
DROP INDEX "Enrollment_status_idx";

-- DropIndex
DROP INDEX "Folder_parentId_idx";

-- DropIndex
DROP INDEX "LeaderboardSnapshot_courseId_idx";

-- DropIndex
DROP INDEX "LeaderboardSnapshot_organizationId_idx";

-- DropIndex
DROP INDEX "LearnerBookmark_activityId_idx";

-- DropIndex
DROP INDEX "LearnerBookmark_lessonId_idx";

-- DropIndex
DROP INDEX "LearnerDailyActivity_organizationId_idx";

-- DropIndex
DROP INDEX "LearnerDailyActivity_userId_idx";

-- DropIndex
DROP INDEX "LearnerNote_activityId_idx";

-- DropIndex
DROP INDEX "LearnerNote_lessonId_idx";

-- DropIndex
DROP INDEX "LearningEvent_eventType_idx";

-- DropIndex
DROP INDEX "LearningPathCourse_courseId_idx";

-- DropIndex
DROP INDEX "LearningPathEnrollment_userId_idx";

-- DropIndex
DROP INDEX "Lesson_moduleId_idx";

-- DropIndex
DROP INDEX "LiveClass_courseId_idx";

-- DropIndex
DROP INDEX "LiveClass_createdById_idx";

-- DropIndex
DROP INDEX "MemberRole_memberId_idx";

-- DropIndex
DROP INDEX "Notification_readAt_idx";

-- DropIndex
DROP INDEX "Order_couponId_idx";

-- DropIndex
DROP INDEX "OrderItem_courseId_idx";

-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "OrganizationMember_status_idx";

-- DropIndex
DROP INDEX "Payment_confirmedById_idx";

-- DropIndex
DROP INDEX "PluginExecutionLog_userId_idx";

-- DropIndex
DROP INDEX "Question_questionBankId_idx";

-- DropIndex
DROP INDEX "Quiz_activityId_idx";

-- DropIndex
DROP INDEX "QuizAnswer_attemptId_idx";

-- DropIndex
DROP INDEX "Rubric_courseId_idx";

-- DropIndex
DROP INDEX "Skill_organizationId_idx";

-- DropIndex
DROP INDEX "SubscriptionPlan_organizationId_idx";

-- DropIndex
DROP INDEX "UserIdentity_ssoProviderId_idx";

-- DropIndex
DROP INDEX "UserSkill_skillId_idx";

-- DropIndex
DROP INDEX "WebhookDelivery_endpointId_idx";

-- DropIndex
DROP INDEX "WebhookEndpoint_createdById_idx";

-- DropIndex
DROP INDEX "WebhookEndpoint_organizationId_idx";

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "ipRestrictions" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "CourseReview" DROP COLUMN "status",
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "LeaderboardSnapshot" DROP COLUMN "period",
ADD COLUMN     "period" "LeaderboardPeriod" NOT NULL;

-- AlterTable
ALTER TABLE "LearningPath" DROP COLUMN "status",
ADD COLUMN     "status" "LearningPathStatus" NOT NULL DEFAULT 'DRAFT',
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "CourseLevel";

-- AlterTable
ALTER TABLE "LearningPathEnrollment" DROP COLUMN "status",
ADD COLUMN     "status" "LearningPathEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "primaryColor" DROP NOT NULL,
ALTER COLUMN "primaryColor" DROP DEFAULT,
ALTER COLUMN "secondaryColor" DROP NOT NULL,
ALTER COLUMN "secondaryColor" DROP DEFAULT,
ALTER COLUMN "accentColor" DROP NOT NULL,
ALTER COLUMN "accentColor" DROP DEFAULT,
ALTER COLUMN "borderRadius" DROP NOT NULL,
ALTER COLUMN "borderRadius" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "provider",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "interval",
ADD COLUMN     "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "UserSubscription" DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "WebhookDelivery" DROP COLUMN "eventType",
ADD COLUMN     "eventType" "WebhookEventType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "WebhookEndpoint" DROP COLUMN "events",
ADD COLUMN     "events" "WebhookEventType"[],
DROP COLUMN "status",
ADD COLUMN     "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_status_idx" ON "ApiKey"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "CourseReview_organizationId_courseId_status_idx" ON "CourseReview"("organizationId", "courseId", "status");

-- CreateIndex
CREATE INDEX "CourseReview_organizationId_status_idx" ON "CourseReview"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_organizationId_courseId_period_snapshot_idx" ON "LeaderboardSnapshot"("organizationId", "courseId", "period", "snapshotDate");

-- CreateIndex
CREATE INDEX "LearningGoal_userId_idx" ON "LearningGoal"("userId");

-- CreateIndex
CREATE INDEX "LearningPath_organizationId_status_idx" ON "LearningPath"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LessonWorkspaceState_userId_idx" ON "LessonWorkspaceState"("userId");

-- CreateIndex
CREATE INDEX "Order_organizationId_status_idx" ON "Order"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Payment_organizationId_status_idx" ON "Payment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_organizationId_status_idx" ON "UserSubscription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_status_idx" ON "WebhookDelivery"("endpointId", "status");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_status_idx" ON "WebhookEndpoint"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "ScormPackage" ADD CONSTRAINT "ScormPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormPackage" ADD CONSTRAINT "ScormPackage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormPackage" ADD CONSTRAINT "ScormPackage_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormAttempt" ADD CONSTRAINT "ScormAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormAttempt" ADD CONSTRAINT "ScormAttempt_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ScormPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScormAttempt" ADD CONSTRAINT "ScormAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PContent" ADD CONSTRAINT "H5PContent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PContent" ADD CONSTRAINT "H5PContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PContent" ADD CONSTRAINT "H5PContent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PResult" ADD CONSTRAINT "H5PResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PResult" ADD CONSTRAINT "H5PResult_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "H5PContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "H5PResult" ADD CONSTRAINT "H5PResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XapiStatement" ADD CONSTRAINT "XapiStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XapiActivityState" ADD CONSTRAINT "XapiActivityState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX IF EXISTS "AiAnswerCache_organizationId_courseId_canonicalKey_contextHash_" RENAME TO "AiAnswerCache_organizationId_courseId_canonicalKey_contextH_key";

-- RenameIndex
ALTER INDEX IF EXISTS "LeaderboardSnapshot_organizationId_courseId_period_snapshotDate" RENAME TO "LeaderboardSnapshot_organizationId_courseId_period_snapshot_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "PollVote_org_poll_user_key" RENAME TO "PollVote_organizationId_pollId_userId_key";

-- RenameIndex
ALTER INDEX IF EXISTS "XapiActivityState_org_activity_agent_state_key" RENAME TO "XapiActivityState_organizationId_activityId_agent_stateId_key";
