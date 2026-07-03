# Database Model Overview

This file lists core entities. Each phase may add more fields.

## Global and tenant model

- User
- Organization
- OrganizationMember
- Role
- Permission
- RolePermission
- MemberRole
- UserSession
- AuditLog

## SSO and identity

- SsoProvider
- UserIdentity
- OrganizationDomain
- OrganizationLoginPolicy
- EmailVerificationToken
- PasswordResetToken
- MfaFactor

## LMS core

- Course
- CourseCategory
- CourseInstructor
- CourseModule
- Lesson
- Activity
- ActivityContent
- Enrollment
- Progress
- LearningEvent
- Cohort
- CohortMember
- CohortCourse

## Content

- File
- Folder
- ContentLibraryItem
- TranscriptSegment
- LearnerNote
- Bookmark

## Plugin

- Plugin
- OrganizationPlugin
- PluginExecutionLog
- PluginEventSubscription

Activity must support:

- `activityTypeKey`
- `pluginKey` nullable
- `pluginVersion` nullable
- `config` JSON
- `content` JSON
- `completionRule` JSON
- `gradingRule` JSON nullable
- `metadata` JSON

## Quiz and assessment

- QuestionBank
- Question
- QuestionOption
- Quiz
- QuizQuestion
- QuizAttempt
- QuizAnswer
- Assignment
- Rubric
- RubricCriterion
- Submission
- PeerReview
- GroupSubmission
- ProctoringSession

## Certificate and goals

- CertificateTemplate
- Certificate
- Goal
- Badge
- UserBadge
- XpTransaction
- LeaderboardSnapshot

## AI

- AiDocument
- AiChunk
- AiConversation
- AiMessage
- AiGeneratedItem
- FlashcardDeck
- Flashcard
- AiUsageLog

## Communication

- DiscussionThread
- DiscussionComment
- DiscussionVote
- DirectMessageThread
- DirectMessage
- Notification
- NotificationPreference
- CalendarEvent
- LiveSession
- Attendance

## Marketplace

- Product
- Order
- OrderItem
- Payment
- Refund
- Coupon
- SubscriptionPlan
- UserSubscription
- InstructorRevenueShare
- InstructorPayoutAccount
- InstructorPayout
- PayoutTransaction

## Governance

- ConsentRecord
- LegalDocument
- SupportTicket
- ModerationReport
- ModerationQueueItem
- DataExportRequest
- ReportExport

## Index strategy

Use composite indexes for:

- `organizationId + createdAt`
- `organizationId + status`
- `courseId + orderIndex`
- `userId + courseId`
- `userId + courseId + lessonId + activityId`
- `verificationCode` for certificates
- `userId + readAt` for notifications
- `organizationId + eventType + createdAt` for learning events
- `ssoProviderId + providerSubject` for UserIdentity
- `organizationId + domain` for OrganizationDomain
