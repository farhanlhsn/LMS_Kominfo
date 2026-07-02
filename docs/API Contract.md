

## API CONTRACT
Kominfo AI Learning Management System
## Version 1.0
Base URL
## /api/v1
## Authentication
Authorization: Bearer <JWT>
## Response Format
## {
## "success":true,
"message":"Success",
## "data":{},
## "meta":{}
## }
## Error Format
## {
## "success":false,
"message":"Validation Error",
## "errors":[
## {
## "field":"email",
"message":"Email is required"
## }
## ]
## }
## 1

## AUTH
POST /auth/register
Create account.
## Body
## {
## "name":"",
## "email":"",
## "password":""
## }
## Response
## {
## "user":{},
## "token":""
## }
POST /auth/login
## {
## "email":"",
## "password":""
## }
POST /auth/logout
GET /auth/me
Return logged user.
## 2

POST /auth/refresh
Refresh JWT.
## USERS
GET /users
## Pagination
## Search
## Role Filter
## Region Filter
GET /users/{id}
PATCH /users/{id}
DELETE /users/{id}
GET /users/{id}/progress
Return learning progress.
GET /users/{id}/certificate
Return certificates.
## 3

## REGIONS
GET /regions
## Return
## Aceh
## Medan
## Lampung
## Bengkulu
GET /regions/{id}
PATCH /regions/{id}
Update branding.
## COURSE
GET /courses
## Query
page
limit
search
category
region
status
POST /courses
## Create Course
## 4

GET /courses/{id}
## Return
## Course
## Modules
## Instructor
## Progress
PATCH /courses/{id}
DELETE /courses/{id}
POST /courses/{id}/publish
POST /courses/{id}/archive
## MODULE
GET /courses/{id}/modules
POST /courses/{id}/modules
PATCH /modules/{id}
DELETE /modules/{id}
## 5

## LESSON
GET /modules/{id}/lessons
POST /modules/{id}/lessons
## Lesson Types
## TEXT
## VIDEO
## PDF
## QUIZ
## ASSIGNMENT
## LINK
GET /lessons/{id}
PATCH /lessons/{id}
DELETE /lessons/{id}
## MATERIAL
POST /materials/upload
multipart/form-data
## Supported
pdf
## 6

pptx
docx
jpg
png
zip
mp4
GET /materials/{id}
DELETE /materials/{id}
## ENROLLMENT
POST /courses/{id}/enroll
DELETE /courses/{id}/unenroll
GET /my/courses
Current courses.
## PROGRESS
PATCH /lessons/{id}/complete
PATCH /lessons/{id}/resume
Save video position.
## 7

## Body
## {
## "seconds":530
## }
GET /courses/{id}/progress
## QUIZ
GET /quizzes/{id}
POST /quizzes/{id}/start
POST /quizzes/{id}/submit
## {
## "answers":[]
## }
GET /quizzes/{id}/result
GET /quizzes/{id}/leaderboard
## QUESTION
POST /questions
## 8

PATCH /questions/{id}
DELETE /questions/{id}
## ASSIGNMENT
GET /assignments/{id}
POST /assignments/{id}/submit
multipart/form-data
GET /assignments/{id}/submission
PATCH /submissions/{id}/grade
## {
## "score":90,
## "feedback":""
## }
## CERTIFICATE
GET /certificates
GET /certificates/{id}
GET /certificates/{id}/download
## PDF
## 9

## AI
All AI endpoints are grouped under
## /ai/*
POST /ai/chat
## {
"courseId":"",
"lessonId":"",
## "message":""
## }
## Response
## {
## "answer":"",
## "sources":[],
## "usage":{}
## }
POST /ai/summary
## Input
## Lesson
## PDF
## Video
## Output
## Summary
## 10

POST /ai/quiz-generator
Instructor only.
## Input
## Material
## Output
## Questions
## Choices
## Answer
## Explanation
POST /ai/essay-review
## {
"submissionId":""
## }
POST /ai/recommendation
## Return
## Next Lesson
## Review Material
## Practice Quiz
## CHAT HISTORY
GET /chat
## 11

GET /chat/{sessionId}
DELETE /chat/{sessionId}
## LEADERBOARD
GET /leaderboard
## Overall
GET /leaderboard/region
GET /leaderboard/course/{id}
## BADGE
GET /badges
POST /badges
## ANALYTICS
## Admin Only
GET /analytics/dashboard
GET /analytics/users
## 12

GET /analytics/course
GET /analytics/region
GET /analytics/quiz
GET /analytics/engagement
## NOTIFICATION
GET /notifications
PATCH /notifications/{id}/read
DELETE /notifications/{id}
## SEARCH
GET /search
## Query
keyword
type
region
category
## Return
## Courses
## 13

## Lessons
## Documents
## Videos
## SETTINGS
GET /settings
PATCH /settings
## FILE STORAGE
POST /upload/presign
## Return
Signed URL
POST /upload/complete
Finalize upload.
## HEALTH
GET /health
## Return
## {
## "status":"ok"
## }
## 14

## WEBHOOKS
POST /webhooks/openai
## Future
POST /webhooks/storage
## Future
## API VERSIONING
## /api/v1
## /api/v2
Breaking changes must create a new version.
## Rate Limit
## Anonymous
60 requests/minute
## Authenticated
300 requests/minute
AI Endpoint
30 requests/minute
## Admin
600 requests/minute
## 15

## Permissions
ModuleStudentInstructorRegional AdminSuper Admin
## Course View
## ✅✅✅✅
## Course Create
## ❌✅✅✅
## Course Publish
## ❌❌✅✅
AI Chat
## ✅✅✅✅
AI Quiz Generator
## ❌✅✅✅
## Analytics
## ❌
LimitedRegionalGlobal
## Certificate
## ✅✅✅✅
## 16