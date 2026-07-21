-- Phase 14: Index Optimization
-- Adding missing indexes on foreign keys for query performance

-- High-traffic: ActivityProgress (queried by org+course+lesson+activity+user)
CREATE INDEX IF NOT EXISTS "ActivityProgress_userId_idx" ON "ActivityProgress"("userId");
CREATE INDEX IF NOT EXISTS "ActivityProgress_enrollmentId_idx" ON "ActivityProgress"("enrollmentId");
CREATE INDEX IF NOT EXISTS "ActivityProgress_status_idx" ON "ActivityProgress"("status");

-- LearningEvent (queried by org+user+course+type)
CREATE INDEX IF NOT EXISTS "LearningEvent_userId_idx" ON "LearningEvent"("userId");
CREATE INDEX IF NOT EXISTS "LearningEvent_courseId_idx" ON "LearningEvent"("courseId");
CREATE INDEX IF NOT EXISTS "LearningEvent_eventType_idx" ON "LearningEvent"("eventType");

-- Notification (queried by org+user+read status)
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_readAt_idx" ON "Notification"("readAt");

-- AuditLog (queried by org+user+action)
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- DiscussionThread (queried by org+course+lesson+activity)
CREATE INDEX IF NOT EXISTS "DiscussionThread_courseId_idx" ON "DiscussionThread"("courseId");
CREATE INDEX IF NOT EXISTS "DiscussionThread_authorId_idx" ON "DiscussionThread"("authorId");

-- DiscussionReply (queried by thread+author)
CREATE INDEX IF NOT EXISTS "DiscussionReply_threadId_idx" ON "DiscussionReply"("threadId");
CREATE INDEX IF NOT EXISTS "DiscussionReply_authorId_idx" ON "DiscussionReply"("authorId");

-- Enrollment (queried by org+course+user+status)
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX IF NOT EXISTS "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX IF NOT EXISTS "Enrollment_status_idx" ON "Enrollment"("status");

-- ActivityContent (queried by activityId)
CREATE INDEX IF NOT EXISTS "ActivityContent_activityId_idx" ON "ActivityContent"("activityId");

-- File (queried by org+owner+folder)
CREATE INDEX IF NOT EXISTS "File_ownerId_idx" ON "File"("ownerId");
CREATE INDEX IF NOT EXISTS "File_folderId_idx" ON "File"("folderId");

-- Order (queried by org+user+status+coupon)
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_couponId_idx" ON "Order"("couponId");

-- Payment (queried by org+order+status)
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_confirmedById_idx" ON "Payment"("confirmedById");

-- AssignmentSubmission (queried by org+assignment+user)
CREATE INDEX IF NOT EXISTS "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentSubmission_userId_idx" ON "AssignmentSubmission"("userId");
CREATE INDEX IF NOT EXISTS "AssignmentSubmission_gradedById_idx" ON "AssignmentSubmission"("gradedById");

-- QuizAttempt (queried by org+quiz+user)
CREATE INDEX IF NOT EXISTS "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- Certificate (queried by org+course+user+verification)
CREATE INDEX IF NOT EXISTS "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_templateId_idx" ON "Certificate"("templateId");
CREATE INDEX IF NOT EXISTS "Certificate_revokedById_idx" ON "Certificate"("revokedById");

-- DiscussionReport (queried by org+reporter)
CREATE INDEX IF NOT EXISTS "DiscussionReport_threadId_idx" ON "DiscussionReport"("threadId");
CREATE INDEX IF NOT EXISTS "DiscussionReport_replyId_idx" ON "DiscussionReport"("replyId");
CREATE INDEX IF NOT EXISTS "DiscussionReport_reporterId_idx" ON "DiscussionReport"("reporterId");

-- QuestionBank (queried by org+course+owner)
CREATE INDEX IF NOT EXISTS "QuestionBank_ownerId_idx" ON "QuestionBank"("ownerId");

-- Question (queried by org+bank)
CREATE INDEX IF NOT EXISTS "Question_questionBankId_idx" ON "Question"("questionBankId");
CREATE INDEX IF NOT EXISTS "Question_createdById_idx" ON "Question"("createdById");

-- Quiz (queried by org+course+activity+creator)
CREATE INDEX IF NOT EXISTS "Quiz_activityId_idx" ON "Quiz"("activityId");
CREATE INDEX IF NOT EXISTS "Quiz_createdById_idx" ON "Quiz"("createdById");

-- QuizAnswer (queried by attempt+question)
CREATE INDEX IF NOT EXISTS "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");
CREATE INDEX IF NOT EXISTS "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- Assignment (queried by org+course+activity)
CREATE INDEX IF NOT EXISTS "Assignment_activityId_idx" ON "Assignment"("activityId");
CREATE INDEX IF NOT EXISTS "Assignment_createdById_idx" ON "Assignment"("createdById");
CREATE INDEX IF NOT EXISTS "Assignment_rubricId_idx" ON "Assignment"("rubricId");

-- LiveClass (queried by org+course)
CREATE INDEX IF NOT EXISTS "LiveClass_courseId_idx" ON "LiveClass"("courseId");
CREATE INDEX IF NOT EXISTS "LiveClass_createdById_idx" ON "LiveClass"("createdById");

-- CalendarEvent (queried by org+course+lesson+creator)
CREATE INDEX IF NOT EXISTS "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- MemberRole (queried by member+role)
CREATE INDEX IF NOT EXISTS "MemberRole_memberId_idx" ON "MemberRole"("memberId");
CREATE INDEX IF NOT EXISTS "MemberRole_roleId_idx" ON "MemberRole"("roleId");

-- OrganizationMember (queried by org+user)
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_status_idx" ON "OrganizationMember"("status");

-- CertificateTemplate (queried by org+creator)
CREATE INDEX IF NOT EXISTS "CertificateTemplate_createdById_idx" ON "CertificateTemplate"("createdById");

-- DiscussionThread status & pinned (queried for moderation)
CREATE INDEX IF NOT EXISTS "DiscussionThread_status_idx" ON "DiscussionThread"("status");

-- SubscriptionPlan (queried by org+active status)
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_organizationId_idx" ON "SubscriptionPlan"("organizationId");

-- Achievement (queried by org)
CREATE INDEX IF NOT EXISTS "Achievement_organizationId_idx" ON "Achievement"("organizationId");

-- Coupon (queried by org+code)
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_idx" ON "Coupon"("organizationId");
CREATE INDEX IF NOT EXISTS "Coupon_createdById_idx" ON "Coupon"("createdById");
CREATE INDEX IF NOT EXISTS "Coupon_courseId_idx" ON "Coupon"("courseId");

-- WebhookEndpoint (queried by org+status)
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");

-- WebhookDelivery (queried by endpoint)
CREATE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- ApiKey (queried by org+status)
CREATE INDEX IF NOT EXISTS "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");
CREATE INDEX IF NOT EXISTS "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- Lesson (queried by course+module)
CREATE INDEX IF NOT EXISTS "Lesson_moduleId_idx" ON "Lesson"("moduleId");

-- Module (queried by course)
CREATE INDEX IF NOT EXISTS "CourseModule_courseId_idx" ON "CourseModule"("courseId");

-- Skill (queried by org)
CREATE INDEX IF NOT EXISTS "Skill_organizationId_idx" ON "Skill"("organizationId");

-- CourseSkill (queried by course+skill)
CREATE INDEX IF NOT EXISTS "CourseSkill_courseId_idx" ON "CourseSkill"("courseId");
CREATE INDEX IF NOT EXISTS "CourseSkill_skillId_idx" ON "CourseSkill"("skillId");

-- UserSkill (queried by user+skill)
CREATE INDEX IF NOT EXISTS "UserSkill_userId_idx" ON "UserSkill"("userId");
CREATE INDEX IF NOT EXISTS "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- LearnerNote (queried by org+user+course+lesson+activity)
CREATE INDEX IF NOT EXISTS "LearnerNote_userId_idx" ON "LearnerNote"("userId");
CREATE INDEX IF NOT EXISTS "LearnerNote_lessonId_idx" ON "LearnerNote"("lessonId");
CREATE INDEX IF NOT EXISTS "LearnerNote_activityId_idx" ON "LearnerNote"("activityId");

-- LearnerBookmark (queried by org+user+course+lesson+activity)
CREATE INDEX IF NOT EXISTS "LearnerBookmark_userId_idx" ON "LearnerBookmark"("userId");
CREATE INDEX IF NOT EXISTS "LearnerBookmark_lessonId_idx" ON "LearnerBookmark"("lessonId");
CREATE INDEX IF NOT EXISTS "LearnerBookmark_activityId_idx" ON "LearnerBookmark"("activityId");

-- UserIdentity (queried by user+ssoProvider)
CREATE INDEX IF NOT EXISTS "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE INDEX IF NOT EXISTS "UserIdentity_ssoProviderId_idx" ON "UserIdentity"("ssoProviderId");

-- UserSession (queried by user)
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");

-- PluginExecutionLog (queried by org+plugin)
CREATE INDEX IF NOT EXISTS "PluginExecutionLog_pluginId_idx" ON "PluginExecutionLog"("pluginId");
CREATE INDEX IF NOT EXISTS "PluginExecutionLog_userId_idx" ON "PluginExecutionLog"("userId");

-- OrganizationPlugin (queried by org+plugin)
CREATE INDEX IF NOT EXISTS "OrganizationPlugin_pluginId_idx" ON "OrganizationPlugin"("pluginId");
CREATE INDEX IF NOT EXISTS "OrganizationPlugin_installedById_idx" ON "OrganizationPlugin"("installedById");

-- AiConversation (queried by org+user)
CREATE INDEX IF NOT EXISTS "AiConversation_userId_idx" ON "AiConversation"("userId");

-- AiUsageLog (queried by org+user)
CREATE INDEX IF NOT EXISTS "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");

-- Folder (queried by org+parent)
CREATE INDEX IF NOT EXISTS "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX IF NOT EXISTS "Folder_createdById_idx" ON "Folder"("createdById");

-- LearningPathEnrollment (queried by org+path+user)
CREATE INDEX IF NOT EXISTS "LearningPathEnrollment_userId_idx" ON "LearningPathEnrollment"("userId");

-- LearningPathCourse (queried by path+course)
CREATE INDEX IF NOT EXISTS "LearningPathCourse_courseId_idx" ON "LearningPathCourse"("courseId");

-- DailyCourseAggregate (queried by org+course)
CREATE INDEX IF NOT EXISTS "DailyCourseAggregate_organizationId_idx" ON "DailyCourseAggregate"("organizationId");
CREATE INDEX IF NOT EXISTS "DailyCourseAggregate_courseId_idx" ON "DailyCourseAggregate"("courseId");

-- LearnerDailyActivity (queried by org+user)
CREATE INDEX IF NOT EXISTS "LearnerDailyActivity_organizationId_idx" ON "LearnerDailyActivity"("organizationId");
CREATE INDEX IF NOT EXISTS "LearnerDailyActivity_userId_idx" ON "LearnerDailyActivity"("userId");

-- LeaderboardSnapshot (queried by org+course)
CREATE INDEX IF NOT EXISTS "LeaderboardSnapshot_organizationId_idx" ON "LeaderboardSnapshot"("organizationId");
CREATE INDEX IF NOT EXISTS "LeaderboardSnapshot_courseId_idx" ON "LeaderboardSnapshot"("courseId");

-- ContentLibraryItem (queried by org+creator)
CREATE INDEX IF NOT EXISTS "ContentLibraryItem_fileId_idx" ON "ContentLibraryItem"("fileId");
CREATE INDEX IF NOT EXISTS "ContentLibraryItem_createdById_idx" ON "ContentLibraryItem"("createdById");

-- Rubric (queried by org+course+creator)
CREATE INDEX IF NOT EXISTS "Rubric_courseId_idx" ON "Rubric"("courseId");
CREATE INDEX IF NOT EXISTS "Rubric_createdById_idx" ON "Rubric"("createdById");

-- OrderItem (queried by order+course)
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_courseId_idx" ON "OrderItem"("courseId");
