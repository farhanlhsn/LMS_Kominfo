

## RESOURCE MODEL
Kominfo AI Learning Management System
## Version 1.0
## User
Represents every authenticated user.
## User:
id:uuid
name:string
email:string
passwordHash:string
avatarUrl:string?
phoneNumber:string?
role:
## -STUDENT
## -INSTRUCTOR
## -REGIONAL_ADMIN
## -SUPER_ADMIN
regionId:uuid
organization:string?
bio:string?
isActive:boolean
lastLoginAt:datetime?
createdAt:datetime
updatedAt:datetime
## Relationships
## User
## 1

## ├── Region
## ├── Enrollments
├── AssignmentSubmission
## ├── Certificates
├── ChatSessions
## ├── Notifications
## └── Activities
## Region
## Region:
id:uuid
name:string
slug:string
themeColor:string
logoUrl:string
bannerUrl:string
description:string?
isActive:boolean
createdAt:datetime
updatedAt:datetime
## Course
## Course:
id:uuid
## 2

title:string
slug:string
shortDescription:string
description:markdown
thumbnailUrl:string
bannerUrl:string?
instructorId:uuid
regionId:uuid
difficulty:
beginner
intermediate
advanced
estimatedDuration:integer
language:string
category:string
tags:string[]
totalModules:integer
totalLessons:integer
totalStudents:integer
totalViews:integer
rating:decimal
status:
draft
published
archived
publishedAt:datetime?
createdAt:datetime
## 3

updatedAt:datetime
## Relationships
## Course
## ├── Modules
## ├── Enrollment
## ├── Certificate
## ├── Progress
## └── Analytics
## Module
## Module:
id:uuid
courseId:uuid
title:string
description:markdown
order:integer
estimatedDuration:integer
isPublished:boolean
## Lesson
## Lesson:
id:uuid
## 4

moduleId:uuid
title:string
order:integer
type:
## TEXT
## VIDEO
## PDF
## LINK
## QUIZ
## ASSIGNMENT
duration:integer
isPreview:boolean
isPublished:boolean
createdAt:datetime
## Lesson Content
LessonContent:
id:uuid
lessonId:uuid
markdown:text?
html:text?
videoUrl:string?
youtubeUrl:string?
pdfUrl:string?
externalUrl:string?
transcript:text?
## 5

attachmentId:uuid?
## Material
## Material:
id:uuid
filename:string
originalFilename:string
mimeType:string
extension:string
fileSize:integer
storageProvider:
## R2
## S3
storageKey:string
publicUrl:string
uploadedBy:uuid
uploadedAt:datetime
## Enrollment
## Enrollment:
id:uuid
userId:uuid
courseId:uuid
enrolledAt:datetime
## 6

completedAt:datetime?
progressPercent:integer
status:
## ACTIVE
## COMPLETED
## DROPPED
## Learning Progress
## Progress:
id:uuid
enrollmentId:uuid
lessonId:uuid
completed:boolean
videoPosition:integer
completedAt:datetime?
## Quiz
## Quiz:
id:uuid
lessonId:uuid
title:string
description:string
passingScore:integer
durationMinutes:integer
## 7

maxAttempt:integer
shuffleQuestion:boolean
shuffleChoice:boolean
## Question
## Question:
id:uuid
quizId:uuid
type:
## MULTIPLE_CHOICE
## MULTIPLE_SELECT
## TRUE_FALSE
## ESSAY
## MATCHING
question:markdown
explanation:markdown?
score:integer
order:integer
## Choice
## Choice:
id:uuid
questionId:uuid
label:string
value:string
## 8

isCorrect:boolean
## Quiz Attempt
QuizAttempt:
id:uuid
quizId:uuid
userId:uuid
startedAt:datetime
submittedAt:datetime?
score:integer
passed:boolean
## Quiz Answer
QuizAnswer:
id:uuid
attemptId:uuid
questionId:uuid
answer:json
score:integer
## Assignment
## Assignment:
id:uuid
## 9

lessonId:uuid
title:string
instruction:markdown
dueDate:datetime?
maxScore:integer
allowedExtensions:
pdf
docx
zip
## Assignment Submission
## Submission:
id:uuid
assignmentId:uuid
studentId:uuid
materialId:uuid
score:integer?
feedback:markdown?
submittedAt:datetime
gradedAt:datetime?
## Certificate
## Certificate:
id:uuid
## 10

certificateNumber:string
userId:uuid
courseId:uuid
qrCodeUrl:string
pdfUrl:string
issuedAt:datetime
## Badge
## Badge:
id:uuid
title:string
description:string
iconUrl:string
xpReward:integer
## User Badge
UserBadge:
id:uuid
badgeId:uuid
userId:uuid
earnedAt:datetime
## 11

## Leaderboard
## Leaderboard:
id:uuid
regionId:uuid?
courseId:uuid?
userId:uuid
totalXP:integer
totalScore:integer
rank:integer
updatedAt:datetime
## Chat Session
ChatSession:
id:uuid
userId:uuid
lessonId:uuid?
courseId:uuid?
title:string
createdAt:datetime
## Chat Message
ChatMessage:
id:uuid
## 12

sessionId:uuid
role:
## USER
## ASSISTANT
## SYSTEM
content:text
sources:json?
tokenUsage:integer
createdAt:datetime
AI Embedding
## Embedding:
id:uuid
lessonId:uuid
chunkIndex:integer
content:text
embedding:vector
tokenCount:integer
## Activity Log
## Activity:
id:uuid
userId:uuid
action:string
resourceType:string
## 13

resourceId:uuid
metadata:json
createdAt:datetime
## Notification
## Notification:
id:uuid
userId:uuid
title:string
body:string
type:
## INFO
## SUCCESS
## WARNING
## ERROR
isRead:boolean
createdAt:datetime
## Analytics Event
AnalyticsEvent:
id:uuid
userId:uuid
eventName:string
properties:json
## 14

occurredAt:datetime
## System Setting
SystemSetting:
id:uuid
key:string
value:json
updatedAt:datetime
## Future Resource
## Discussion
## Comment
## Webinar
LiveClass
## Survey
SurveyResponse
AI Prompt Template
AI Usage
Payment (Optional)
## Organization
Government SSO
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 15