# Environment Variables

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Daftar lengkap environment variable yang dibutuhkan aplikasi. Pisahkan per service agar mudah dikelola.

> **Aturan wajib:** Jangan pernah commit file `.env` berisi nilai asli. Hanya `.env.example` yang boleh di-commit. Nilai production disimpan di secret manager (GitHub Actions secrets, Railway variables, dll).

---

## File Layout

```
apps/api/.env        # Backend (NestJS)
apps/api/.env.example
apps/web/.env        # Frontend (Next.js) - hanya NEXT_PUBLIC_* dan config client-safe
apps/web/.env.example
```

---

## Backend (apps/api)

### Application

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `NODE_ENV` | `development` | ya | `development` / `staging` / `production` / `test` |
| `PORT` | `4000` | ya | Port HTTP backend |
| `APP_URL` | `http://localhost:4000` | ya | Base URL backend |
| `WEB_URL` | `http://localhost:3000` | ya | Base URL frontend (CORS, redirect) |
| `CORS_ORIGINS` | `http://localhost:3000` | ya | Daftar origin yang diizinkan, dipisah koma |

### Database (PostgreSQL)

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/lms_kominfo?schema=public` | ya | Connection string Prisma |

### Redis

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `REDIS_ENABLED` | `true` | tidak | Mengaktifkan caching Redis (default: true) |
| `REDIS_HOST` | `localhost` | ya* | Host Redis |
| `REDIS_PORT` | `6379` | ya* | Port Redis |
| `REDIS_PASSWORD` | `...` | tidak | Password Redis |
| `REDIS_DB` | `0` | tidak | Redis database index |

### Authentication

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `JWT_ACCESS_SECRET` | `<random-64-char>` | ya | Secret untuk access token |
| `JWT_REFRESH_SECRET` | `<random-64-char>` | ya | Secret untuk refresh token |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | tidak | Expire access token (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | tidak | Expire refresh token (default: 7d) |
| `BCRYPT_ROUNDS` | `12` | tidak | Cost factor bcrypt (default: 12) |

> Generate secret: `openssl rand -hex 32` atau `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Storage (MinIO / Local)

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `STORAGE_PROVIDER` | `LOCAL` | ya | `MINIO` / `LOCAL` |
| `MINIO_ENDPOINT` | `localhost` | minio | Endpoint MinIO |
| `MINIO_PORT` | `9000` | minio | Port MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | minio | Access key MinIO |
| `MINIO_SECRET_KEY` | `minioadmin` | minio | Secret key MinIO |
| `MINIO_BUCKET` | `lms-materials` | minio | Nama bucket MinIO |
| `MINIO_USE_SSL` | `false` | minio | true/false |
| `LOCAL_STORAGE_PATH` | `./uploads` | local | Path penyimpanan file lokal |

### AI Gateway

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `OPENAI_API_KEY` | `sk-...` | ya | API key OpenAI |

### Rate Limiting

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `RATE_LIMIT_AUTHENTICATED_PER_MIN` | `300` | tidak | Limit default endpoint (default: 300) |
| `RATE_LIMIT_AUTH_PER_MIN` | `10` | tidak | Limit endpoint auth (default: 10) |
| `RATE_LIMIT_AI_PER_MIN` | `15` | tidak | Limit endpoint AI (default: 15) |
| `RATE_LIMIT_SEARCH_PER_MIN` | `60` | tidak | Limit endpoint search (default: 60) |

---

## Frontend (apps/web)

> Hanya variable dengan prefix `NEXT_PUBLIC_` yang diekspos ke browser. Jangan taruh secret di sini.

### Application

| Variable | Contoh | Wajib | Keterangan |
|----------|--------|-------|------------|
| `NEXT_PUBLIC_APP_NAME` | `Kominfo AI-LMS` | ya | Nama aplikasi |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | ya | Base URL backend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | ya | Base URL frontend |
