# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di sini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added (Fase 4 — Production Readiness)
- Multi-tier rate limiting via `@nestjs/throttler`: 4 buckets (`default` 300/min, `auth` 5-20/min, `ai` 10-30/min, `search` 60/min) di-tune via env (`RATE_LIMIT_*_PER_MIN`).
- `CacheService` + `CacheModule` (global) — wrapper `ioredis` dengan cache-aside, prefix invalidation, dan graceful fallback ke no-op jika Redis unavailable.
- Redis caching untuk: `regions:all`, `regions:{id}`, `course:{id}`, `course:slug:{slug}`, `leaderboard:{regionId}:*`, `leaderboard:course:{courseId}:*`. Cache invalidation otomatis saat create/update/delete.
- Enhanced `HealthController` dengan endpoint `GET /health/ready` yang mengecek database, Redis, storage (MinIO/Local), dan OpenAI reachability. Mengembalikan HTTP 503 jika komponen critical down.
- `StorageService.ping()` — health check untuk MinIO bucket / local folder.
- Unit tests baru: `notifications.service.spec.ts` (9 test), `search.service.spec.ts` (9 test), `chunker.service.spec.ts` (9 test).
- Update test mocks untuk `CacheService` dependency injection di courses, regions, gamification, certificates, dan AI services.
- Total: 17 test suite, 109 unit tests pass.

### Added (Fase 3 — Kualitas & UX)
- `NotificationsModule` + service/controller: create, list, mark-as-read, mark-all-read, remove, broadcast-to-users, broadcast-to-region.
- Endpoint notifikasi di user: `GET /users/me/notifications`, `POST /users/me/notifications/:id/read`, `POST /users/me/notifications/read-all`, `DELETE /users/me/notifications/:id`.
- `CertificatePdfService` — generator PDF sertifikat dengan QR code verifikasi (PDFKit + qrcode).
- `UsersService` + `UsersController`: `GET /users/me`, `PATCH /users/me`, `POST /users/me/change-password`.
- `SearchModule` + endpoint `GET /search?q=...&regionId=...&onlyPublished=true&limit=20` (ILIKE-based, min 2 karakter, scope: course + lesson).
- Storage abstraction global (`StorageModule`) untuk materials (MinIO/S3 + local FS fallback) — 100MB max upload, MIME & extension whitelist.
- Frontend `NotificationsBell` di layout utama dengan badge unread count + polling 60 detik.
- Frontend `ThemeToggle` (light/dark/system) dengan localStorage persistence.
- Frontend `GlobalSearch` di navbar dengan shortcut Ctrl+K.
- Frontend `VideoPlayer` (HLS.js) + sanitized `Markdown` renderer untuk lesson content.
- Frontend `Pagination` + `ConfirmDialog` + `Dialog` shadcn primitives + `Textarea` reusable.
- Halaman settings terhubung ke `PATCH /users/me` + `POST /users/me/change-password` dengan validasi password.
- Halaman notifications dengan filter all/unread, mark all read, delete, type badge (INFO/SUCCESS/WARNING/ERROR).
- Halaman admin Users dengan Create/Edit/Reset Password/Delete, search, role filter, pagination.
- Halaman admin Courses dengan Create/Edit modal, publish/archive, Module Manager inline (tambah/hapus module + lesson TEXT/VIDEO/PDF/LINK dengan preview).
- Halaman admin Regions dengan Create/Edit modal + color picker branding.
- Sonner toast system untuk feedback aksi.
- `Toaster` dipasang di root layout.

### Added (Fase 2 — AI & RAG Pipeline)
- `AiGateway` — OpenAI client wrapper (chat, chatStream, embed, embedBatch) dengan rate-limit, usage logging ke `AiUsage`.
- `ChunkerService` — recursive text splitter (2400 char chunk, 400 overlap, CRLF normalization, token estimation).
- `RagService` — pipeline lengkap: ingest (chunk → embed → raw SQL upsert ke pgvector) + retrieve (cosine `<=>`) + build prompt dengan sitasi `[sumber: lesson|judul]`.
- `ExtractorService` — extract teks dari PDF (pdf-parse), DOCX (mammoth), PPTX/XLSX (jszip), TXT/MD.
- `AiQueueService` — BullMQ manager dengan 1 queue `ai-jobs` (handler: EMBED_LESSON, EMBED_MATERIAL, SUMMARY, RECOMMENDATION).
- `AiService` rewrite dengan 6 endpoint RAG-based:
  - `POST /ai/chat` — RAG retrieval + chat completion + sitasi.
  - `POST /ai/chat/stream` — streaming via Server-Sent Events (SSE).
  - `POST /ai/summary` — ringkasan materi lesson/teks bebas.
  - `POST /ai/quiz-generator` — generate soal pilihan ganda untuk instruktur.
  - `POST /ai/essay-review` — review esai siswa (skor 0-100 + feedback).
  - `POST /ai/recommendation` — rekomendasi materi personal.
  - `POST /ai/ingest/lesson` — trigger background ingestion job.
- `Embedding` model Prisma + raw SQL untuk pgvector `<=>` cosine.
- `AiUsage` model Prisma + back-relation ke User untuk tracking konsumsi token.
- Migration: `20260702000000_add_ai_usage`.
- Dependensi baru di API: `openai`, `pdf-parse`, `mammoth`, `jszip`, `minio`, `pdfkit`, `qrcode`.
- Dependensi baru di Web: `react-markdown`, `remark-gfm`, `rehype-sanitize`, `rehype-highlight`, `hls.js`, `sonner`.

### Added (Fase 1 — Stabilisasi MVP)
- `README.md`, `CHANGELOG.md`, dan `LICENSE` di root proyek.
- Setup Swagger UI di `apps/api` dengan endpoint `/api/docs`.
- Anotasi `@ApiTags` dan `@ApiOperation` di seluruh controller untuk dokumentasi API otomatis.
- Storage abstraction (`StorageProvider`) dengan implementasi MinIO/S3.
- `MaterialsController` dengan endpoint `POST /materials/upload`, `GET /materials/:id`, `DELETE /materials/:id` dan validasi MIME/ekstensi/size.
- Endpoint `GET /lessons/:id` dan `PATCH /lessons/:id/complete` sesuai API Contract.

### Changed
- `GamificationService.awardXp` — refactored menggunakan `upsert` Prisma yang benar untuk composite key dengan `courseId` nullable.
- `CoursesService.findBySlug` — sekarang meng-include modules dan lessons.
- `QuizzesService.findById` — `isCorrect` disembunyikan untuk role Student/Instructor (jawaban tetap untuk Admin/Grader).
- `AuthService.refresh` — sekarang memvalidasi signature refresh token dengan benar.
- `MaterialsService` — pindah dari local filesystem ke MinIO/S3 storage provider.
- Rename `docs/AGENTS.md.md` → `docs/AGENTS.md`, `docs/DEFINITION-OF-DONE.md.md` → `docs/DEFINITION-OF-DONE.md`, `docs/RAG-ARCHITECTURE.md.md` → `docs/RAG-ARCHITECTURE.md`.

### Fixed
- Inkonsistensi antara `STORAGE_PROVIDER=minio` di env dengan implementasi local FS di MaterialsService.
- Quizzes bocor `isCorrect` ke student (jawaban kuis).
- Hack route `GET /modules/any/lessons/:id` di frontend dihapus; diganti endpoint langsung.
- Frontend course detail masih menampilkan kurikulum palsu — sekarang fetch dari API.

## [0.1.0] - 2026-06-30

### Added
- Inisialisasi monorepo dengan pnpm workspace + Turborepo.
- Skema Prisma awal dengan User, Region, Course, Module, Lesson, Quiz, Assignment, Submission, Certificate, Badge, Leaderboard, ChatSession, ChatMessage, Embedding, Activity, Notification, AnalyticsEvent, SystemSetting.
- Migration pertama (`20260630034619_init`) dengan pgvector extension.
- Implementasi 16 modul backend: auth, users, regions, courses, course-modules, lessons, quizzes, assignments, submissions, progress, materials, gamification, certificates, analytics, ai, health.
- Frontend Next.js 15 dengan App Router: login, register, dashboard, courses (katalog + detail), learn, quiz, certificates, leaderboard, settings, profile, notifications, admin (users/courses/regions/dashboard), assignment.
- Komponen Shadcn UI: button, card, input, label, select, separator.
- AI Panel untuk chat dengan AI Tutor (mock response).
- Lesson Sidebar & Lesson Content.
- AuthProvider + API client dengan token management.
- 18 dokumen di `docs/`: PRD, MVP Tech Stack, System Design, API Contract, Resource Model, Frontend Sitemap, Design Spec, UI Components, AGENTS, Definition of Done, Development Setup, Deployment Guide, Environment Variables, Security Guidelines, Testing Strategy, RAG Architecture, AI Prompt Templates, Contributing.
- Docker Compose untuk Postgres+pgvector, Redis, MinIO, API, dan Web.
- Seed data: 4 region (Aceh, Medan, Lampung, Bengkulu), 3 akun default (admin/instructor/student), 1 kursus dengan module + 4 lesson (text/video/quiz/assignment).
- 14 unit test stubs (belum diimplementasi penuh).
