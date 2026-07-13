# TLS & backup (ops baseline)

## TLS

- Terminate TLS at reverse proxy / load balancer (nginx, cloud LB, Traefik).
- API and web containers may stay HTTP internally on a private network.
- Production API sets `Strict-Transport-Security` when `NODE_ENV=production`.
- Web sends CSP **Report-Only** via `Content-Security-Policy-Report-Only` (see `apps/web/next.config.ts`).
- Ensure `PUBLIC_APP_URL` / `CORS_ALLOWED_ORIGINS` use `https://` in production.
- Prefer ACME (Let's Encrypt) or managed certificates; renew before expiry.

## Database backups

1. **Daily logical dump** (example):

   ```bash
   pg_dump "$DATABASE_URL" -Fc -f "lms-$(date -u +%Y%m%d).dump"
   ```

2. Store dumps off-box (S3/MinIO with versioning + lifecycle).
3. Test restore monthly on a non-prod instance:

   ```bash
   pg_restore -d "$RESTORE_DATABASE_URL" --clean --if-exists lms-YYYYMMDD.dump
   ```

4. Keep at least 7 daily + 4 weekly copies (adjust to compliance needs).

## Object storage

- Enable bucket versioning for certificate PDFs and uploads.
- Lifecycle: expire incomplete multipart uploads; archive cold versions after N days.
- Access keys: rotate MinIO/S3 credentials; never commit them.

## Redis

- Redis is cache/queue/rate-limit/realtime — treat as **ephemeral**.
- No long-term backup required unless you store durable jobs; flush is acceptable on rebuild.

## Incident restore order

1. Restore Postgres from latest good dump  
2. Point `DATABASE_URL` at restored instance  
3. `pnpm db:deploy` (apply any missing migrations only)  
4. Redeploy API/web images (`docs/ops-deploy-rollback.md`)  
5. Verify `/api/v1/health` and login smoke  
