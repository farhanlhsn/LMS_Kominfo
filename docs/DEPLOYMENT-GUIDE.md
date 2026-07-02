# Deployment Guide

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Panduan untuk deploy AI-LMS ke staging dan production. Mencakup: container build, environment setup, migration, health verification, dan rollback.

> **Aturan wajib:** Tidak ada deploy ke production tanpa backup database, health check lulus, dan rollback plan siap.

---

## Environments

| Environment | Tujuan | Database | Storage | AI |
|-------------|--------|----------|--------|-----|
| `local` | Development | Docker PostgreSQL | MinIO | OpenAI dev key |
| `staging` | QA & integration test | Managed PostgreSQL | R2 staging bucket | OpenAI dev key |
| `production` | Live users | Managed PostgreSQL + read replica | R2 production bucket | OpenAI prod key |

Setiap environment memiliki secrets sendiri. Tidak ada shared secret antar environment.

---

## Architecture (Production)

```
Internet
    │
Cloudflare CDN
    │
┌───┴──────────────────────┐
│                          │
Next.js (web)          NestJS (api)
    │                      │
    │                      ├── PostgreSQL (primary + replica)
    │                      ├── Redis
    │                      ├── BullMQ workers
    │                      ├── Cloudflare R2
    │                      └── OpenAI API
    │
PostHog (client-side)
Sentry (client-side)
```

> Frontend dan backend bisa di-host terpisah (Vercel + Railway) atau bersama (single VPS dengan Docker Compose). Pilih berdasarkan tim & budget.

---

## Prerequisites

### Yang harus siap sebelum deploy pertama

- [ ] Domain + DNS (contoh: `lms.go.id`, `api.lms.go.id`)
- [ ] SSL certificate (Cloudflare auto atau Let's Encrypt)
- [ ] Managed PostgreSQL 16 dengan pgvector extension
- [ ] Managed Redis 7+
- [ ] Cloudflare R2 bucket + API token
- [ ] OpenAI API key (dengan billing limit)
- [ ] Sentry project (DSN untuk web & api)
- [ ] PostHog project (project API key)
- [ ] GitHub Actions secrets terisi
- [ ] Backup strategy untuk PostgreSQL

---

## Container Build

### Dockerfile (Backend - apps/api)

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @lms/api... --filter @lms/database

# Build
FROM deps AS builder
COPY . .
RUN pnpm --filter @lms/api build
RUN pnpm --filter @lms/database prisma generate

# Production image
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/generated ./packages/database/generated
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
```

### Dockerfile (Frontend - apps/web)

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @lms/web...

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STORAGE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STORAGE_URL=$NEXT_PUBLIC_STORAGE_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN pnpm --filter @lms/web build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

> Aktifkan `output: 'standalone'` di `next.config.js` agar image size minimal.

### docker-compose.prod.yml (Single-node Production)

```yaml
version: "3.9"

services:
  api:
    image: ghcr.io/<org>/lms-api:${VERSION}
    restart: unless-stopped
    env_file: /opt/lms/api.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "4000:4000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  worker:
    image: ghcr.io/<org>/lms-api:${VERSION}
    restart: unless-stopped
    env_file: /opt/lms/api.env
    command: ["node", "apps/api/dist/worker.js"]
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    image: ghcr.io/<org>/lms-web:${VERSION}
    restart: unless-stopped
    env_file: /opt/lms/web.env
    ports:
      - "3000:3000"
    depends_on:
      - api

  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    env_file: /opt/lms/postgres.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

> Untuk production sebenarnya, pakai managed PostgreSQL & Redis (Supabase, Neon, Upstash, Railway). Compose ini untuk single-node atau staging.

---

## Deployment Steps

### Staging Deployment

Staging auto-deploy dari branch `staging` via GitHub Actions.

1. Merge PR ke `staging`
2. CI jalankan: lint → typecheck → test → build → push image
3. GitHub Actions SSH ke staging server dan `docker compose pull && docker compose up -d`
4. Run migration: `docker exec lms-api pnpm --filter @lms/database prisma migrate deploy`
5. Health check: `curl https://staging-api.lms.go.id/api/v1/health`
6. Kirim notifikasi ke Slack/Telegram dengan status deploy

### Production Deployment

Production deploy manual via GitHub Actions workflow dispatch (butuh approval).

1. Tag release: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions build & push image dengan tag version
3. Buat backup database: `pg_dump ... > backup_$(date).sql`
4. Deploy: `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`
5. Run migration: `prisma migrate deploy` (bukan `migrate dev` di production!)
6. Smoke test critical path
7. Update changelog & announce

> Migration di production SELALU pakai `prisma migrate deploy`. Jangan pernah `migrate dev` atau `db push` di production.

---

## GitHub Actions Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options: [staging, production]
      version:
        description: 'Image version (tag)'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/lms
            export VERSION=${{ inputs.version }}
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            sleep 10
            docker exec lms-api node apps/api/dist/scripts/migrate.js
            curl -f https://${{ vars.API_DOMAIN }}/api/v1/health || exit 1
```

---

## Pre-deploy Checklist

Sebelum eksekusi deploy production:

- [ ] Semua CI checks lulus di branch release
- [ ] Smoke test staging lulus
- [ ] Database backup terbaru (< 24 jam)
- [ ] Migration files sudah di-review
- [ ] Env vars di production sudah update jika ada var baru
- [ ] OpenAI billing limit cukup
- [ ] R2 storage quota cukup
- [ ] Sentry & PostHog menerima event dari staging
- [ ] Rollback plan disiapkan (previous image tag)
- [ ] Tim on-call sudah tahu

---

## Health Check

### Endpoint

```
GET /api/v1/health
```

Response 200:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-06-30T10:00:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

Response 503 saat ada service down. Load balancer harus drain traffic kalau 503.

### Kubernetes-style Probe (untuk Docker Compose)

Dipakai di `healthcheck` service. Pastikan endpoint cepat (< 500ms) dan tidak ada side effect.

---

## Rollback Procedure

### Cepat (jika deploy baru crash)

```bash
cd /opt/lms
export VERSION=<previous-tag>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Dengan Database Rollback

Jika migration breaking:

1. Stop api & worker: `docker compose stop api worker`
2. Restore database: `psql < backup_$(date).sql` (HATI-HATI, data setelah backup hilang)
3. Rollback image: ganti `VERSION` ke previous tag
4. Start: `docker compose up -d`
5. Investigasi migration yang breaking, buat fix migration

> Rollback database adalah last resort. Migration harus selalu backward-compatible kalau memungkinkan (lihat `AGENTS.md.md`).

---

## Migration Strategy

### Aturan Migration

1. **Selalu forward-only.** Jangan edit migration yang sudah di-deploy.
2. **Backward-compatible dulu.** Tambah kolom nullable → deploy → backfill → deploy → hapus kolom lama di migration berikutnya.
3. **Pisahkan schema change dan data migration** jadi 2 migration terpisah.
4. **Test di staging dulu** dengan copy data production.
5. **Backup sebelum migration** di production.

### Perintah

```bash
# Staging/Production
prisma migrate deploy      # Jalankan migration pending
prisma migrate status      # Cek status migration
prisma migrate resolve     # Tandai migration yang gagal sebagai resolved (HATI-HATI)

# Development
prisma migrate dev         # Buat migration baru dari perubahan schema
```

---

## Monitoring Post-deploy

Setelah deploy, pantau 30 menit pertama:

| Metric | Source | Alert |
|--------|--------|-------|
| Error rate | Sentry | > 1% requests |
| Response time P95 | APM / logs | > 500ms (non-AI) |
| Health check | Uptime monitor | 503 berturut-turut |
| AI token usage | AI Gateway logs | Spike abnormal |
| Queue backlog | BullMQ dashboard | > 1000 job pending |
| Database connection | PgBouncer / DB metrics | > 80% pool |

---

## Cloudflare Configuration

### DNS

| Record | Type | Target |
|--------|------|--------|
| `lms.go.id` | A/CNAME | Frontend host |
| `api.lms.go.id` | A/CNAME | Backend host |
| `cdn.lms.go.id` | CNAME | R2 public bucket |

### CDN Settings

- SSL: Full (strict)
- Always Use HTTPS: On
- Min TLS: 1.2
- WAF: enable managed rules
- Rate limiting: 100 req/min per IP untuk `/api/v1/*`
- Bot fight mode: On
- Cache level: Standard untuk web, bypass untuk `/api/*`

---

## Backup Strategy

### PostgreSQL

| Frequency | Method | Retention |
|-----------|--------|-----------|
| Harian (2 AM) | `pg_dump` ke R2 | 30 hari |
| Sebelum deploy | `pg_dump` manual | 7 versi terakhir |
| Continuous | WAL streaming (opsional) | Point-in-time recovery |

### R2

R2 sudah replication 3x internal. Tidak butuh backup tambahan untuk MVP. Versi file bisa diaktifkan kalau butuh history.

### Redis

Redis adalah cache & queue. Tidak butuh backup. Queue BullMQ persistent di Redis AOF, tapi job yang sudah diproses tidak perlu disimpan.

---

## Scaling (Future)

Saat traffic naik:

1. **Vertikal dulu:** naikkan CPU/RAM server
2. **Horizontal:** tambah instance api & worker
3. **Read replica:** untuk query read-heavy (analytics, leaderboard)
4. **PgBouncer:** connection pooling kalau koneksi mulai habis
5. **CDN tuning:** cache lebih agresif untuk static asset

Indikator butuh scale:

- CPU usage rata-rata > 70%
- Database connection pool > 80%
- P95 response time > target
- Queue backlog persistent > 1000

## References

- `MVP-TECH-STACK.md`
- `ENVIRONMENT-VARIABLES.md`
- `DEVELOPMENT-SETUP.md`
- `TESTING-STRATEGY.md`
