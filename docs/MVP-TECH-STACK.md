# MVP Tech Stack

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

This document locks the technology decisions for the MVP phase. It is the canonical reference for all implementation work. Any deviation must be discussed and documented.

The guiding principle is:

> Strong foundation first. Scale later.

We choose tools that solve multiple problems at once and avoid premature complexity.

---

## Locked MVP Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | SSR/SSG, routing, API routes when needed |
| React 19 | UI library |
| TypeScript | Type safety |
| TailwindCSS | Styling |
| Shadcn/UI | UI primitives |
| React Hook Form | Form handling |
| TanStack Query | Server state management |
| Zod | Schema validation |
| Framer Motion | Animation when needed |

### Backend

| Technology | Purpose |
|------------|---------|
| NestJS | API framework, modular architecture |
| Prisma | Type-safe ORM and migrations |
| PostgreSQL | Primary database |
| pgvector | Vector storage for RAG |
| Redis | Cache, rate limit, session, lock, WebSocket adapter, temporary storage |
| BullMQ | Background job queue |
| Passport JWT | Authentication strategy |
| Pino | Structured JSON logging |

### Storage & Media

| Technology | Purpose |
|------------|---------|
| Cloudflare R2 | File storage via `StorageProvider` abstraction |
| Signed upload URL | Secure direct uploads |

### AI

| Technology | Purpose |
|------------|---------|
| AI Gateway | Centralized prompt builder, retriever, citation, provider routing |
| OpenAI Provider | First implementation of `AIProvider` interface |
| text-embedding-3-small | Document embeddings |
| GPT-4o-mini / GPT-4.1 | LLM for tutor, summary, quiz generator, essay review |

### Search

| Technology | Purpose |
|------------|---------|
| PostgreSQL Full Text Search | Course and lesson search |
| pg_trgm | Fuzzy text matching |

### Analytics & Monitoring

| Technology | Purpose |
|------------|---------|
| PostHog | Product analytics events |
| Sentry | Error tracking |
| Pino | Structured logs |

### Deployment

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Local development and single-node deployment |

---

## Architecture Decisions

### Authentication: JWT, not NextAuth

Because the backend is NestJS, we use:

- Access Token (short-lived JWT)
- Refresh Token (long-lived, rotatable, stored in Redis blacklist)
- Passport JWT strategy in NestJS
- Role Based Access Control

NextAuth is not used because it adds unnecessary abstraction when we already have a separate backend.

### Redis is Mandatory

Redis is not only a cache. It solves:

- Application cache
- Rate limiting
- Session / token blacklist
- Distributed locks
- WebSocket horizontal scaling (Redis adapter)
- AI response cache
- Temporary storage
- BullMQ queue backend

### BullMQ for Background Jobs

All heavy processing goes through BullMQ:

- PDF text extraction
- Chunking and embedding generation
- Certificate PDF generation
- Video transcoding (Phase 2)
- Email sending
- Thumbnail generation
- Analytics batching

### StorageProvider Abstraction

Do not call R2 SDK directly from business logic. Use:

```ts
interface StorageProvider {
  upload(file: Buffer, key: string): Promise<string>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Implementations:

- `R2StorageProvider` (MVP)
- `S3StorageProvider` (future)
- `MinioStorageProvider` (local dev)
- `LocalStorageProvider` (local dev)

### AIProvider Abstraction

Do not call OpenAI directly from services. Use:

```ts
interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<AIResponse>;
  embed(texts: string[]): Promise<number[][]>;
  moderate?(text: string): Promise<ModerationResult>;
}
```

Implementations:

- `OpenAIProvider` (MVP)
- `AnthropicProvider` (Phase 2)
- `GeminiProvider` (Phase 2)
- `AzureOpenAIProvider` (Phase 2)
- `OllamaProvider` (Phase 2)

### AI Gateway Pattern

All AI requests flow through AI Gateway:

```
User Question
     │
     ▼
AI Gateway
     │
     ├── Prompt Builder
     ├── Context Retriever (pgvector)
     ├── Citation Formatter
     ├── Provider Router
     └── Cost & Token Logger
     │
     ▼
  LLM Provider
     │
     ▼
Streaming Response + Sources
```

Responsibilities:

- Build prompts from templates
- Retrieve relevant context from vector store
- Rerank and filter context
- Route to selected provider
- Stream response
- Attach source citations
- Log token usage and latency
- Cache frequent questions

### PostgreSQL for Search and Vectors

For MVP scale, PostgreSQL handles both:

- Full Text Search for course/lesson search
- pgvector for semantic search in RAG

We move to dedicated tools only when metrics prove it necessary.

### Event-Driven Lite

Use NestJS EventEmitter for decoupled side effects in MVP:

- Quiz submitted → update XP, leaderboard, analytics, notification

Move to Redis pub/sub or message broker when distributed listeners are needed.

---

## Phased Roadmap

### Phase 1: MVP (2–3 months)

Goal: Core learning experience works end-to-end.

- Authentication & RBAC
- Course / module / lesson management
- Quiz and assignment
- Certificate generation
- AI tutor with RAG
- Leaderboard
- Basic analytics via PostHog
- Docker deployment

Stack:

```
Next.js 15
NestJS
PostgreSQL + pgvector
Prisma
Redis
BullMQ
Cloudflare R2
OpenAI
PostHog
Sentry
Pino
Docker
```

### Phase 2: Scale Preparation

Trigger: user growth, more concurrent users, more content.

- HLS video pipeline (FFmpeg + BullMQ)
- PgBouncer if self-hosting PostgreSQL
- Complete AI Provider abstraction (Anthropic, Gemini, Azure, Ollama)
- Advanced caching strategies
- Rate limiting refinement

### Phase 3: Large Scale

Trigger: hundreds of thousands of users, millions of vectors, complex analytics.

- Meilisearch or OpenSearch for search
- Qdrant, Pinecone, or Weaviate if pgvector bottlenecks
- ClickHouse or data warehouse for analytics
- Distributed message broker (Redis Streams, RabbitMQ, or Kafka)
- Multi-region CDN optimization

---

## What is Explicitly Out of MVP

These are intentionally deferred to avoid premature complexity:

- NextAuth (we use JWT directly)
- Dedicated vector database (pgvector is enough)
- Dedicated search engine (PostgreSQL FTS is enough)
- Dedicated data warehouse (PostHog is enough)
- Advanced message broker (NestJS EventEmitter is enough)
- HLS streaming (upload MP4 to CDN first, transcode later)
- Kubernetes (Docker Compose / simple container deployment first)

---

## Local Development Stack

```yaml
Services:
  - app (Next.js + NestJS or separate containers)
  - postgres (PostgreSQL 16+ with pgvector extension)
  - redis (Redis 7+)
  - minio (optional, alternative to R2 for local dev)
```

Use Docker Compose for one-command local setup.

---

## References

- PRD: `Kominfo AI Learning Management System PRD.md`
- System Design: `System Design Document.md`
- RAG Architecture: `RAG-ARCHITECTURE.md.md`
- Resource Model: `Resource Model.md`
- API Contract: `API Contract.md`
- UI Components: `UI Components Documentation.md`
- Definition of Done: `DEFINITION-OF-DONE.md.md`
- Agent Rules: `AGENTS.md.md`
