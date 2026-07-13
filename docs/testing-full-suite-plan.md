# Testing Full-Suite Plan & Tracking

**Goal:** One consistent quality gate runnable locally and in CI:

```
install → generate → lint → typecheck → build → unit → integration → coverage → E2E
```

Full suite passes only when every stage is green, DB migrations succeed, seed succeeds, and coverage thresholds are met.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Done |
| ⚠️ | Blocked / needs decision |
| ❌ | Failed (with notes) |

---

## Phase 0 — Stabilize Dependency Runner

**Objective:** `pnpm test` must reach Vitest, not stop at implicit install.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Investigate pnpm running dependency status/install check on every script | ✅ | Root cause: `pnpm-workspace.yaml` `allowBuilds` had invalid placeholder strings |
| 0.2 | Resolve `ERR_PNPM_IGNORED_BUILDS` without disabling global supply-chain protection | ✅ | Set `@scarf/scarf`, `cpu-features`, `ssh2` to `false` in `allowBuilds` |
| 0.3 | Pin local pnpm to `11.7.0` matching CI | ✅ | Already `11.7.0` |
| 0.4 | Verify `pnpm test` runs twice in a row without lockfile/node_modules changes | ✅ | `pnpm install --frozen-lockfile` now succeeds (4.1s); `pnpm test` reaches runners |
| 0.5 | Remove need to bypass via internal `node_modules` binaries | ✅ | Direct `pnpm test` works again |

**Done when:** `pnpm test` reaches Vitest; no lockfile/dep changes during test; no internal-binary bypass needed.

**Fix applied:** `pnpm-workspace.yaml` `allowBuilds` had three placeholder values
(`"set this to true or false"`) for `@scarf/scarf`, `cpu-features`, `ssh2`. pnpm 11
treated these as unresolved build-script approvals → `ERR_PNPM_IGNORED_BUILDS` →
implicit install before every script aborted. Set all three to `false`
(telemetry/native optional deps, safe to skip). `pnpm install --frozen-lockfile`
now succeeds; `pnpm test` executes the full package matrix.

---

## Phase 1 — Fix Failing Unit Tests

**Objective:** All API + web unit/component tests green.

| # | Task | File | Status | Notes |
|---|------|------|--------|-------|
| 1.1 | Add `courseFeedback.count` mock | `apps/api/src/experiences/experiences.service.spec.ts:299` | ✅ | Added `count: vi.fn().mockResolvedValue(7)` to `courseFeedback` mock |
| 1.2 | Update TOTP fixture to current HMAC impl | `apps/api/src/oauth/oauth.spec.ts:220` | ✅ | Replaced manual SHA1 (wrong) with `generateTotpCode` from `./mfa.service`; removed unused `createHash` import |
| 1.3 | Sync payment status expectation to `PENDING→AWAITING_REVIEW→PAID` | `apps/web/src/lib/marketplace.spec.ts:42` | ✅ | `CONFIRMED`/`REJECTED` were stale; now tests PENDING/AWAITING_REVIEW/PAID |
| 1.4 | Sync plugin label expectation to `Code exercise` | `apps/web/src/components/plugins/plugin-activity.spec.tsx:61` | ✅ | Renderer outputs `Code exercise` badge, not `Code runner` |
| 1.5 | Swap Vitest transform to SWC so `design:paramtypes` is emitted | `apps/api/vitest.config.ts`, `pnpm-workspace.yaml` (`@swc/core` in `onlyBuiltDependencies`+`allowBuilds`) | ✅ | esbuild can't emit decorator metadata → NestJS class-token DI (`RealtimeService`) failed; `unplugin-swc` + `@swc/core@1.15.43` fixes it. `vite-plugin-swc@0.0.2` is a broken placeholder, do not use. |
| 1.6 | Make `health.controller.spec.ts` infra-free | `apps/api/src/health/health.controller.spec.ts` | ✅ | Override `PrismaService` + `REDIS_CLIENT` with mocks and set `S3_ENDPOINT` so `/health` returns `ok` without live Postgres/Redis (kills ioredis crash). Test still verifies the standard API envelope. |

**Done when:** 0 API failures, 0 web failures, no new `skip`/`todo`/`only`.

**Result:** `pnpm test` (turbo) → **8/8 tasks pass**: 101 API spec files / 653 tests green, plus web (`marketplace.spec.ts` 13, `plugin-activity.spec.tsx` 6) and db suites. No Docker/infra required for the unit gate.

---

## Phase 2 — Workspace Dependency Build

**Objective:** Test packages resolve `@lms/config`, `@lms/shared`, `@lms/db` reliably.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Keep Turborepo `dependsOn: ["^build"]` for `test` | ✅ | `turbo.json` `test` → `^build`; `pnpm test` from clean checkout rebuilds/resolves `@lms/config`,`@lms/shared`,`@lms/db` |
| 2.2 | Do NOT add divergent source aliases between build vs test | ✅ | Vitest resolves `@lms/config` → `dist/index.js` (package `main`); no source alias added. Correct approach is `^build`, not aliasing |
| 2.3 | Document that direct package tests need built workspace deps | ✅ | `pnpm --filter @lms/api test` (bypasses turbo `^build`) passes ONLY if dep `dist/` exists. Run `pnpm test` (turbo) for the canonical path |

**Done when:** `pnpm test` works from clean checkout (verified — `^build` restores deps); direct `pnpm --filter @lms/api test` documented as requiring a prior build.

---

## Phase 3 — Integration Tests in Quality Gate

**Objective:** 3 integration files run against a test Postgres.

| # | File | Status | Notes |
|---|------|--------|-------|
| 3.1 | `apps/api/src/content-library/content-library.integration.spec.ts` | ✅ | 6 tests pass vs `lms_test` |
| 3.2 | `apps/api/src/core-lms/core-lms.integration.spec.ts` | ✅ | 5 tests pass vs `lms_test` |
| 3.3 | `apps/api/src/files/files.integration.spec.ts` | ✅ | 4 tests pass vs `lms_test` |

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.4 | Add root `test:integration` script pointing to API integration config | ✅ | `pnpm test:integration` → `scripts/test-integration.mjs` |
| 3.5 | Use dedicated test DB (not dev/prod) | ✅ | `docker-compose.test.yml` creates isolated `lms_test` on host ports 5434/6380 |
| 3.6 | Isolate/clean test data for determinism | ✅ | Each spec seeds fixed org/user IDs and `deleteMany` in `afterAll`; `singleFork: true` |
| 3.7 | Redis via CI service or supported fallback | ✅ | Redis from `docker-compose.test.yml` (redis-test); `REDIS_URL=redis://localhost:6380` |

**Done when:** All 3 integration suites found & run; repeatable; no order dependence. → **VERIFIED** via `pnpm test:integration`: stack up → `prisma migrate deploy` → 15 tests pass → stack torn down.

---

## Phase 4 — Coverage Gate

**Objective:** Coverage runs in CI and collapses fail the build.

| # | Package | Lines (baseline) | Functions (baseline) | Branches (baseline) | Floor set | Status |
|---|---------|-----------------:|---------------------:|--------------------:|----------:|--------|
| 4.1 | API (`apps/api`) | 59.18% | 69.59% | 57.7% | lines 55 / stmts 55 / funcs 55 / branches 50 | ✅ |
| 4.2 | Web (`apps/web`) | 10.55% | 74.03% | 22.56% | lines 10 / stmts 10 / funcs 20 / branches 20 | ✅ |
| 4.3 | Shared (`packages/shared`) | 27.14% | 45.45% | 66.66% | lines 25 / stmts 25 / funcs 40 / branches 40 | ✅ |
| 4.4 | Config (`packages/config`) | 96.03% | 94.54% | 75% | lines 95 / stmts 95 / funcs 70 / branches 70 | ✅ |

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.5 | Add `test:coverage` for API, web, shared, config | ✅ | Added `@vitest/coverage-v8@^3.2.4` (was `^4.1.10` — incompatible with vitest 3.x) + `test:coverage` scripts + root `turbo test:coverage` |
| 4.6 | Exclude DTOs, generated Prisma client, bootstrap, type-only decls | ✅ | API excludes `*.spec.ts`, `*.integration.spec.ts`, `src/main.ts`, `src/**/dto/**`; web/shared/config exclude `*.spec.*`, `*.d.ts` |
| 4.7 | Publish `text` + `lcov` (+ `json-summary` if needed) | ✅ | All configs use `reporter: ["text","lcov"]` |
| 4.8 | Run coverage in CI, not just as script | ✅ | Added `coverage` job to `.github/workflows/ci.yml`; uploads `coverage/lcov.info` per package as `coverage-reports` artifact |
| 4.9 | Critical modules ≥80% lines/branches: auth, RBAC, tenant isolation, marketplace/payment, file access | ⬜ | **Deferred** — current critical-module coverage is far below 80% (e.g. rbac org guard 21%, redis.service 30%). Requires a dedicated test-writing effort; tracked as a follow-up, not a Phase-4 blocker |
| 4.10 | Stepwise raise API/web by 5 pts/phase; mid target 60% lines | ⬜ | Floors set at current baselines so regressions fail; raise incrementally as suites grow |

**Done when:** Coverage collapse fails CI; report uploaded as artifact; new files can't lower baseline. → **VERIFIED** (`pnpm test:coverage` → 4 packages report, thresholds gate, all green; CI `coverage` job added).

---

## Phase 5 — Unify Full-Suite Commands

**Objective:** Clear fast loop + full loop.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Add `verify` = lint + typecheck + build + test:unit | ✅ | Added `verify`, `test:full`, `test:unit` to root `package.json` |
| 5.2 | Add `test:full` = test:unit + test:integration + test:coverage + e2e | ✅ | `pnpm e2e` already seeds; no double seed |
| 5.3 | Ensure non-zero exit from any stage fails command | ✅ | Chained with `&&`; verified `verify` aborts on the failing `lint` stage |

**Implementation (root `package.json`):**
```json
{
  "verify": "pnpm lint && pnpm typecheck && pnpm build && pnpm test:unit",
  "test:full": "pnpm test:unit && pnpm test:integration && pnpm test:coverage && pnpm e2e",
  "test:unit": "turbo test"
}
```

**ESLint cleanup (completing `verify`):** the `lint` stage was failing on a broken flat config — unresolvable `react-hooks`/`@next/next` plugins ("rule not found") plus ~10 real violations. Fixed by installing + registering `eslint-plugin-react-hooks@^7` and `@next/eslint-plugin-next@^16` in `eslint.config.mjs` (the two rules set to `warn` to avoid flooding legacy code), ignoring generated `apps/web/next-env.d.ts`, and fixing the code errors (`no-useless-assignment`, `no-control-regex` via `/\p{Control}/gu`, `preserve-caught-error` via `cause`, dead `buffer` assignment). **`pnpm verify` is now fully green** (lint + typecheck + build + 653 unit tests).

**Done when:** `pnpm verify` = fast feedback; `pnpm test:full` = all layers; stage failure aborts. → Command unification **DONE**; `pnpm verify` green (ESLint fixed).

---

## Phase 6 — Fix CI Pipeline

**Objective:** CI runs integration + coverage, not only `pnpm test`.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Test job runs unit + integration + coverage | ✅ | `test` (unit) + dedicated `integration` job (docker-compose.test.yml) + `coverage` job all in CI |
| 6.2 | Upload `coverage/`, `test-results/`, Playwright report on failure too | ✅ | `coverage-reports`, `test-results`, `integration-results`, `playwright-report` uploaded (`if: always()`) |
| 6.3 | Run migration + seed before integration/E2E | ✅ | Integration uses its own compose + `prisma:deploy`; e2e runs `db:deploy` + `db:seed` |
| 6.4 | Keep IDOR pack as independent security gate or fold into `pnpm e2e` | ✅ | Folded — `09-idor-regression.spec.ts` runs in `pnpm e2e`; removed redundant CI step |
| 6.5 | Require both test + E2E jobs in branch protection | ⚠️ | Repo/branch-protection setting, not a file change; apply manually |

Target graph:

```text
lint/typecheck
       ↓
     build
    ↙     ↘
unit+integration+coverage
          E2E
```

**Done when:** Branch protection requires both test jobs; integration visible in CI log; coverage threshold can fail CI; no critical suite local-only.

---

## Phase 7 — Stabilize Integration & E2E Environment

**Objective:** One documented command brings up services.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Provide Postgres + Redis via Docker Compose test profile | ✅ | `docker-compose.test.yml` (pg `:5434` / redis `:6380`, `lms_test`) |
| 7.2 | Health checks before migration/seed/test | ✅ | Compose `--wait` + service healthchecks |
| 7.3 | Explicit test env: `NODE_ENV=test`, test `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` | ✅ | `scripts/test-integration.mjs` sets `NODE_ENV=test`, dedicated URLs, JWT secrets |
| 7.4 | Ensure Docker daemon active before full suite | ✅ | `assertDocker()` before compose up |
| 7.5 | Clear error if services unavailable | ✅ | Explicit message + compose hint on failure |

**Done when:** Local setup via one command; no accidental dev/prod DB use; E2E from clean DB.

---

## Phase 8 — Expand E2E by Risk

**Objective:** Cover P0 security flows on real APIs.

| # | Scenario | Priority | Status | Notes |
|---|----------|----------|--------|-------|
| 8.1 | Payment `AWAITING_REVIEW` → `PAID` ownership | P0 | ✅ | `e2e/api/08-p0-security-flows.spec.ts` — owner confirm, attacker denied, instructor approve → PAID; also fixed `createOrder` to create PENDING payment + `approvePayment` returns updated row |
| 8.2 | Cross-tenant access for critical resources | P0 | ✅ | Covered by `e2e/api/09-idor-regression.spec.ts` (notes/bookmarks/goals/orders + forged org header) |
| 8.3 | File upload/download + access to other user's file | P0 | ✅ | `08-p0-security-flows` — instructor OWNER file; learner denied get/delete/signed-url (no `files:read`) |
| 8.4 | Realtime messaging smoke | P1 | ✅ | `e2e/api/08-p1-realtime-code-runner.spec.ts` — transports, channel scope, subscribe/publish/poll |
| 8.5 | AI disabled / failure mode | P2 | ✅ | Already covered by `e2e/api/08-ai-rag.spec.ts` |
| 8.6 | Judge0 failure/timeout path (no public provider) | P1 | ✅ | Mock execute + short `timeoutMs` busy-loop + auth gate + invalid language |
| 8.7 | Mobile viewport learner journey | P2 | ✅ | `e2e/ui/mobile-learner.spec.ts` + Playwright project `mobile-chrome` (Pixel 5) |

 Current E2E baseline: **26+ tests / 9 files** (added `08-p0-security-flows.spec.ts`). P0 8.1–8.3 verified green locally with Docker (postgres:55432, redis, minio).

 **Done when:** All P0 have positive + negative paths; tenant isolation tested on real API; mobile learner journey passes. → **Phase 8 complete** (8.1–8.7 green locally).

---

## Phase 9 — Quality Controls

**Objective:** Prevent regressions in test hygiene.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | `forbidOnly` in CI (Playwright already has it) | ✅ | Playwright `forbidOnly: Boolean(process.env.CI)`; Vitest now `forbidOnly: Boolean(process.env.CI)` in all 4 configs (api/web/shared/config) |
| 9.2 | Add Vitest check for `it.only`/`describe.only`/`test.only`/unapproved skip | ✅ | Enforced via `forbidOnly` in CI; no `.only` can leak to CI runs |
| 9.3 | Retry only for E2E, not unit/integration | ✅ | Vitest retries default 0; Playwright `retries: process.env.CI ? 2 : 0` |
| 9.4 | Track test durations to spot slow suites | ✅ | Vitest `slowTestThreshold: 1000` (all packages); Playwright `list` reporter + CI `github` reporter |
| 9.5 | Quarantined flaky tests need issue + deadline, not permanent skip | ✅ | `docs/testing-flaky-policy.md`; fixed sandbox spawn-error flake (wait for `close` listener) |

**Done when:** Unit/integration deterministic w/o retry; no focused tests leak to CI; flaky E2E visible/tracked.

---

## Phase 10 — Documentation

**Objective:** New dev can run full suite from clean checkout.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10.1 | README: prerequisites, fast command, full suite, coverage, troubleshooting | ✅ | Root `README.md` expanded |
| 10.2 | Explain unit vs integration vs API E2E vs UI E2E | ✅ | Layer table in README |
| 10.3 | Document Postgres/Redis startup + Chromium install | ✅ | Local setup + `playwright install chromium` |
| 10.4 | List estimated per-suite duration | ✅ | Duration table in README |

**Done when:** Local commands == CI commands; no hidden setup steps.

---

## Work Order

1. Phase 0 — Stabilize pnpm runner
2. Phase 1 — Fix 4 unit regressions
3. Phase 2 — Workspace dep build
4. Phase 3 — Integration in gate
5. Phase 7 — Services up (needed before 3/8)
6. Phase 4 — Coverage gate
7. Phase 6 — CI fixes
8. Phase 8 — P0 E2E
9. Phase 5 — Unify commands (finalize after others)
10. Phase 9 — Quality controls
11. Phase 10 — Docs

---

## Definition of Done

- [x] `pnpm verify` passes
- [x] `pnpm test:full` path wired (unit + integration + coverage + e2e); needs Docker + browsers for full local run
- [x] API/web/shared/config unit tests green
- [x] All integration tests green (15)
- [x] E2E baseline green (incl. P0/P1/P2 Phase 8 specs)
- [x] P0 security regression tests green
- [x] Coverage meets threshold + monitored in CI
- [x] Prisma migration + seed succeed
- [x] CI does not skip integration or coverage
- [x] No `only` in CI (`forbidOnly`); flaky policy documented
- [ ] Branch protection requires test + e2e jobs (manual repo setting — 6.5)
- [ ] Critical-module coverage ≥80% (4.9) — deferred product work, not a suite-gate leftover

---

## Current Snapshot (last run)

- Phases **0–10** complete for the testing full-suite plan (except 4.9/4.10 coverage growth and 6.5 branch protection).
- `pnpm verify` green; unit ~653 API tests; integration via `docker-compose.test.yml`; coverage thresholds in CI.
- E2E: P0 (`08-p0-security-flows`), P1 realtime/code-runner, P2 mobile + AI disabled; Playwright projects `api` / `chromium` / `mobile-chrome`.
- Docs: root `README.md` testing layers + troubleshooting; `docs/testing-flaky-policy.md`; this plan file.
- Leftover product debt (not suite plumbing): raise critical-module coverage (4.9), stepwise thresholds (4.10), branch protection UI (6.5).
