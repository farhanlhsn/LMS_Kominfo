# LMS Platform

AI-powered, multi-tenant, plugin-ready Learning Management System foundation.

## Phase 00

This repository is scaffolded as a pnpm + Turborepo monorepo with:

- `apps/api` - NestJS REST API under `/api/v1`
- `apps/web` - Next.js App Router web shell
- `packages/db` - Prisma schema, migrations, seed, and client export
- `packages/shared` - shared API and RBAC constants
- `packages/config` - shared runtime constants

## Local setup

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres redis minio
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
pnpm dev
```

API health endpoint:

```txt
GET http://localhost:4000/api/v1/health
```
