# Tech Stack

## Monorepo

- Turborepo
- pnpm
- shared packages for database, UI, config, and shared types

## Frontend

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- React Hook Form + Zod
- TanStack Query
- Zustand if client state is needed
- TipTap for rich text
- Monaco Editor for code runner
- react-resizable-panels for learning workspace
- Three.js / React Three Fiber / Babylon.js for 3D plugin

## Backend

- NestJS
- REST API under `/api/v1`
- DTO validation
- Guards and decorators for auth, organization, permission
- Global exception filter
- Global response format
- Request logging

## Database

- PostgreSQL
- Prisma ORM
- pgvector for local vector search first
- Qdrant-ready abstraction

## Cache and queue

- Redis
- BullMQ

## Storage

- S3-compatible storage
- MinIO for local development
- Cloudflare R2 / AWS S3 / DigitalOcean Spaces ready

## Video

- Provider adapter
- Mux or Cloudflare Stream preferred for production
- Self-hosted FFmpeg/HLS pipeline optional later

## AI

- LLM provider abstraction
- Embedding provider abstraction
- RAG retrieval service
- AI indexing queue

## Observability

- Structured logs
- Request ID
- Sentry-ready integration
- Health checks for DB, Redis, storage, queue

## Deployment

- Docker Compose for local
- production-friendly Dockerfiles
- GitHub Actions CI/CD
