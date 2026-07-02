# Contributing

Kominfo AI Learning Management System

Version 1.0

---

## Purpose

Panduan untuk siapapun yang berkontribusi pada AI-LMS. Mencakup: setup, branch convention, commit, PR, review, dan release.

> **Aturan utama:** Baca dokumen di `docs/` sebelum mulai. Jangan asumsi. Kalau ragu, tanya.

---

## Quick Start

```bash
# Clone
git clone <repo-url> LMS_Kominfo
cd LMS_Kominfo

# Install
pnpm install

# Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env sesuai ENVIRONMENT-VARIABLES.md

# Start infrastructure
docker compose up -d

# Setup database
pnpm --filter @lms/database prisma migrate dev
pnpm --filter @lms/database prisma db seed

# Run apps
pnpm --filter @lms/api dev    # terminal 1
pnpm --filter @lms/web dev    # terminal 2
```

Detail lengkap: `DEVELOPMENT-SETUP.md`.

---

## Baca Dulu Sebelum Coding

Wajib baca (urutan penting):

1. `AGENTS.md` - aturan development
2. `MVP-TECH-STACK.md` - stack yang locked
3. `API Contract.md` - endpoint yang harus dibuat
4. `Resource Model.md` - struktur database
5. `System Design Document.md` - arsitektur
6. `SECURITY-GUIDELINES.md` - aturan keamanan
7. `DEFINITION-OF-DONE.md` - standar kualitas

Baca juga dokumen yang relevan dengan fitur yang dikerjakan:

- Frontend: `Frontend Sitemap.md`, `UI Components Documentation.md`
- AI: `RAG-ARCHITECTURE.md`, `AI-PROMPT-TEMPLATES.md`
- Testing: `TESTING-STRATEGY.md`
- Deploy: `DEPLOYMENT-GUIDE.md`

---

## Branch Strategy

### Branch Naming

| Type | Prefix | Contoh |
|------|--------|--------|
| Feature | `feature/` | `feature/auth-login` |
| Bugfix | `fix/` | `fix/quiz-score-calculation` |
| Refactor | `refactor/` | `refactor/course-service` |
| Docs | `docs/` | `docs/update-api-contract` |
| Chore | `chore/` | `chore/update-dependencies` |
| Hotfix | `hotfix/` | `hotfix/cert-generation-crash` |
| Release | `release/` | `release/v1.0.0` |

### Branch Lifecycle

```
main (production-ready)
  ↑
staging (integration)
  ↑
feature/* (development)
```

- `main`: selalu deployable, protected, butuh PR + review
- `staging`: integration branch, auto-deploy ke staging
- `feature/*`: branch kerja, dibuat dari `staging` (atau `main` kalau tidak pakai staging)

---

## Commit Convention

Pakai **Conventional Commits**. Setiap commit wajib pakai format:

```
<type>(<scope>): <subject>

<body optional>

<footer optional>
```

### Type

| Type | Kapan |
|------|-------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactor tanpa ubah behavior |
| `perf` | Perbaikan performa |
| `docs` | Dokumentasi |
| `test` | Test code |
| `chore` | Maintenance, dependency, config |
| `ci` | CI/CD |
| `style` | Format, lint, whitespace (no logic change) |
| `revert` | Revert commit |

### Scope

Nama module yang terkena: `auth`, `course`, `quiz`, `assignment`, `certificate`, `ai`, `analytics`, `db`, `ui`, `config`, dll.

### Subject

- Imperative mood: "add", "fix", "update" (bukan "added", "fixes")
- Huruf kecil di awal
- Tanpa titik di akhir
- Maks 72 karakter

### Contoh

```
feat(auth): add refresh token rotation

fix(quiz): correct score calculation for essay questions

refactor(course-service): extract validation to separate module

docs(api): add certificate endpoints

chore(deps): update next.js to 15.1

test(ai): add integration test for rag pipeline
```

### Footer (Optional)

- `BREAKING CHANGE:` untuk breaking change
- `Closes #123` untuk auto-close issue
- `Refs #123` untuk referensi tanpa close

```
feat(auth): replace nextauth with jwt

BREAKING CHANGE: auth flow berubah, client perlu update token handling

Closes #45
```

---

## Pull Request Process

### 1. Sebelum Buat PR

- [ ] Branch sudah up-to-date dengan target branch
- [ ] Lint lulus: `pnpm lint`
- [ ] Typecheck lulus: `pnpm typecheck`
- [ ] Unit test lulus: `pnpm test`
- [ ] Integration test lulus (kalau menyentuh backend): `pnpm test:integration`
- [ ] Tidak ada TypeScript error
- [ ] Tidak ada ESLint error
- [ ] Tidak ada `console.log` yang tertinggal
- [ ] Tidak ada commented-out code
- [ ] Tidak ada secret di code

### 2. Buat PR

Pakai template PR (`.github/pull_request_template.md`):

```markdown
## Description
Jelaskan apa yang diubah dan kenapa.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactor

## Related Issue
Closes #123

## Screenshots (if UI change)
Before/After

## Testing
- [ ] Unit test added/updated
- [ ] Integration test added/updated
- [ ] Manual test done

## Checklist
- [ ] Code follows style guide
- [ ] Self-review done
- [ ] No new lint warnings
- [ ] Docs updated (if needed)
- [ ] Migration included (if schema change)
- [ ] No secrets committed
```

### 3. Review

#### Reviewer Wajib Cek

- [ ] Sesuai dengan PRD / API Contract / Resource Model
- [ ] Tidak ada bisnis logic di controller
- [ ] Input validation ada
- [ ] Authorization/permission check ada
- [ ] Error handling tidak swallow
- [ ] Tidak ada N+1 query
- [ ] Test adequate (happy + edge + error)
- [ ] Tidak ada duplikasi logic
- [ ] Naming consistent
- [ ] Tidak ada abstraksi spekulatif

#### Review Etiquette

- Review code, bukan orang
- Sebutkan positive thing, bukan cuma kritik
- Kasih saran konkret, bukan "ini kurang bagus"
- Pakai label: `[must]`, `[should]`, `[nit]`
- Reviewer tidak modify langsung, kasih comment
- Author resolve dengan reply atau commit baru

### 4. Merge

- Minimal 1 approval (2 untuk core module)
- Semua CI checks lulus
- Tidak ada `[must]` yang unresolved
- Hapus branch setelah merge (kecuali release branch)

---

## Code Style

### TypeScript

- Strict mode: `strict: true` di tsconfig
- No `any` (pakai `unknown` + type guard kalau beneran tidak tahu tipe)
- Prefer `interface` untuk object shape, `type` untuk union/intersection
- Pakai `enum` untuk nilai terbatas, atau union string literal
- Export explicit (`export function`), jangan `export *`
- Import urutan: external → internal → relative

### Naming

| Tipe | Convention | Contoh |
|------|------------|--------|
| Variable/function | camelCase | `courseProgress` |
| Class/interface | PascalCase | `CourseService` |
| Type/enum | PascalCase | `CourseStatus` |
| Constant | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| File (component) | PascalCase | `CourseCard.tsx` |
| File (utility/service) | kebab-case | `course-service.ts` |
| File (test) | `{name}.spec.ts` | `course.service.spec.ts` |
| Database table | PascalCase (Prisma) | `Course`, `UserBadge` |
| Database field | camelCase (Prisma) | `createdAt`, `regionId` |

> Dilarang: singkatan yang tidak jelas (`cp`, `usr`, `tmp`). Kecuali: `id`, `url`, `api`.

### File Size

- Service/controller: maks 300 baris (kalau lebih, split)
- Component: maks 200 baris (kalau lebih, extract sub-component)
- Function: maks 50 baris (kalau lebih, extract helper)

### Formatting

Pakai Prettier dengan config shared di `packages/config`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

ESLint config juga shared. Tidak boleh disable rule tanpa alasan + comment.

---

## Architecture Rules

### Feature-Based

Organisir kode per fitur, bukan per tipe file:

```
src/modules/course/
├── course.module.ts
├── course.controller.ts
├── course.service.ts
├── course.repository.ts
├── dto/
│   ├── create-course.dto.ts
│   └── update-course.dto.ts
├── course.service.spec.ts
└── course.controller.e2e-spec.ts
```

### Layer Separation

```
Controller → validasi input, auth, call service
Service → bisnis logic
Repository → database access
```

- Controller TIDAK boleh ada bisnis logic
- Service TIDAK boleh langsung query DB (lewat repository)
- Repository TIDAK boleh ada bisnis logic

### Dependency Direction

```
UI → Service → Repository → Database
```

- Dependency mengalir satu arah
- Tidak ada circular dependency
- UI tidak import repository langsung
- Repository tidak import service

---

## Database Rules

### Migration

- Selalu pakai `prisma migrate dev` untuk buat migration
- Jangan edit migration yang sudah di-merge
- Migration harus backward-compatible (lihat `DEPLOYMENT-GUIDE.md`)
- Setiap tabel wajib: `id`, `createdAt`, `updatedAt`
- Soft delete: tambah `deletedAt DateTime?` kalau perlu
- Index: tambah untuk field yang sering di-query/filter

### Seed

- Seed dev: data realistis untuk manual testing
- Seed test: data minimal & deterministic
- Jangan seed data production lewat code (pakai script terpisah)

---

## Testing Rules

Lihat `TESTING-STRATEGY.md` untuk detail.

Quick summary:

- Service publik method → unit test wajib
- API endpoint → integration test wajib
- Critical path → E2E wajib
- Coverage >= 80% overall, >= 90% core

---

## Release Process

### Versioning

Pakai **Semantic Versioning**:

```
MAJOR.MINOR.PATCH
1.0.0
```

- MAJOR: breaking change
- MINOR: fitur baru backward-compatible
- PATCH: bug fix backward-compatible

### Release Steps

1. Pastikan `main` bersih dan semua CI lulus
2. Buat branch `release/vX.Y.Z`
3. Update version di `package.json`
4. Update `CHANGELOG.md`
5. Buat PR ke `main`
6. Setelah merge, tag: `git tag vX.Y.Z`
7. Push tag: `git push origin vX.Y.Z`
8. GitHub Actions auto-build & deploy

### Changelog Format

```markdown
## [1.0.0] - 2026-06-30

### Added
- Auth login & register
- Course CRUD
- AI tutor dengan RAG

### Changed
- Stack migrated dari NextAuth ke JWT

### Fixed
- Quiz score calculation edge case

### Breaking
- API response format changed
```

---

## Issue & Task Tracking

### Issue Template

Saat buat issue, pakai template:

**Bug:**
```markdown
## Description
Apa yang terjadi?

## Steps to Reproduce
1. Login sebagai student
2. Buka course X
3. Klik lesson Y
4. Error ...

## Expected
Seharusnya ...

## Actual
Yang terjadi ...

## Environment
- OS:
- Browser:
- Environment: staging/production
```

**Feature:**
```markdown
## Description
Fitur apa yang ingin ditambah?

## Why
Kenapa butuh?

## Acceptance Criteria
- [ ] Kriteria 1
- [ ] Kriteria 2

## References
- PRD section: ...
- API Contract: ...
```

### Label

| Label | Keterangan |
|-------|------------|
| `bug` | Bug |
| `feature` | Fitur baru |
| `enhancement` | Perbaikan fitur existing |
| `security` | Terkait keamanan |
| `performance` | Terkait performa |
| `docs` | Dokumentasi |
| `good first issue` | Cocok untuk newcomer |
| `help wanted` | Butuh kontributor |
| `blocked` | Butuh dependency lain dulu |
| `priority:high` | Prioritas tinggi |

---

## Communication

- GitHub Issues: untuk bug report & feature request
- GitHub Discussions: untuk Q&A dan design discussion
- PR comment: untuk review code
- Chat (Slack/Discord/Telegram): untuk hal urgent dan koordinasi harian

> Jangan diskusi keputusan teknis penting di chat tanpa dokumentasi. Selalu tulis hasil ke issue atau ADR.

---

## Definition of Done

Sebuah PR siap merge hanya jika (lihat `DEFINITION-OF-DONE.md`):

- [ ] Functional requirements terpenuhi
- [ ] UI: responsive, loading, empty, error, success state
- [ ] API: validasi, auth, response format, Swagger
- [ ] Security: input validation, RBAC, no secret
- [ ] Performance: no N+1, pagination, lazy load
- [ ] Accessibility: WCAG AA, keyboard nav
- [ ] Test: unit, integration, E2E (kalau critical path)
- [ ] Docs: update jika behavior berubah
- [ ] Migration: generated & tested
- [ ] Lint & typecheck lulus
- [ ] No `any`, no commented code, no unused import

---

## Yang Tidak Boleh Dilakukan

- ❌ Commit secret / API key
- ❌ Disable ESLint rule tanpa alasan
- ❌ Pakai `any` (pakai `unknown` + guard)
- ❌ Business logic di controller
- ❌ Query DB langsung dari controller
- ❌ Skip migration (pakai `db push` di production)
- ❌ Hardcode nilai yang seharusnya config
- ❌ Tulis bisnis logic tanpa test
- ❌ Merge PR tanpa review
- ❌ Force push ke `main` atau `staging`
- ❌ Asumsi kalau dokumen tidak jelas (tanya dulu)

---

## Acknowledgments

Terima kasih sudah kontribusi. Setiap kontribusi - kecil atau besar - membantu platform pembelajaran digital pemerintah menjadi lebih baik.

## References

- `AGENTS.md`
- `MVP-TECH-STACK.md`
- `DEVELOPMENT-SETUP.md`
- `TESTING-STRATEGY.md`
- `SECURITY-GUIDELINES.md`
- `DEPLOYMENT-GUIDE.md`
- `DEFINITION-OF-DONE.md`
