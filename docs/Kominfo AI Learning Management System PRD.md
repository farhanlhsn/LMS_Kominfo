

## PRODUCT REQUIREMENT DOCUMENT (PRD)
## Project
Kominfo AI Learning Management System (AI-LMS)
## Version: 1.0
## Objective
Build a modern AI-powered Learning Management System (LMS) that is lightweight, scalable, mobile-first,
and suitable for government digital learning programs.
This project will compete across four regional implementations:
## Aceh
## Medan
## Lampung
## Bengkulu
The platform should support:
## Course Management
## Learning Materials
## Video Learning
## Quiz & Assessment
## Assignment Submission
## Certificate Generation
AI Learning Assistant
## Regional Leaderboard
## Analytics Dashboard
The system must be production-ready and designed with modular architecture.
## Product Goals
## Primary Goals
Modern UI
## Responsive
## Mobile-first
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
## •
## •
## •
## •
## •
## 1

Easy to use
Fast loading
AI Integrated
## Secondary Goals
## Gamification
## Regional Competition
## Analytics
## Scalable Architecture
## Tech Stack
## MVP Stack (Locked)
Stack ini adalah fondasi production-ready untuk fase pertama. Semua komponen di bawah ini wajib ada sejak hari pertama.
## Frontend
Next.js 15 (App Router)
## React 19
TypeScript
TailwindCSS
Shadcn/UI
React Hook Form
TanStack Query
Zod
Framer Motion
## Backend
NestJS
## Database
PostgreSQL
## Vector
pgvector (inside PostgreSQL)
## ORM
Prisma
## Cache / Queue / Session / Lock / WebSocket
Redis
## Background Jobs
BullMQ (powered by Redis)
## Authentication
JWT Access Token + Refresh Token
Passport JWT (NestJS)
Role Based Access Control
## Storage
Cloudflare R2 via StorageProvider abstraction
## AI
AI Gateway
OpenAI Provider (text-embedding-3-small, GPT-4o-mini / GPT-4.1)
## Realtime
WebSocket with Redis adapter
## Search
PostgreSQL Full Text Search + pg_trgm
## Monitoring & Logging
Sentry
Pino (structured JSON logs)
## Product Analytics
PostHog
## Deployment
Docker
## What's NOT in MVP (Future Phases)
## Phase 2
HLS video pipeline (FFmpeg + BullMQ)
PgBouncer (jika self-host PostgreSQL)
AI Provider abstraction lengkap (Anthropic, Gemini, Azure, Ollama)
## Phase 3
Meilisearch / OpenSearch untuk pencarian skala besar
Qdrant / Pinecone jika pgvector menjadi bottleneck
ClickHouse atau data warehouse untuk analytics
Message broker distributed untuk event-driven penuh
## Deployment
## Docker
## AI
OpenAI API
## Embedding
text-embedding-3-small
## LLM
GPT-4.1 GPT-4o-mini
## Vector Database
pgvector (inside PostgreSQL)
## Realtime
WebSocket
## Search
PostgreSQL Full Text Search
## Architecture
## Frontend
## ↓
API Gateway
## ↓
NestJS Backend
## ↓
## Service Layer
## 3

## ├── User Service
## ├── Course Service
## ├── Quiz Service
## ├── Assignment Service
├── AI Service
## ├── Analytics Service
## ├── Certificate Service
## ↓
PostgreSQL
## ↓
## Cloudflare R2
## ↓
OpenAI API
## User Roles
## Super Admin
## Can:
Manage all regions
Manage users
Manage instructors
Manage courses
## Analytics
Configure AI
Manage leaderboard
## •
## •
## •
## •
## •
## •
## •
## 4

## Regional Admin
## Can:
Manage participants
Create courses
Upload materials
Review assignments
Publish certificates
## Cannot:
Access other regions
## Instructor
## Can:
Create modules
Upload videos
Upload PDF
Create quizzes
Grade assignments
## Student
## Can:
## Learn
Watch videos
Take quizzes
Upload assignments
Ask AI
Download certificate
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
## •
## •
## •
## •
## •
## •
## 5

## Functional Modules
## Authentication
## Features
## Login
## Register
## Forgot Password
## Email Verification
## Google Login
## Role Permission
## Dashboard
## Widgets
## Continue Learning
## Upcoming Assignment
## Course Progress
AI Recommendation
## Leaderboard
## Learning Hours
## Course Module
## Entities
## Course
## Module
## Lesson
## Material
## Category
## Tag
## Relationships
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
## •
## 6

## Course
## ├── Modules
## │ ├── Lessons
## │ │ ├── Video
## │ │ ├── PDF
## │ │ ├── Markdown
## │ │ ├── Link
## │ │ └── Quiz
## Lesson Types
## TEXT
## PDF
## VIDEO
## YOUTUBE
## FILE
## QUIZ
## ASSIGNMENT
## Quiz System
## Question Types
## Multiple Choice
## Multiple Select
## True False
## Essay
## Matching
## •
## •
## •
## •
## •
## 7

## Quiz Features
## Random Question
## Random Answer
## Timer
## Passing Grade
## Multiple Attempt
## Auto Scoring
## Assignment
## Student
## Upload
## PDF
## DOCX
## ZIP
## IMAGE
## Instructor
## Review
## Comment
## Grade
## Request Revision
## Certificate
Generate automatically.
## Fields
## Student Name
## Course
## Completion Date
QR Code
## Certificate Number
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
## •
## •
## •
## •
## •
## •
## •
## •
## 8

## Gamification
## XP
## Badge
## Achievement
## Leaderboard
## Daily Streak
## Weekly Challenge
## Notification
## Email
## In App
Push Notification (Future)
## AI MODULE
The AI is NOT a general chatbot.
It is a learning assistant.
AI Features
AI Tutor
Students can ask:
Explain this lesson.
## Summarize.
Give examples.
## 9

Explain easier.
Generate practice questions.
Answer ONLY based on LMS knowledge.
AI Summary
## Summarize
## Lesson
## PDF
## Video Transcript
AI Quiz Generator
## Input
## Course Material
## Output
## Question
## Choices
## Correct Answer
## Explanation
## Difficulty
AI Essay Review
## Input
## Student Answer
## Rubric
## Output
## •
## •
## •
## 10

## Score Suggestion
## Feedback
## Strength
## Weakness
AI Recommendation
Based on
## Completed Lessons
## Quiz Score
## Learning Time
## Weak Topics
## Recommend
## Next Lesson
## Review Material
## Practice Quiz
RAG Architecture
## Pipeline
Upload PDF
## ↓
## Extract Text
## ↓
## Chunking
## 11

## ↓
## Embedding
## ↓
Store pgvector
## ↓
## Semantic Search
## ↓
## Prompt Assembly
## ↓
OpenAI
## ↓
## Answer
AI should NEVER answer outside retrieved context.
Always cite source lesson.
Database (High Level)
## Users
## Courses
## Modules
## Lessons
## Enrollments
## Progress
## Videos
## 12

## Materials
## Quiz
## Questions
## Answers
## Attempts
## Assignments
## Submission
## Certificates
## Embeddings
## Chat History
## Badges
## Leaderboard
## Analytics
## Notifications
## Admin Dashboard
## Charts
## Daily Active Users
## Completion Rate
## Quiz Accuracy
## Learning Hours
## Regional Ranking
## Popular Courses
## 13

## Drop Rate
## Top Students
## Regional Features
Each region has
## Theme
## Logo
## Leaderboard
## Analytics
## Certificate Template
## Courses
## Participants
## Regions
## Aceh
## Medan
## Lampung
## Bengkulu
## Non Functional Requirements
## Lighthouse >95
## Responsive
## Dark Mode
## PWA
## 14

## Offline Cache
SEO Friendly
Accessibility WCAG AA
## Image Optimization
Streaming AI Response
## Server Side Rendering
## Lazy Loading
## Code Splitting
## Security
## RBAC
## JWT
CSRF Protection
## Rate Limiter
## Input Validation
## Audit Log
Signed Upload URL
## Encrypted Secrets
API Style
## REST API
OpenAPI Documentation
## Swagger
## 15

## Versioning
## /api/v1
## Folder Structure
apps/
web/
api/
packages/
ui/
types/
utils/
config/
database/
docs/
## Coding Standards
TypeScript Strict
ESLint
## Prettier
## Conventional Commit
## Feature Based Architecture
## Repository Pattern
## Dependency Injection
## 16

No Business Logic inside Controllers
## Service Layer Only
## Future Roadmap
## Voice Learning
Speech to Text
AI Avatar
## Adaptive Learning
## Live Classroom
## Discussion Forum
## Mobile App
## Offline Sync
SCORM Import
LTI Integration
Government SSO
## 17