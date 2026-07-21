# ─────────────────────────────────────────────────────────────────────────────
# docker/api.Dockerfile — NestJS API multi-stage build
# ─────────────────────────────────────────────────────────────────────────────

# ── Base ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# ── Install (production-only, then prune dev) ─────────────────────────────
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false
# Generate Prisma client from workspace root so it lands in the hoisted
# root node_modules (which @lms/api resolves via @prisma/client at runtime).
RUN pnpm exec prisma generate --schema=./packages/db/prisma/schema.prisma
# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
RUN pnpm exec prisma generate --schema=./packages/db/prisma/schema.prisma
RUN pnpm --filter @lms/shared --filter @lms/config --filter @lms/db build
RUN pnpm --filter @lms/api build
RUN pnpm deploy --legacy --filter @lms/api /app/dist/api

# ── Production ────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

RUN addgroup -S lms && adduser -S lms -G lms

COPY --from=builder --chown=lms:lms /app/dist/api/node_modules ./node_modules
# pnpm deploy omits the generated Prisma client artifacts for transitive
# workspace deps in this repo setup. Overlay the builder store so the
# generated @prisma/client payload is present at runtime.
COPY --from=builder --chown=lms:lms /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder --chown=lms:lms /app/dist/api/dist ./dist
COPY --from=builder --chown=lms:lms /app/dist/api/package.json ./package.json
COPY --chown=lms:lms docker/api-entrypoint.sh ./api-entrypoint.sh

# Prisma schema is kept for operational tasks; generated client should already
# be included inside the deployed node_modules copied above.
COPY --from=builder --chown=lms:lms /app/packages/db/prisma ./prisma

USER lms
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

RUN chmod +x /app/api-entrypoint.sh

CMD ["sh", "/app/api-entrypoint.sh"]
