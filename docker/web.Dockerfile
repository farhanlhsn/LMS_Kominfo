# ─────────────────────────────────────────────────────────────────────────────
# docker/web.Dockerfile — Next.js multi-stage build
# ─────────────────────────────────────────────────────────────────────────────

# ── Base ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# ── Install ───────────────────────────────────────────────────────────────
FROM base AS deps
RUN --mount=type=cache,id=pnpm-web,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# ── Build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
# M5: never bake demo quick-login / seed password into production images.
# Override only for intentional demo builds: --build-arg NEXT_PUBLIC_DEMO_LOGIN=true
ARG NEXT_PUBLIC_DEMO_LOGIN=false
ENV NEXT_PUBLIC_DEMO_LOGIN=$NEXT_PUBLIC_DEMO_LOGIN
RUN pnpm --filter @lms/shared --filter @lms/config build
RUN pnpm --filter @lms/web build

# ── Production ────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

RUN addgroup -S lms && adduser -S lms -G lms

COPY --from=builder --chown=lms:lms /app/apps/web/.next/standalone ./
COPY --from=builder --chown=lms:lms /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=lms:lms /app/apps/web/public ./apps/web/public

USER lms
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
