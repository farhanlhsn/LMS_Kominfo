

## SYSTEM DESIGN DOCUMENT
Kominfo AI Learning Management System
## Version 1.0
## 1. System Overview
AI-LMS adalah platform pembelajaran digital berbasis web yang terdiri dari beberapa subsystem yang
saling terhubung.
## Internet
## │
Cloudflare CDN
## │
## Next.js Frontend
## │
REST API Gateway
## │
## ┌──────────┴──────────┐
## │                     │
Authentication         AI Service
## │                     │
## ├──────────────┐      │
## │              │      │
## Course Service     Quiz Service
## │              │
## Assignment Service Analytics
## │
PostgreSQL
## │
pgvector + Prisma ORM
## │
## Cloudflare R2 Storage
## │
OpenAI API
## 1

## 1.1 MVP Components
The MVP architecture relies on the following core infrastructure:
## Redis
Cache, rate limit, session store, distributed lock, WebSocket adapter, and BullMQ backend.
## BullMQ
Background job processing for PDF extraction, embedding generation, certificate generation, email, and future video transcoding.
## AI Gateway
Single entry point for all AI requests. Handles prompt building, context retrieval, citation, provider routing, cost logging, and response streaming.
## StorageProvider Abstraction
R2 is the first implementation. Local/Minio/S3 can be added later without changing business logic.
## PostHog
Product analytics events only. Business analytics remain in PostgreSQL until volume justifies a data warehouse.
## 2. Design Principles
## Modular Architecture
## Feature Based
API First
AI Native
## Mobile First
## Scalable
## Clean Architecture
## Government Ready
## 3. System Modules
## Authentication
## Responsibilities
## Login
## Register
## Permission
## Session
## Audit
## Dependencies
## User
## Role
## Region
## User Module
## Stores
profile
avatar
role
organization
learning statistics
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
## •
## •
## 2

## Region Module
Each region has
own courses
own users
own leaderboard
own analytics
own branding
## Supported Regions
## Aceh
## Medan
## Lampung
## Bengkulu
## Future
## Unlimited Region
## Course Module
## Course
## ↓
## Module
## ↓
## Lesson
## ↓
## Content
## ↓
## Quiz
## ↓
## Assignment
## •
## •
## •
## •
## •
## •
## •
## •
## •
## 3

Progress tracked on every level.
## Material Module
## Supported Content
## Markdown
## PDF
PowerPoint
## Video
External URL
Embedded YouTube
## Image
## Future
## SCORM
Interactive HTML
AI Module
## Contains
## Chat
## Summary
## Recommendation
## Quiz Generator
## Essay Review
## Transcript
## 4

## Search
Everything uses one unified AI Gateway.
- AI Gateway
Instead of calling OpenAI directly everywhere.
All AI request goes through
AI Gateway
## Responsibilities
## Prompt Builder
## Context Retrieval
## Citation
## Cost Logging
## Rate Limiter
## Safety Filter
## Conversation History
## Advantages
One place to maintain prompts.
Easy to change LLM provider.
Can migrate to Azure OpenAI later.
## 5. Content Pipeline
Instructor Upload PDF
## ↓
## Extract Text
## ↓
## Clean Text
## •
## •
## •
## •
## •
## •
## •
## 5

## ↓
## Chunk
## ↓
## Embedding
## ↓
## Store Vector
## ↓
Ready for AI Search
## 6. Learning Flow
## Student Login
## ↓
## Dashboard
## ↓
## Enroll Course
## ↓
## Study Lesson
## ↓
Ask AI
## ↓
## Take Quiz
## ↓
## Upload Assignment
## 6

## ↓
## Certificate
## ↓
## Leaderboard Updated
- AI Flow
## Student Question
## ↓
## Vector Search
## ↓
## Retrieve Context
## ↓
## Prompt Builder
## ↓
## GPT
## ↓
## Validate Response
## ↓
Return with Citation
## 8. Analytics Flow
Every user activity creates event.
## Example
## 7

## Login
## Lesson Viewed
## Quiz Started
## Quiz Finished
## Assignment Uploaded
## Certificate Generated
Chat AI
Events stored separately for analytics.
Never calculate analytics directly from business tables.
## 9. Storage Strategy
## Database
Small structured data
## Storage
Large files via StorageProvider abstraction (R2 in MVP)
## Vector
Embedding only in PostgreSQL with pgvector
## Cache
Frequently requested data in Redis
## Queue
Background jobs in BullMQ backed by Redis
## 10. Security Layers
## Layer 1
## Authentication
## 8

## Layer 2
## Authorization
## Layer 3
## Validation
## Layer 4
## Rate Limit
## Layer 5
## Audit Log
## Layer 6
## Encrypted Secrets
## 11. Scalability
## Frontend
## Stateless
## Backend
## Stateless
## Database
## Read Replica Ready
## Storage
## CDN
## AI
## Provider Agnostic
## Vector
## 9

Can migrate to Pinecone
## 12. Monitoring
## Application Errors
Sentry
## Performance Tracing
OpenTelemetry (future)
## Product Analytics
PostHog
## Logs
Structured JSON via Pino
## Health Check
## /api/health
## Background Jobs
BullMQ dashboard
## 13. Deployment
## Production
## Docker
Docker Compose for local and single-node production
## CI/CD
GitHub Actions
## Infrastructure
Vercel for frontend (optional)
Railway / Fly.io / AWS for backend
## Storage
## 10

Cloudflare R2
## Database
PostgreSQL with pgvector extension
## Cache & Queue
Redis
## Container Services
app, postgres, redis
## 14. Future Extensions & Phased Roadmap
## Phase 1 (MVP)
Core LMS + AI tutor + RAG + leaderboard + basic analytics
Stack locked in MVP-TECH-STACK.md
## Phase 2
HLS video pipeline
PgBouncer (if self-host)
Full AI Provider abstraction (Anthropic, Gemini, Azure, Ollama)
## Phase 3
Meilisearch / OpenSearch
Qdrant / Pinecone (if pgvector bottlenecks)
ClickHouse or data warehouse
Distributed message broker
## Product Extensions
## Discussion Forum
## Community Learning
## Live Webinar
## Video Conference
## Peer Review
## Marketplace Course
Certification Verification API
Government SSO
AI Avatar
## Speech Learning
## Adaptive Learning
## 11