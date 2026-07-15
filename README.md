# LMS Platform

AI-powered, multi-tenant, plugin-ready Learning Management System (Coursera + Moodle style).

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo + pnpm |
| API | NestJS + Prisma + PostgreSQL + Redis |
| Web | Next.js App Router + Tailwind + shadcn/ui |
| Storage | S3-compatible (MinIO local) |
| Realtime | Socket.IO (+ Redis adapter when `REDIS_URL` set) |
| Code runner | Judge0 remote (prod) / mock host (dev only) |

## Apps & packages

- `apps/api` — REST under `/api/v1`
- `apps/web` — learner / instructor / admin UI
- `packages/db` — Prisma schema, migrations, seed
- `packages/shared` — permissions, pagination helpers, plugins
- `packages/config` — env / ports / AI config

## Prerequisites

- Node.js 24+
- pnpm `11.7.0` (see `packageManager` in root `package.json`)
- Docker Desktop (or Docker Engine) for Postgres, Redis, MinIO, and integration tests
- For E2E UI: Chromium via Playwright (`pnpm exec playwright install chromium`)

## Local setup

```powershell
pnpm install
Copy-Item .env.example .env
# Strip inline comments after `=` on boolean/simple values if the API fails to boot
# (AI_ENABLED=false # comment  →  AI_ENABLED=false)

docker compose up -d postgres redis minio

# Optional: isolated code-runner sandbox (Judge0 CE)
# docker compose --profile code-runner up -d
# then set JUDGE0_BASE_URL=http://localhost:2358
# Create MinIO bucket once (host ports from .env, default 9000):
# docker run --rm --add-host=host.docker.internal:host-gateway --entrypoint /bin/sh minio/mc `
#   -c "mc alias set local http://host.docker.internal:9000 minio minio_password && mc mb --ignore-existing local/lms-local"

pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API health | http://localhost:4000/api/v1/health |
| API live | http://localhost:4000/api/v1/health/live |
| OpenAPI UI | http://localhost:4000/api/v1/docs |
| OpenAPI JSON | http://localhost:4000/api/v1/docs-json |

Default seed password: `ChangeMe123!`  
Users: `learner.one@example.com`, `learner.two@example.com`, `instructor@example.com`, `super.admin@example.com`

Default compose ports (from `.env.example`): Postgres `55432`, Redis `6379`, MinIO `9000`/`9001`, API `4000`, Web `3000`.

## Test layers (what each gate means)

| Layer | Command | What it is | Needs |
|-------|---------|------------|--------|
| **Unit** | `pnpm test:unit` / `pnpm test` | Vitest in api/web/shared/config; mocks, no live DB | Built workspace packages (`turbo` `^build`) |
| **Integration** | `pnpm test:integration` | API `*.integration.spec.ts` vs real Postgres/Redis | Docker; script uses `docker-compose.test.yml` (pg `:5434`, redis `:6380`, DB `lms_test`) |
| **Coverage** | `pnpm test:coverage` | Same as unit + v8 thresholds | Same as unit |
| **API E2E** | `pnpm e2e:api` | Playwright `e2e/api/**` against real HTTP API | Docker stack + seed; Playwright starts api/web via `webServer` |
| **UI E2E** | `pnpm e2e:ui` | Playwright `e2e/ui/**` desktop Chromium | Same + Chromium browser |
| **Mobile E2E** | `pnpm exec playwright test --project=mobile-chrome` | `e2e/ui/mobile-*.spec.ts` (Pixel 5) | Same |
| **Full suite** | `pnpm test:full` | unit → integration → coverage → e2e | All of the above |
| **Fast gate** | `pnpm verify` | lint → typecheck → build → unit | No Docker |

## Security CI

Workflow: `.github/workflows/security.yml` (on push/PR to `main` / `develop` / `Phase-*`).

| Tool | Purpose | Report |
|------|---------|--------|
| Semgrep | SAST (OWASP / TS / Node) | SARIF → Security tab + artifact |
| CodeQL | SAST | Security tab |
| Bearer | Privacy / SAST | SARIF + artifact |
| Gitleaks | Secrets | Fail on leak + artifact |
| Trivy FS | Dependency / filesystem CVE | SARIF + artifact |
| Trivy image | API container (`docker/api.Dockerfile`) | SARIF + artifact |
| Checkov | Dockerfile / GHA IaC | SARIF + artifact |
| OWASP ZAP | Optional DAST | `workflow_dispatch` + `target_url` |

PR runs get a **Security scan report** comment. Details: `docs/security-sast-report.md`.

## Quality scripts

```powershell
pnpm verify              # fast local/CI gate (~lint + typecheck + build + unit)
pnpm test:unit           # turbo test (all packages)
pnpm test:integration    # docker-compose.test.yml + 15 API integration tests
pnpm test:coverage       # thresholds gate; CI uploads lcov
pnpm test:full           # unit + integration + coverage + e2e
pnpm e2e                 # seed + all Playwright projects
pnpm e2e:api
pnpm e2e:idor            # IDOR pack only
pnpm e2e:ui
pnpm exec playwright install chromium   # once per machine
```

### Estimated durations (local, warm cache)

| Suite | Typical |
|-------|---------|
| `pnpm verify` | 2–5 min |
| `pnpm test:unit` | ~30–60 s (API ~650 tests) |
| `pnpm test:integration` | ~1–2 min (includes compose up/down) |
| `pnpm test:coverage` | ~1–2 min |
| API E2E (all projects api) | ~2–5 min |
| Full `pnpm e2e` | ~5–15 min |

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ERR_PNPM_IGNORED_BUILDS` | Ensure `pnpm-workspace.yaml` `allowBuilds` has no placeholder strings; re-run `pnpm install` |
| `@lms/config` missing `dist` | Use `pnpm test` (turbo `^build`), not only `pnpm --filter @lms/api test` on a clean tree |
| Integration: Docker not available | Start Docker Desktop; re-run `pnpm test:integration` |
| API boot: `AI_ENABLED must be either true or false` | Remove inline `#` comments from boolean env values in `.env` |
| E2E `Invalid URL` / health timeout | Set absolute URLs: `E2E_API_URL=http://localhost:4000/api/v1`, `NEXT_PUBLIC_API_URL` same, `E2E_WEB_URL=http://localhost:3000` |
| E2E file upload fails | Ensure MinIO is up and bucket `lms-local` exists |
| Flaky unit / skip policy | See `docs/testing-flaky-policy.md` |
| Full plan / phase tracking | `docs/testing-full-suite-plan.md` |

## Production notes

- Set strong `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENTERPRISE_SECRET_KEY`
- **Never** run `db:seed` in production (`db:deploy` only)
- Code runner: set `JUDGE0_BASE_URL` (mock blocked when `NODE_ENV=production`)
  - Local Judge0: `docker compose --profile code-runner up -d` → `http://localhost:2358`
- Payments: user confirm → `AWAITING_REVIEW`; admin approve → `PAID` + enroll
- Deploy / rollback: `docs/ops-deploy-rollback.md`
- Ops checklist: `apps/api/src/common/security/production-checklist.md`
- Branch protection should require CI jobs: `lint`, `build`, `test`, `integration`, `coverage`, `e2e` (repo settings — not in-repo)

## Docs

Architecture and phase notes live under `docs/`. Start with `docs/README.md` and `AGENTS.md`.
