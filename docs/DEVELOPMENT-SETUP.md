# Development Setup

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Panduan untuk menjalankan project AI-LMS secara lokal. Tujuannya: satu perintah, semua service jalan.

---

## Prerequisites

| Tool | Version | Keterangan |
|------|---------|------------|
| Node.js | 20 LTS+ | Runtime JavaScript |
| pnpm | 9+ | Package manager (monorepo) |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Orchestration lokal |
| Git | 2.40+ | Version control |

Opsional:

| Tool | Kapan Dipakai |
|------|---------------|
| Redis Insight | Debug cache/queue |
| TablePlus / DBeaver | Inspeksi PostgreSQL |
| MinIO Console | Inspeksi file storage lokal |

---

## Monorepo Structure

```
LMS_Kominfo/
├── apps/
│   ├── web/                 # Next.js 15 (frontend)
│   └── api/                 # NestJS (backend)
├── packages/
│   ├── ui/                  # Shared UI components (Shadcn)
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Shared utilities
│   ├── config/              # Shared config (eslint, tsconfig)
│   └── database/            # Prisma schema & client
├── docs/                    # Project documentation
├── docker-compose.yml       # Infrastructure services
├── docker-compose.dev.yml   # Dev overrides
├── package.json             # Root workspace
├── pnpm-workspace.yaml
└── turbo.json               # Turborepo pipeline (opsional)
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url> LMS_Kominfo
cd LMS_Kominfo
pnpm install
```

### 2. Siapkan Environment File

Salin template env:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Lengkapi nilai sesuai `ENVIRONMENT-VARIABLES.md`. Untuk lokal, sebagian besar sudah default.

### 3. Jalankan Infrastructure

```bash
docker compose up -d
```

Service yang aktif:

| Service | Port | Keterangan |
|---------|------|------------|
| postgres | 5432 | PostgreSQL 16 + pgvector |
| redis | 6379 | Redis 7 |
| minio | 9000 | S3-compatible storage (alternatif R2 lokal) |
| minio-console | 9001 | UI MinIO |

Cek status:

```bash
docker compose ps
```

### 4. Setup Database

```bash
pnpm --filter @lms/database prisma migrate dev
pnpm --filter @lms/database prisma db seed
```

Jika pertama kali, pgvector extension diaktifkan otomatis lewat migration pertama.

### 5. Jalankan Aplikasi

Terminal 1 (backend):

```bash
pnpm --filter @lms/api dev
```

Backend tersedia di `http://localhost:4000`.

Terminal 2 (frontend):

```bash
pnpm --filter @lms/web dev
```

Frontend tersedia di `http://localhost:3000`.

---

## Docker Compose Reference

`docker-compose.yml` (infrastructure only):

```yaml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: lms-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: lms
      POSTGRES_PASSWORD: lms_dev
      POSTGRES_DB: lms_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lms -d lms_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: lms-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: lms-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: lms_minio
      MINIO_ROOT_PASSWORD: lms_minio_dev
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 15s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

> Aplikasi (web & api) dijalankan langsung dengan `pnpm dev` di luar Docker agar hot-reload cepat. Docker hanya untuk infrastructure.

---

## Useful Commands

### Database

```bash
# Generate Prisma client setelah schema berubah
pnpm --filter @lms/database prisma generate

# Buat migration baru
pnpm --filter @lms/database prisma migrate dev --name <migration_name>

# Reset database (HATI-HATI)
pnpm --filter @lms/database prisma migrate reset

# Buka Prisma Studio
pnpm --filter @lms/database prisma studio
```

### Redis

```bash
# Masuk Redis CLI
docker exec -it lms-redis redis-cli

# Bersihkan cache (HATI-HATI, hanya dev)
docker exec -it lms-redis redis-cli FLUSHDB

# Monitor command
docker exec -it lms-redis redis-cli MONITOR
```

### BullMQ Dashboard

Backend menyediakan UI queue di `/admin/queues` (hanya saat `NODE_ENV=development` atau dengan admin token di staging).

### Logs

Aplikasi pakai Pino. Pretty-print di dev:

```bash
# Sudah otomatis di dev via pino-pretty
# Filter error saja:
pnpm --filter @lms/api dev 2>&1 | jq 'select(.level>=50)'
```

---

## Services Connection Details (Local)

### PostgreSQL

| Property | Value |
|----------|-------|
| Host | localhost |
| Port | 5432 |
| User | lms |
| Password | lms_dev |
| Database | lms_dev |
| URL | `postgresql://lms:lms_dev@localhost:5432/lms_dev` |

### Redis

| Property | Value |
|----------|-------|
| Host | localhost |
| Port | 6379 |
| URL | `redis://localhost:6379` |

### MinIO (Local Storage)

| Property | Value |
|----------|-------|
| Endpoint | localhost:9000 |
| Console | http://localhost:9001 |
| Access Key | lms_minio |
| Secret Key | lms_minio_dev |
| Bucket | lms-dev (buat manual pertama kali) |

Buat bucket pertama kali lewat console MinIO di `http://localhost:9001`, atau:

```bash
docker exec -it lms-minio mc alias set local http://localhost:9000 lms_minio lms_minio_dev
docker exec -it lms-minio mc mb local/lms-dev
```

---

## Troubleshooting

### Port sudah dipakai

```bash
# Cek siapa pakai port
lsof -i :5432   # macOS/Linux
netstat -ano | findstr :5432   # Windows

# Stop service lama atau ubah port di docker-compose.yml
```

### Prisma migration gagal

```bash
# Pastikan postgres sehat
docker compose ps postgres

# Reset dari awal
pnpm --filter @lms/database prisma migrate reset --force
```

### pgvector extension tidak ada

```bash
docker exec -it lms-postgres psql -U lms -d lms_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Redis connection refused

```bash
docker compose restart redis
docker exec -it lms-redis redis-cli ping   # harus PONG
```

### Node modules bermasalah

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

---

## Editor Setup

### VS Code (recommended)

Install extensions:

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- Docker

Settings yang direkomendasikan (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.prisma": "prisma"
  }
}
```

---

## Next Steps

Setelah setup selesai:

1. Baca `AGENTS.md` untuk aturan development
2. Baca `MVP-TECH-STACK.md` untuk stack yang locked
3. Baca `API Contract.md` untuk endpoint yang harus dibuat
4. Mulai dari module Auth → User → Course → Lesson → Quiz → Assignment → Certificate → AI

## References

- `MVP-TECH-STACK.md`
- `ENVIRONMENT-VARIABLES.md`
- `AGENTS.md`
- `API Contract.md`
