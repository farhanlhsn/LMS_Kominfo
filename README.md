# Kominfo AI-LMS

> Platform pembelajaran digital berbasis AI untuk program digital learning Kominfo di 4 region: Aceh, Medan, Lampung, Bengkulu.

[![Status](https://img.shields.io/badge/status-mvp-yellow)]()
[![Stack](https://img.shields.io/badge/stack-NestJS%20%7C%20Next.js%2015%20%7C%20PostgreSQL%20%7C%20pgvector-blue)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

## Apa ini?

Kominfo AI-LMS adalah Learning Management System (LMS) modern yang mengintegrasikan AI Assistant untuk membantu siswa memahami materi lebih cepat. Platform ini dirancang mobile-first, scalable, dan modular untuk mendukung program pelatihan digital pemerintah.

### Fitur Utama
- **Manajemen Kursus** — Modul, lesson (text/video/PDF/quiz/assignment/link), kategori, tingkat kesulitan.
- **AI Tutor (RAG)** — Tanya jawab berbasis Retrieval-Augmented Generation dengan **pgvector cosine similarity** + sitasi sumber otomatis. Mendukung streaming SSE.
- **AI Tools** — Ringkasan materi, quiz generator untuk instruktur, esai review otomatis, rekomendasi personal.
- **Quiz & Assignment** — Multi-tipe soal, grading otomatis & manual, submission file.
- **Gamifikasi** — XP, level, leaderboard regional + per-kursus, badge, streak.
- **Sertifikat PDF** — Otomatis setelah course selesai, dengan QR code verifikasi publik.
- **Notifikasi** — In-app bell + halaman notifikasi, broadcast ke user/region.
- **Pencarian Global** — Ctrl+K shortcut, scope course + lesson, filter wilayah.
- **Multi-Region** — Aceh, Medan, Lampung, Bengkulu; masing-masing punya branding & tema warna.
- **Admin CRUD Lengkap** — manajemen users, courses (dengan module/lesson manager), regions.
- **Video Player HLS** — adaptive streaming dengan progress tracking otomatis.
- **Analytics Dashboard** — Statistik per region, kursus, dan siswa.
- **Role-Based Access** — Super Admin, Regional Admin, Instructor, Student.
- **Keamanan Produksi** — JWT + refresh token rotation, multi-tier rate limiting, Redis cache, Helmet, audit log.
- **Health Check** — `GET /health/ready` verifikasi DB + Redis + Storage + OpenAI.
- **API Docs** — Swagger UI di `http://localhost:4000/api/docs`.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · Shadcn/UI · TanStack Query · Zod · Framer Motion |
| Backend | NestJS 10 · Prisma ORM · class-validator · Helmet · Pino |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7 · BullMQ |
| Auth | JWT (Access + Refresh) · Passport · RBAC |
| Storage | MinIO (local) / Local FS via StorageProvider abstraction |
| AI | OpenAI (text-embedding-3-small, GPT-4o-mini) via AI Gateway |
| Search | PostgreSQL ILIKE search |
| Observability | Pino (logs) · NestJS Health Checks |
| Deployment | Docker + Docker Compose |

## Quick Start

Lihat [docs/DEVELOPMENT-SETUP.md](docs/DEVELOPMENT-SETUP.md) untuk panduan lengkap.

```bash
# 1. Clone & install
git clone <repo-url> LMS_Kominfo
cd LMS_Kominfo
pnpm install

# 2. Setup env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Jalankan infrastructure (Postgres + Redis + MinIO)
docker compose up -d postgres redis minio

# 4. Setup database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Jalankan aplikasi
pnpm dev   # API di :4000, Web di :3000
```

Akun default setelah seed (password: `Admin123`):
- `admin@lms.go.id` — Super Admin
- `instructor@lms.go.id` — Instructor
- `student@lms.go.id` — Student

## Struktur Monorepo

```
LMS_Kominfo/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js 15 frontend
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── ui/           # Shared UI components
│   └── tsconfig/     # Shared tsconfig
├── docs/             # Dokumentasi proyek
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Dokumentasi

| Dokumen | Deskripsi |
|---|---|
| [PRD](docs/Kominfo%20AI%20Learning%20Management%20System%20PRD.md) | Product Requirement Document |
| [MVP Tech Stack](docs/MVP-TECH-STACK.md) | Tech stack yang di-lock untuk MVP |
| [System Design](docs/System%20Design%20Document.md) | Arsitektur & desain sistem |
| [API Contract](docs/API%20Contract.md) | Kontrak endpoint API |
| [Resource Model](docs/Resource%20Model.md) | Model data & relasi |
| [Database Schema](packages/database/prisma/schema.prisma) | Skema Prisma (source of truth) |
| [Frontend Sitemap](docs/Frontend%20Sitemap.md) | Peta route & halaman |
| [Design Spec](docs/DESIGN-SPEC.md) | Spesifikasi desain UI |
| [UI Components](docs/UI%20Components%20Documentation.md) | Dokumentasi komponen UI |
| [AGENTS.md](docs/AGENTS.md) | Aturan wajib untuk AI coding agent |
| [Definition of Done](docs/DEFINITION-OF-DONE.md) | Standar kualitas minimum |
| [Development Setup](docs/DEVELOPMENT-SETUP.md) | Setup environment lokal |
| [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) | Panduan deploy ke staging/prod |
| [Environment Variables](docs/ENVIRONMENT-VARIABLES.md) | Daftar environment variable |
| [Security Guidelines](docs/SECURITY-GUIDELINES.md) | Panduan keamanan |
| [Testing Strategy](docs/TESTING-STRATEGY.md) | Strategi pengujian |
| [RAG Architecture](docs/RAG-ARCHITECTURE.md) | Arsitektur RAG |
| [AI Prompt Templates](docs/AI-PROMPT-TEMPLATES.md) | Template prompt AI |
| [Contributing](docs/CONTRIBUTING.md) | Panduan kontribusi |

## Scripts

| Command | Fungsi |
|---|---|
| `pnpm dev` | Jalankan API & Web paralel |
| `pnpm build` | Build semua package via Turborepo |
| `pnpm lint` | Lint semua package |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Jalankan unit test |
| `pnpm db:migrate` | Jalankan Prisma migration |
| `pnpm db:seed` | Seed data awal |
| `pnpm db:studio` | Buka Prisma Studio |
| `pnpm docker:dev` | Jalankan full stack di Docker |
| `pnpm format` | Format kode dengan Prettier |

## Kontribusi

Baca [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) dan [docs/AGENTS.md](docs/AGENTS.md) sebelum membuat perubahan.

## Lisensi

[Apache License 2.0](LICENSE)

## Tim

Kementerian Komunikasi dan Informatika Republik Indonesia.
