# AGENTS.md

This repository is an AI-powered, multi-tenant, plugin-ready Learning Management System.

## Product direction

Build a general LMS platform similar to Coursera + Moodle. Do not use any specific government, city, province, or organization branding.

The platform must support:

- multi-tenant organizations
- RBAC and permission-based access
- course catalog and course builder
- modern learning workspace
- quiz, assignment, goals, progress, certificates
- AI tutor with RAG
- plugin-ready activity architecture
- SSO-ready enterprise authentication
- marketplace/payment-ready architecture
- accessibility, security, audit, and compliance

## Required reading before implementation

Before coding any phase, read:

1. `docs/README.md`
2. The relevant phase file in `docs/phases/`
3. The relevant architecture document in `docs/`

Important architecture documents:

- `docs/01-architecture-decisions.md`
- `docs/03-database-model.md`
- `docs/04-api-standards.md`
- `docs/05-rbac-multitenant.md`
- `docs/06-sso-strategy.md`
- `docs/07-plugin-architecture.md`
- `docs/08-advanced-learning-workspace.md`
- `docs/09-ai-rag.md`
- `docs/10-security-compliance.md`

## Tech stack

- Monorepo: Turborepo + pnpm
- Frontend: Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Cache and queue: Redis + BullMQ
- Storage: S3-compatible storage, MinIO for local development
- AI: provider abstraction + RAG-ready architecture
- Vector search: pgvector first, Qdrant-ready abstraction
- Deployment: Docker Compose first, production-friendly structure

## Hard rules

- Use REST API under `/api/v1`.
- Do not implement GraphQL unless explicitly requested in a future task.
- Keep the app multi-tenant from the beginning.
- Do not bypass RBAC.
- Do not create cross-tenant data leaks.
- Every tenant-scoped query must filter by `organizationId` or explicit authorization.
- Do not hardcode activity types as rigid database enums where plugin extensibility is required.
- Prefer `activityTypeKey` such as `core.video`, `core.quiz`, `plugin.code_runner`.
- Keep storage, AI, payment, SSO, video, notification, proctoring, and plugin providers abstracted.
- User-generated code must never run in the main API process.
- All sensitive actions must create audit logs.
- All new modules must include service, controller, DTO, validation, permission checks, and tests where relevant.
- Keep the project buildable after every phase.

## UI rules

- Follow `docs/16-ui-design-system.md` for all frontend work.
- Follow `docs/17-theme-branding-customization.md` for colors and tenant branding.
- Use shadcn/ui and Tailwind CSS variables.
- Build reusable components before duplicating UI.
- Every major page must include loading, empty, and error states.
- UI must be responsive and accessible.
- Default/demo UI must stay generic.
- Tenant custom branding must be supported through tokens/config, not hardcoded colors.

## Definition of done

A phase is complete only if:

- the app builds
- TypeScript passes
- Prisma migration runs
- seed works if changed
- critical tests exist and pass
- API follows standard response/error/pagination format
- frontend is usable and responsive
- RBAC and tenant isolation are enforced
- docs are updated
