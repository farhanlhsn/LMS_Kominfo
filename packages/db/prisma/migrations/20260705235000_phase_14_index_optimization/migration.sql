-- Phase 14: Index Optimization
-- Adding missing indexes on foreign keys for query performance

-- High-traffic: ActivityProgress (queried by org+course+lesson+activity+user)
CREATE INDEX "ActivityProgress_userId_idx" ON "ActivityProgress"("userId");
CREATE INDEX "ActivityProgress_enrollmentId_idx" ON "ActivityProgress"("enrollmentId");
CREATE INDEX "ActivityProgress_status_idx" ON "ActivityProgress"("status");

-- LearningEvent (queried by org+user+course+type)
CREATE INDEX "LearningEvent_userId_idx" ON "LearningEvent"("userId");
CREATE INDEX "LearningEvent_courseId_idx" ON "LearningEvent"("courseId");
CREATE INDEX "LearningEvent_eventType_idx" ON "LearningEvent"("eventType");

-- Notification (queried by org+user+read status)
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- AuditLog (queried by org+user+action)
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- DiscussionThread (queried by org+course+lesson+activity)
CREATE INDEX "DiscussionThread_courseId_idx" ON "DiscussionThread"("courseId");
CREATE INDEX "DiscussionThread_authorId_idx" ON "DiscussionThread"("authorId");

-- DiscussionReply (queried by thread+author)
CREATE INDEX "DiscussionReply_threadId_idx" ON "DiscussionReply"("threadId");
CREATE INDEX "DiscussionReply_authorId_idx" ON "DiscussionReply"("authorId");

-- Enrollment (queried by org+course+user+status)
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- ActivityContent (queried by activityId)
CREATE INDEX "ActivityContent_activityId_idx" ON "ActivityContent"("activityId");

-- File (queried by org+owner+folder)
CREATE INDEX "File_ownerId_idx" ON "File"("ownerId");
CREATE INDEX "File_folderId_idx" ON "File"("folderId");

-- Order (queried by org+user+status+coupon)
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- Payment (queried by org+order+status)
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_confirmedById_idx" ON "Payment"("confirmedById");

-- AssignmentSubmission (queried by org+assignment+user)
CREATE INDEX "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");
CREATE INDEX "AssignmentSubmission_userId_idx" ON "AssignmentSubmission"("userId");
CREATE INDEX "AssignmentSubmission_gradedById_idx" ON "AssignmentSubmission"("gradedById");

-- QuizAttempt (queried by org+quiz+user)
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- Certificate (queried by org+course+user+verification)
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX "Certificate_templateId_idx" ON "Certificate"("templateId");
CREATE INDEX "Certificate_revokedById_idx" ON "Certificate"("revokedById");

-- DiscussionReport (queried by org+reporter)
CREATE INDEX "DiscussionReport_threadId_idx" ON "DiscussionReport"("threadId");
CREATE INDEX "DiscussionReport_replyId_idx" ON "DiscussionReport"("replyId");
CREATE INDEX "DiscussionReport_reporterId_idx" ON "DiscussionReport"("reporterId");

-- QuestionBank (queried by org+course+owner)
CREATE INDEX "QuestionBank_ownerId_idx" ON "QuestionBank"("ownerId");

-- Question (queried by org+bank)
CREATE INDEX "Question_bankId_idx" ON "Question"("bankId");
CREATE INDEX "Question_createdById_idx" ON "Question"("createdById");

-- Quiz (queried by org+course+activity+creator)
CREATE INDEX "Quiz_activityId_idx" ON "Quiz"("activityId");
CREATE INDEX "Quiz_createdById_idx" ON "Quiz"("createdById");

-- QuizAnswer (queried by attempt+question)
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- Assignment (queried by org+course+activity)
CREATE INDEX "Assignment_activityId_idx" ON "Assignment"("activityId");
CREATE INDEX "Assignment_createdById_idx" ON "Assignment"("createdById");
CREATE INDEX "Assignment_rubricId_idx" ON "Assignment"("rubricId");

-- LiveClass (queried by org+course)
CREATE INDEX "LiveClass_courseId_idx" ON "LiveClass"("courseId");
CREATE INDEX "LiveClass_createdById_idx" ON "LiveClass"("createdById");

-- CalendarEvent (queried by org+course+lesson+creator)
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- MemberRole (queried by member+role)
CREATE INDEX "MemberRole_memberId_idx" ON "MemberRole"("memberId");
CREATE INDEX "MemberRole_roleId_idx" ON "MemberRole"("roleId");

-- OrganizationMember (queried by org+user)
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_status_idx" ON "OrganizationMember"("status");

-- CertificateTemplate (queried by org+creator)
CREATE INDEX "CertificateTemplate_createdById_idx" ON "CertificateTemplate"("createdById");

-- DiscussionThread status & pinned (queried for moderation)
CREATE INDEX "DiscussionThread_status_idx" ON "DiscussionThread"("status");

-- SubscriptionPlan (queried by org+active status)
CREATE INDEX "SubscriptionPlan_organizationId_idx" ON "SubscriptionPlan"("organizationId");

-- Achievement (queried by org)
CREATE INDEX "Achievement_organizationId_idx" ON "Achievement"("organizationId");

-- Coupon (queried by org+code)
CREATE INDEX "Coupon_organizationId_idx" ON "Coupon"("organizationId");
CREATE INDEX "Coupon_createdById_idx" ON "Coupon"("createdById");
CREATE INDEX "Coupon_courseId_idx" ON "Coupon"("courseId");

-- WebhookEndpoint (queried by org+status)
CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");
CREATE INDEX "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");

-- WebhookDelivery (queried by endpoint)
CREATE INDEX "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- ApiKey (queried by org+status)
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");
CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- Lesson (queried by course+module)
CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

-- Module (queried by course)
CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

-- Skill (queried by org)
CREATE INDEX "Skill_organizationId_idx" ON "Skill"("organizationId");

-- CourseSkill (queried by course+skill)
CREATE INDEX "CourseSkill_courseId_idx" ON "CourseSkill"("courseId");
CREATE INDEX "CourseSkill_skillId_idx" ON "CourseSkill"("skillId");

-- UserSkill (queried by user+skill)
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- LearnerNote (queried by org+user+course+lesson+activity)
CREATE INDEX "LearnerNote_userId_idx" ON "LearnerNote"("userId");
CREATE INDEX "LearnerNote_lessonId_idx" ON "LearnerNote"("lessonId");
CREATE INDEX "LearnerNote_activityId_idx" ON "LearnerNote"("activityId");

-- LearnerBookmark (queried by org+user+course+lesson+activity)
CREATE INDEX "LearnerBookmark_userId_idx" ON "LearnerBookmark"("userId");
CREATE INDEX "LearnerBookmark_lessonId_idx" ON "LearnerBookmark"("lessonId");
CREATE INDEX "LearnerBookmark_activityId_idx" ON "LearnerBookmark"("activityId");

-- UserIdentity (queried by user+ssoProvider)
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE INDEX "UserIdentity_ssoProviderId_idx" ON "UserIdentity"("ssoProviderId");

-- UserSession (queried by user)
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- PluginExecutionLog (queried by org+plugin)
CREATE INDEX "PluginExecutionLog_pluginId_idx" ON "PluginExecutionLog"("pluginId");
CREATE INDEX "PluginExecutionLog_userId_idx" ON "PluginExecutionLog"("userId");

-- OrganizationPlugin (queried by org+plugin)
CREATE INDEX "OrganizationPlugin_pluginId_idx" ON "OrganizationPlugin"("pluginId");
CREATE INDEX "OrganizationPlugin_installedById_idx" ON "OrganizationPlugin"("installedById");

-- AiConversation (queried by org+user)
CREATE INDEX "AiConversation_userId_idx" ON "AiConversation"("userId");

-- AiUsageLog (queried by org+user)
CREATE INDEX "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");

-- Folder (queried by org+parent)
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX "Folder_createdById_idx" ON "Folder"("createdById");

-- LearningPathEnrollment (queried by org+path+user)
CREATE INDEX "LearningPathEnrollment_userId_idx" ON "LearningPathEnrollment"("userId");

-- LearningPathCourse (queried by path+course)
CREATE INDEX "LearningPathCourse_courseId_idx" ON "LearningPathCourse"("courseId");

-- DailyCourseAggregate (queried by org+course)
CREATE INDEX "DailyCourseAggregate_organizationId_idx" ON "DailyCourseAggregate"("organizationId");
CREATE INDEX "DailyCourseAggregate_courseId_idx" ON "DailyCourseAggregate"("courseId");

-- LearnerDailyActivity (queried by org+user)
CREATE INDEX "LearnerDailyActivity_organizationId_idx" ON "LearnerDailyActivity"("organizationId");
CREATE INDEX "LearnerDailyActivity_userId_idx" ON "LearnerDailyActivity"("userId");

-- LeaderboardSnapshot (queried by org+course)
CREATE INDEX "LeaderboardSnapshot_organizationId_idx" ON "LeaderboardSnapshot"("organizationId");
CREATE INDEX "LeaderboardSnapshot_courseId_idx" ON "LeaderboardSnapshot"("courseId");

-- ContentLibraryItem (queried by org+creator)
CREATE INDEX "ContentLibraryItem_fileId_idx" ON "ContentLibraryItem"("fileId");
CREATE INDEX "ContentLibraryItem_createdById_idx" ON "ContentLibraryItem"("createdById");

-- Rubric (queried by org+course+creator)
CREATE INDEX "Rubric_courseId_idx" ON "Rubric"("courseId");
CREATE INDEX "Rubric_createdById_idx" ON "Rubric"("createdById");

-- OrderItem (queried by order+course)
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_courseId_idx" ON "OrderItem"("courseId");
