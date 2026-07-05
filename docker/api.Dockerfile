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
RUN pnpm --filter @lms/db prisma:generate

# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
RUN pnpm --filter @lms/api build
RUN pnpm deploy --filter @lms/api /app/dist/api

# ── Production ────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

RUN addgroup -S lms && adduser -S lms -G lms

COPY --from=builder --chown=lms:lms /app/dist/api/node_modules ./node_modules
COPY --from=builder --chown=lms:lms /app/dist/api ./dist
COPY --from=builder --chown=lms:lms /app/dist/api/package.json ./package.json

# Prisma client (needed at runtime)
COPY --from=builder --chown=lms:lms /app/packages/db/prisma ./prisma
COPY --from=builder --chown=lms:lms /app/packages/db/node_modules/.prisma ./node_modules/.prisma

USER lms
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
