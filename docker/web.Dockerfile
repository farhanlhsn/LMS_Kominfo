FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @lms/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@lms/web", "start"]
