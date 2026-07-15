# Production checklist (ops)

Required env:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (no defaults in prod)
- `ENTERPRISE_SECRET_KEY` (enterprise encryption; independent of JWT)
- `DATABASE_URL`, `REDIS_URL`
- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` / S3 credentials
- `PUBLIC_APP_URL`, `CORS_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_URL` (same-origin `/api/v1` behind gateway is fine)

Deploy:

1. `pnpm db:deploy` only — **never** `db:seed` in production
2. Health gate on `/api/v1/health/live` after compose up
3. Code runner: set `JUDGE0_BASE_URL` (+ optional `JUDGE0_API_KEY`); mock host spawn is blocked in production. Local: `docker compose --profile code-runner up -d`
4. Payment flow: user `confirm` → `AWAITING_REVIEW`; admin `approve` → `PAID` + enroll
5. Rate limits: Redis (`REDIS_URL`) shared across API instances; falls back to in-memory
6. Realtime: Redis pub/sub bus + Socket.IO Redis adapter when `REDIS_URL` set
7. IDOR pack: `pnpm exec playwright test e2e/api/09-idor-regression.spec.ts --project=api`
8. Metrics: `GET /api/v1/health/metrics` (private IP or `METRICS_TOKEN` header)
9. OpenAPI: `/api/v1/docs` + `/api/v1/docs-json` (Nest Swagger auto); legacy `/api/v1/openapi`
10. Rollback: Actions Deploy with `image_tag` + `rollback=true` (see `docs/ops-deploy-rollback.md`)
11. TLS/backups: `docs/ops-tls-backup.md`
12. Runbook index: `docs/ops-runbook-index.md`
