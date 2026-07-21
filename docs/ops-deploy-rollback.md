# Deploy & rollback

## Forward deploy

GitHub Actions **Deploy** workflow (manual `workflow_dispatch` or push to `main`):

1. Renders `docker/docker-compose.deploy.yml` with image tags  
   `ghcr.io/<owner>/lms-api:<tag>` and `lms-web:<tag>`
2. Copies compose + env to `/opt/lms`
3. `docker compose pull`
4. `pnpm db:deploy` (migrations only — never seed)
5. `up -d`
6. Health gate: `GET /api/v1/health/live` (up to ~60s)
7. Writes `.last_deploy_tag` and `.last_deploy_at` on the host

Default tag = short commit SHA of the workflow run.

## Rollback (image tag)

1. Open **Actions → Deploy → Run workflow**
2. Choose environment (`staging` / `production`)
3. Set **image_tag** to a previous known-good tag (from GHCR or host file `.last_deploy_tag`)
4. Enable **rollback** = true (skips migrations)
5. Run

Server-side auto-restore: if health gate fails and `docker-compose.deploy.prev.yml` exists, the script tries to re-up the previous compose file.

## Manual host rollback

```bash
cd /opt/lms
# Inspect last good tag
cat .last_deploy_tag

# Example: pin previous tag
export API_IMAGE=ghcr.io/ORG/lms-api:PREV_SHA
export WEB_IMAGE=ghcr.io/ORG/lms-web:PREV_SHA
export DEPLOY_ENV=production
envsubst < /path/to/repo/docker/docker-compose.deploy.yml > docker-compose.deploy.yml
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d --remove-orphans
```

Do **not** re-run seed. Only re-run migrations when rolling *forward* to a tag that needs new schema.

## Required secrets

- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (optional `DEPLOY_PORT`)
- Server env file `.env.staging` / `.env.production` with JWT, DB, Redis, S3, Judge0 if used
